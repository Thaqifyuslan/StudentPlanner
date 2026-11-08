import * as DocumentPicker from 'expo-document-picker';
import { SymbolView } from 'expo-symbols';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

type MaterialItem = {
  id: string;
  name: string;
  uri: string;
  storagePath: string;
  type: 'image' | 'file';
  date: string;
};

type IconName = 'file' | 'share' | 'upload' | 'delete';

const iconNames = {
  file: { ios: 'doc.text', android: 'description', web: 'description' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  upload: { ios: 'icloud.and.arrow.up', android: 'cloud_upload', web: 'cloud_upload' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
} as const;

function MaterialIcon({
  name,
  color,
  size,
}: {
  name: IconName;
  color: string;
  size: number;
}) {
  return <SymbolView name={iconNames[name]} tintColor={color} size={size} />;
}

export default function RevisionScreen() {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadMaterials = async () => {
      if (!profile) return;
      try {
        const { data, error } = await supabase
          .from('revisions')
          .select('id,name,file_url,type,created_at')
          .eq('user_id', profile.id)
          .neq('file_url', '')
          .order('created_at', { ascending: false });
        if (error) throw error;

        const signedMaterials = await Promise.all(
          (data ?? []).map(async (item) => {
            const { data: signedUrl, error: signedUrlError } = await supabase.storage
              .from('revision-materials')
              .createSignedUrl(item.file_url, 60 * 30);
            if (signedUrlError) throw signedUrlError;
            return {
              id: item.id,
              name: item.name,
              uri: signedUrl.signedUrl,
              storagePath: item.file_url,
              type: item.type as MaterialItem['type'],
              date: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(
                new Date(item.created_at),
              ),
            };
          }),
        );
        if (active) setMaterials(signedMaterials);
      } catch (error) {
        console.error('Failed to load revision materials:', error);
        if (active) setMessage('Could not load revision materials. Check your Supabase connection.');
      }
    };

    void loadMaterials();
    const channel = profile
      ? supabase
          .channel(`revisions:${profile.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'revisions',
              filter: `user_id=eq.${profile.id}`,
            },
            () => void loadMaterials(),
          )
          .subscribe()
      : null;
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [profile]);

  const addMaterial = async (
    uri: string,
    name: string,
    mimeType?: string | null,
    file?: Blob,
  ) => {
    if (!profile) throw new Error('You must be signed in to upload materials.');
    const isImage =
      mimeType?.startsWith('image/') === true ||
      /\.(avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/i.test(name);
    const type: MaterialItem['type'] = isImage ? 'image' : 'file';
    let fileData: Blob | ArrayBuffer;
    if (Platform.OS === 'web' && file) {
      fileData = file;
    } else {
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Could not read the selected file (HTTP ${response.status}).`);
      fileData = await response.arrayBuffer();
    }
    const nameExtension = name.includes('.') ? name.split('.').pop()?.toLocaleLowerCase() : undefined;
    const mimeExtension = mimeType?.split('/')[1]?.split(';')[0]?.toLocaleLowerCase();
    const extension = nameExtension ?? mimeExtension;
    const safeExtension = extension && /^[a-z0-9]{1,8}$/.test(extension) ? extension : type;
    const storagePath = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExtension}`;
    const { error: uploadError } = await supabase.storage
      .from('revision-materials')
      .upload(storagePath, fileData, { contentType: mimeType ?? undefined, upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('revisions')
      .insert({
        user_id: profile.id,
        name,
        file_url: storagePath,
        type,
      })
      .select('id,created_at')
      .single();
    if (error) {
      const { error: cleanupError } = await supabase.storage
        .from('revision-materials')
        .remove([storagePath]);
      if (cleanupError) console.error('Failed to clean up the unsaved revision upload:', cleanupError);
      throw error;
    }

    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from('revision-materials')
      .createSignedUrl(storagePath, 60 * 30);
    if (signedUrlError) {
      const { error: recordCleanupError } = await supabase
        .from('revisions')
        .delete()
        .eq('id', data.id)
        .eq('user_id', profile.id);
      const { error: fileCleanupError } = await supabase.storage
        .from('revision-materials')
        .remove([storagePath]);
      if (recordCleanupError) console.error('Failed to clean up the revision record:', recordCleanupError);
      if (fileCleanupError) console.error('Failed to clean up the revision file:', fileCleanupError);
      throw signedUrlError;
    }

    const newItem: MaterialItem = {
      id: data.id,
      name,
      uri: signedUrl.signedUrl,
      storagePath,
      type,
      date: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(
        new Date(data.created_at),
      ),
    };
    setMaterials((currentMaterials) => [newItem, ...currentMaterials]);
    setMessage('Revision material uploaded successfully.');
  };

  const runPickerAction = async (action: () => Promise<void>) => {
    setMessage(null);
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      console.error('Failed to select revision material:', error);
      setMessage(
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : 'Upload failed. Please try again.',
      );
    } finally {
      setIsBusy(false);
    }
  };

  const pickUpload = () =>
    runPickerAction(async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', '*/*'],
        copyToCacheDirectory: true,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await addMaterial(asset.uri, asset.name, asset.mimeType, asset.file);
      }
    });

  const shareItem = async (item: MaterialItem) => {
    setMessage(null);
    setIsBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setMessage('Sharing is not supported on this device.');
        return;
      }
      const { data, error } = await supabase.storage
        .from('revision-materials')
        .createSignedUrl(item.storagePath, 60 * 30);
      if (error) throw error;
      await Share.share({
        message: `${item.name}\n${data.signedUrl}`,
        url: data.signedUrl,
        title: item.name,
      });
    } catch (error) {
      console.error('Failed to share revision material:', error);
      setMessage('Could not share the material. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const deleteItem = (item: MaterialItem) => {
    const removeMaterial = async () => {
      setIsBusy(true);
      setMessage(null);
      try {
        const { error } = await supabase
          .from('revisions')
          .delete()
          .eq('id', item.id)
          .eq('user_id', profile?.id ?? '');
        if (error) throw error;
        setMaterials((currentMaterials) =>
          currentMaterials.filter((material) => material.id !== item.id),
        );
        const { error: storageError } = await supabase.storage
          .from('revision-materials')
          .remove([item.storagePath]);
        if (storageError) {
          console.error('Revision material was deleted, but its cloud file could not be removed:', storageError);
          setMessage('The record was deleted, but its cloud file could not be removed.');
        } else {
          setMessage('Revision material deleted successfully.');
        }
      } catch (error) {
        console.error('Failed to delete revision material:', error);
        setMessage('Could not delete the revision material. Please try again.');
      } finally {
        setIsBusy(false);
      }
    };

    if (isBusy || !profile) return;
    const confirmDelete = () => {
      void removeMaterial();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${item.name}"?`)) {
        confirmDelete();
      }
      return;
    }

    Alert.alert('Delete material', `Are you sure you want to delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Revision Materials &amp; Notes</Text>
        <Text style={styles.subtitle}>Upload lecture notes, documents, or class photos.</Text>
      </View>

      <View style={styles.uploadOptions}>
        <UploadButton
          icon="upload"
          label="Upload"
          disabled={isBusy}
          onPress={() => void pickUpload()}
        />
      </View>

      {message !== null && (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      )}
      {isBusy && (
        <ActivityIndicator
          accessibilityLabel="Processing"
          color="#A5B4FC"
          style={styles.activityIndicator}
        />
      )}

      <FlatList
        data={materials}
        keyExtractor={(item) => item.id}
        contentContainerStyle={materials.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.type === 'image' ? (
              <Image source={{ uri: item.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.fileIconBox}>
                <MaterialIcon name="file" size={28} color="#A5B4FC" />
              </View>
            )}

            <View style={styles.cardInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.fileDate}>{item.date}</Text>
            </View>

            <Pressable
              accessibilityLabel={`Share ${item.name}`}
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => void shareItem(item)}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
              <MaterialIcon name="share" size={20} color="#A5B4FC" />
            </Pressable>
            <Pressable
              accessibilityLabel={`Delete ${item.name}`}
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => deleteItem(item)}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
              <MaterialIcon name="delete" size={20} color="#EF4444" />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcon name="upload" size={40} color="#6C7293" />
            <Text style={styles.emptyText}>No revision materials uploaded yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function UploadButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        (pressed || disabled) && styles.pressed,
      ]}>
      <MaterialIcon name={icon} size={20} color="#FFFFFF" />
      <Text style={styles.optionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 4, lineHeight: 18 },
  uploadOptions: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  optionButton: {
    minHeight: 46,
    backgroundColor: '#1E1E2E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  optionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  message: { color: '#A5B4FC', fontSize: 12, lineHeight: 18, paddingHorizontal: 20, paddingTop: 8 },
  activityIndicator: { marginTop: 8 },
  list: { padding: 20, paddingBottom: 112 },
  emptyList: { flexGrow: 1, padding: 20, paddingBottom: 112, justifyContent: 'center' },
  card: {
    backgroundColor: '#1E1E2E',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#2D2D44' },
  fileIconBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#2D2D44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, minWidth: 0, marginLeft: 12 },
  fileName: { fontSize: 14, color: '#FFFFFF', fontWeight: 'bold' },
  fileDate: { fontSize: 11, color: '#8D94B0', marginTop: 3 },
  shareButton: { padding: 10, marginLeft: 4 },
  deleteButton: { padding: 10, marginLeft: 2 },
  pressed: { opacity: 0.65 },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: '#8D94B0', marginTop: 10, fontSize: 13, textAlign: 'center' },
});

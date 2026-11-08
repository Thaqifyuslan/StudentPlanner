import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MaterialItem = {
  id: string;
  name: string;
  uri: string;
  type: 'image' | 'file';
  mimeType?: string;
  date: string;
};

type IconName = 'camera' | 'images' | 'file' | 'share' | 'upload';

const iconNames = {
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  images: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  file: { ios: 'doc.text', android: 'description', web: 'description' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  upload: { ios: 'icloud.and.arrow.up', android: 'cloud_upload', web: 'cloud_upload' },
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
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const addMaterial = (
    uri: string,
    type: MaterialItem['type'],
    name: string,
    mimeType?: string | null,
  ) => {
    const newItem: MaterialItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      uri,
      type,
      mimeType: mimeType ?? undefined,
      date: new Intl.DateTimeFormat('ms-MY', { dateStyle: 'medium' }).format(new Date()),
    };
    setMaterials((currentMaterials) => [newItem, ...currentMaterials]);
    setMessage('Bahan revision berjaya ditambah.');
  };

  const runPickerAction = async (action: () => Promise<void>) => {
    setMessage(null);
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      console.error('Gagal memilih bahan revision:', error);
      setMessage('Tidak dapat membuka pilihan bahan. Sila cuba lagi.');
    } finally {
      setIsBusy(false);
    }
  };

  const pickFromGallery = () =>
    runPickerAction(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addMaterial(asset.uri, 'image', asset.fileName ?? 'Gambar dari album', asset.mimeType);
      }
    });

  const takePhoto = () =>
    runPickerAction(async () => {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setMessage('Kebenaran kamera diperlukan untuk mengambil gambar nota.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addMaterial(asset.uri, 'image', asset.fileName ?? 'Gambar dari kamera', asset.mimeType);
      }
    });

  const pickDocument = () =>
    runPickerAction(async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addMaterial(asset.uri, 'file', asset.name, asset.mimeType);
      }
    });

  const shareItem = async (item: MaterialItem) => {
    setMessage(null);
    if (Platform.OS === 'web') {
      setMessage('Perkongsian fail setempat tidak disokong di web. Gunakan aplikasi mudah alih.');
      return;
    }

    setIsBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setMessage('Fungsi kongsi tidak disokong pada peranti ini.');
        return;
      }
      await Sharing.shareAsync(item.uri, {
        dialogTitle: `Kongsi ${item.name}`,
        mimeType: item.mimeType,
      });
    } catch (error) {
      console.error('Gagal berkongsi bahan revision:', error);
      setMessage('Bahan tidak dapat dikongsi. Sila cuba lagi.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Bahan Revision &amp; Nota</Text>
        <Text style={styles.subtitle}>Muat naik nota kuliah, dokumen atau gambar kelas.</Text>
      </View>

      <View style={styles.uploadOptions}>
        <UploadButton
          icon="camera"
          label="Kamera"
          disabled={isBusy}
          onPress={() => void takePhoto()}
        />
        <UploadButton
          icon="images"
          label="Album"
          disabled={isBusy}
          onPress={() => void pickFromGallery()}
        />
        <UploadButton
          icon="file"
          label="Fail"
          disabled={isBusy}
          onPress={() => void pickDocument()}
        />
      </View>

      {message !== null && (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      )}
      {isBusy && (
        <ActivityIndicator
          accessibilityLabel="Sedang memproses"
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
              accessibilityLabel={`Kongsi ${item.name}`}
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => void shareItem(item)}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
              <MaterialIcon name="share" size={20} color="#A5B4FC" />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcon name="upload" size={40} color="#6C7293" />
            <Text style={styles.emptyText}>Belum ada bahan revision yang dimuat naik.</Text>
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
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  optionButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: '#1E1E2E',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
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
  pressed: { opacity: 0.65 },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: '#8D94B0', marginTop: 10, fontSize: 13, textAlign: 'center' },
});

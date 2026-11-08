import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, type UserProfile } from '@/contexts/auth-context';

export default function ProfileScreen() {
  const { profile, signOut, updateProfile } = useAuth();
  const [draft, setDraft] = useState<
    Partial<Pick<UserProfile, 'nama' | 'noMatrik' | 'kursus' | 'semester' | 'kodFakulti' | 'avatarUri'>>
  >({});
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const pickAvatar = async () => {
    setError(null);
    setMessage(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setField('avatarUri', result.assets[0].uri);
      }
    } catch (pickerError) {
      console.error('Gagal memilih gambar profil:', pickerError);
      setError('Gambar profil tidak dapat dipilih. Sila cuba lagi.');
    }
  };

  const saveProfile = async () => {
    setError(null);
    setMessage(null);
    try {
      await updateProfile(draft);
      setDraft({});
      setIsEditing(false);
      setMessage('Maklumat profil berjaya dikemaskini.');
    } catch (saveError) {
      console.error('Gagal menyimpan profil:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Profil tidak dapat disimpan. Sila cuba lagi.');
    }
  };

  const cancelEditing = () => {
    setDraft({});
    setIsEditing(false);
    setError(null);
    setMessage(null);
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut();
    } catch (signOutError) {
      console.error('Gagal log keluar:', signOutError);
      setError('Tidak dapat log keluar. Sila cuba lagi.');
    }
  };

  const initials =
    profile?.initials ??
    profile?.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase())
      .join('') ??
    'P';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>AKAUN PELAJAR</Text>
        <Text style={styles.title}>Profil</Text>

        <View style={styles.profileCard}>
          <Pressable
            accessibilityRole={isEditing ? 'button' : undefined}
            accessibilityLabel="Pilih gambar profil dari album"
            disabled={!isEditing}
            onPress={() => void pickAvatar()}
            style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
            {(draft.avatarUri ?? profile?.avatarUri) ? (
              <Image
                source={{ uri: draft.avatarUri ?? profile?.avatarUri }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </Pressable>
          {isEditing && <Text style={styles.avatarHint}>Tekan gambar untuk tukar dari album</Text>}
          <Text style={styles.name}>{profile?.nama ?? profile?.name ?? 'Pelajar'}</Text>
          <Text style={styles.email}>{profile?.email ?? 'E-mel tidak tersedia'}</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Maklumat Akademik</Text>
          <ProfileField
            label="Nama penuh"
            value={draft.nama ?? profile?.nama ?? profile?.name ?? ''}
            editable={isEditing}
            onChangeText={(value) => setField('nama', value)}
          />
          <ProfileField
            label="No. Matrik"
            value={draft.noMatrik ?? profile?.noMatrik ?? ''}
            editable={isEditing}
            onChangeText={(value) => setField('noMatrik', value)}
          />
          <ProfileField
            label="Program / Kursus"
            value={draft.kursus ?? profile?.kursus ?? ''}
            editable={isEditing}
            onChangeText={(value) => setField('kursus', value)}
          />
          <ProfileField
            label="Semester"
            value={draft.semester ?? profile?.semester ?? ''}
            editable={isEditing}
            keyboardType="numeric"
            onChangeText={(value) => setField('semester', value)}
          />
          <ProfileField
            label="Kod Fakulti / Jabatan"
            value={draft.kodFakulti ?? profile?.kodFakulti ?? ''}
            editable={isEditing}
            onChangeText={(value) => setField('kodFakulti', value)}
          />
        </View>

        <Text style={styles.disclaimer}>
          Profil ini disimpan secara setempat pada peranti sebagai akaun demo.
        </Text>

        {error !== null && <Text style={styles.error}>{error}</Text>}
        {message !== null && <Text style={styles.success}>{message}</Text>}

        {isEditing ? (
          <View style={styles.editActions}>
            <Pressable
              accessibilityRole="button"
              onPress={cancelEditing}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void saveProfile()}
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
              <Text style={styles.saveText}>Simpan Perubahan</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMessage(null);
              setIsEditing(true);
            }}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
            <Text style={styles.editButtonText}>Edit Maklumat Akademik</Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
          <Text style={styles.signOutText}>Log keluar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileField({
  label,
  value,
  editable,
  keyboardType,
  onChangeText,
}: {
  label: string;
  value: string;
  editable: boolean;
  keyboardType?: 'default' | 'numeric';
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      {editable ? (
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="words"
          keyboardType={keyboardType ?? 'default'}
          onChangeText={onChangeText}
          placeholder={`${label} belum diisi`}
          placeholderTextColor="#737B98"
          style={styles.input}
          value={value}
        />
      ) : (
        <Text style={styles.detailValue}>{value.trim() || 'Belum diisi'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C14' },
  content: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20 },
  eyebrow: { color: '#A5B4FC', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#F1F3F9', fontSize: 28, fontWeight: '700', marginTop: 6, marginBottom: 20 },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#141724',
    borderWidth: 1,
    borderColor: '#232738',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    marginBottom: 12,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  avatarHint: { color: '#A5B4FC', fontSize: 12, marginBottom: 10 },
  name: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  email: { color: '#9CA3AF', fontSize: 14, marginTop: 5, textAlign: 'center' },
  detailsCard: {
    paddingHorizontal: 18,
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#141724',
    borderWidth: 1,
    borderColor: '#232738',
  },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', paddingTop: 18, paddingBottom: 4 },
  detailRow: {
    minHeight: 58,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#30364B',
  },
  detailLabel: { color: '#8D94B0', fontSize: 12, marginBottom: 4 },
  detailValue: { color: '#F1F3F9', fontSize: 14, fontWeight: '500' },
  input: {
    minHeight: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#30364B',
    backgroundColor: '#0F1220',
    paddingHorizontal: 12,
    color: '#F1F3F9',
    fontSize: 14,
  },
  disclaimer: { color: '#737B98', fontSize: 12, lineHeight: 18, marginTop: 16 },
  error: { color: '#FF7675', fontSize: 13, marginTop: 14 },
  success: { color: '#34D399', fontSize: 13, marginTop: 14 },
  editButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#6C5CE7',
    marginTop: 18,
  },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#454B64',
  },
  cancelText: { color: '#C4C9DA', fontSize: 14, fontWeight: '700' },
  saveButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  signOutButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF7675',
    marginTop: 18,
    marginBottom: 32,
  },
  signOutText: { color: '#FF8888', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});

import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Image,
  Modal,
  Platform,
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
      & { avatarMimeType?: string }
  >({});
  const [isEditing, setIsEditing] = useState(false);
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const [cropAsset, setCropAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const pickAvatar = async () => {
    if (isPickingAvatar) return;
    setError(null);
    setMessage(null);
    setIsPickingAvatar(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS !== 'web',
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (Platform.OS === 'web') {
          setCropAsset(asset);
          setCropZoom(1);
          setCropOffset({ x: 0, y: 0 });
          return;
        }
        if (isEditing) {
          setDraft((current) => ({
            ...current,
            avatarUri: asset.uri,
            avatarMimeType: asset.mimeType ?? undefined,
          }));
          setMessage('Image selected. Tap Save Changes to apply it.');
        } else {
          await updateProfile({
            avatarUri: asset.uri,
            avatarMimeType: asset.mimeType ?? undefined,
          });
          setMessage('Profile picture updated successfully.');
        }
      }
    } catch (pickerError) {
      console.error('Failed to select profile picture:', pickerError);
      setError(pickerError instanceof Error ? pickerError.message : 'Could not update profile picture. Please try again.');
    } finally {
      setIsPickingAvatar(false);
    }
  };

  const applyAvatarCrop = async () => {
    if (!cropAsset || isPickingAvatar) return;
    setError(null);
    setMessage(null);
    setIsPickingAvatar(true);
    try {
      const avatarUri = await cropImageForAvatar(cropAsset, cropZoom, cropOffset);
      if (isEditing) {
        setDraft((current) => ({ ...current, avatarUri, avatarMimeType: 'image/jpeg' }));
        setMessage('Image selected. Tap Save Changes to apply it.');
      } else {
        await updateProfile({ avatarUri, avatarMimeType: 'image/jpeg' });
        setMessage('Profile picture updated successfully.');
      }
      setCropAsset(null);
    } catch (cropError) {
      console.error('Failed to crop profile picture:', cropError);
      setError(cropError instanceof Error ? cropError.message : 'Could not crop the image. Please try again.');
    } finally {
      setIsPickingAvatar(false);
    }
  };

  const moveCrop = (x: number, y: number) => {
    if (!cropAsset) return;
    const dimensions = getCropDimensions(cropAsset.width, cropAsset.height, cropZoom);
    setCropOffset((current) => ({
      x: clamp(current.x + x, -(dimensions.width - CROP_SIZE) / 2, (dimensions.width - CROP_SIZE) / 2),
      y: clamp(current.y + y, -(dimensions.height - CROP_SIZE) / 2, (dimensions.height - CROP_SIZE) / 2),
    }));
  };

  const adjustCropZoom = (change: number) => {
    if (!cropAsset) return;
    const zoom = clamp(Number((cropZoom + change).toFixed(1)), 1, 3);
    const dimensions = getCropDimensions(cropAsset.width, cropAsset.height, zoom);
    setCropZoom(zoom);
    setCropOffset((current) => ({
      x: clamp(current.x, -(dimensions.width - CROP_SIZE) / 2, (dimensions.width - CROP_SIZE) / 2),
      y: clamp(current.y, -(dimensions.height - CROP_SIZE) / 2, (dimensions.height - CROP_SIZE) / 2),
    }));
  };

  const closeCrop = () => {
    setCropAsset(null);
    setError(null);
  };

  const saveProfile = async () => {
    setError(null);
    setMessage(null);
    try {
      await updateProfile(draft);
      setDraft({});
      setIsEditing(false);
      setMessage('Profile updated successfully.');
    } catch (saveError) {
      console.error('Failed to save profile:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Could not save profile. Please try again.');
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
      console.error('Failed to sign out:', signOutError);
      setError('Could not sign out. Please try again.');
    }
  };

  const initials =
    profile?.initials ??
    profile?.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase())
      .join('') ??
    'S';
  const cropDimensions = cropAsset && cropAsset.width > 0 && cropAsset.height > 0
    ? getCropDimensions(cropAsset.width, cropAsset.height, cropZoom)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>STUDENT ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {(draft.avatarUri ?? profile?.avatarUri) ? (
              <Image
                source={{ uri: draft.avatarUri ?? profile?.avatarUri }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a profile picture from your gallery or files"
            disabled={isPickingAvatar}
            onPress={() => void pickAvatar()}
            style={({ pressed }) => [
              styles.avatarButton,
              (pressed || isPickingAvatar) && styles.pressed,
            ]}>
            <Text style={styles.avatarButtonText}>
              {isPickingAvatar ? 'Working…' : 'Choose image from gallery / files'}
            </Text>
          </Pressable>
          <Text style={styles.avatarHint}>
            {isEditing
              ? 'The image will be saved with your profile changes.'
              : 'Choose an image from your photo library or device files.'}
          </Text>
          <Text style={styles.name}>{profile?.nama ?? profile?.name ?? 'Student'}</Text>
          <Text style={styles.email}>{profile?.email ?? 'Email unavailable'}</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Academic Information</Text>
          <ProfileField
            label="Full name"
            value={draft.nama ?? profile?.nama ?? profile?.name ?? ''}
            editable={isEditing}
            onChangeText={(value) => setField('nama', value)}
          />
          <ProfileField
            label="Student ID"
            value={draft.noMatrik ?? profile?.noMatrik ?? ''}
            editable={isEditing}
            onChangeText={(value) => setField('noMatrik', value)}
          />
          <ProfileField
            label="Program / Course"
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
            label="Faculty / Department Code"
            value={draft.kodFakulti ?? profile?.kodFakulti ?? ''}
            editable={isEditing}
            onChangeText={(value) => setField('kodFakulti', value)}
          />
        </View>

        {error !== null && <Text style={styles.error}>{error}</Text>}
        {message !== null && <Text style={styles.success}>{message}</Text>}

        {isEditing ? (
          <View style={styles.editActions}>
            <Pressable
              accessibilityRole="button"
              onPress={cancelEditing}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void saveProfile()}
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
              <Text style={styles.saveText}>Save Changes</Text>
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
            <Text style={styles.editButtonText}>Edit Academic Information</Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
      <Modal
        animationType="fade"
        onRequestClose={closeCrop}
        transparent
        visible={cropAsset !== null}>
        <View style={styles.cropBackdrop}>
          <View style={styles.cropCard}>
            <Text style={styles.cropTitle}>Fit image to profile circle</Text>
            <Text style={styles.cropHint}>Zoom in or out, then adjust the image position.</Text>
            {cropAsset !== null && cropDimensions !== null && (
              <View style={styles.cropCircle}>
                <Image
                  source={{ uri: cropAsset.uri }}
                  resizeMode="stretch"
                  style={[
                    styles.cropImage,
                    {
                      ...cropDimensions,
                      left: (CROP_SIZE - cropDimensions.width) / 2 + cropOffset.x,
                      top: (CROP_SIZE - cropDimensions.height) / 2 + cropOffset.y,
                    },
                  ]}
                />
              </View>
            )}
            <View style={styles.cropControls}>
              <View style={styles.zoomControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Zoom out"
                  disabled={cropZoom <= 1}
                  onPress={() => adjustCropZoom(-0.2)}
                  style={({ pressed }) => [styles.cropControlButton, pressed && styles.pressed]}>
                  <Text style={styles.cropControlText}>−</Text>
                </Pressable>
                <Text style={styles.zoomLabel}>{Math.round(cropZoom * 100)}%</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Zoom in"
                  disabled={cropZoom >= 3}
                  onPress={() => adjustCropZoom(0.2)}
                  style={({ pressed }) => [styles.cropControlButton, pressed && styles.pressed]}>
                  <Text style={styles.cropControlText}>+</Text>
                </Pressable>
              </View>
              <View style={styles.positionControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move image up"
                  onPress={() => moveCrop(0, -CROP_MOVE_STEP)}
                  style={({ pressed }) => [styles.cropControlButton, pressed && styles.pressed]}>
                  <Text style={styles.cropControlText}>↑</Text>
                </Pressable>
                <View style={styles.positionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Move image left"
                    onPress={() => moveCrop(-CROP_MOVE_STEP, 0)}
                    style={({ pressed }) => [styles.cropControlButton, pressed && styles.pressed]}>
                    <Text style={styles.cropControlText}>←</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Move image right"
                    onPress={() => moveCrop(CROP_MOVE_STEP, 0)}
                    style={({ pressed }) => [styles.cropControlButton, pressed && styles.pressed]}>
                    <Text style={styles.cropControlText}>→</Text>
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move image down"
                  onPress={() => moveCrop(0, CROP_MOVE_STEP)}
                  style={({ pressed }) => [styles.cropControlButton, pressed && styles.pressed]}>
                  <Text style={styles.cropControlText}>↓</Text>
                </Pressable>
              </View>
            </View>
            {error !== null && <Text style={styles.cropError}>{error}</Text>}
            <View style={styles.cropActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isPickingAvatar}
                onPress={closeCrop}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isPickingAvatar}
                onPress={() => void applyAvatarCrop()}
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
                <Text style={styles.saveText}>{isPickingAvatar ? 'Saving…' : 'Use Photo'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CROP_SIZE = 220;
const CROP_MOVE_STEP = 16;

function getCropDimensions(width: number, height: number, zoom: number) {
  const scale = (CROP_SIZE * zoom) / Math.min(width, height);
  return { width: width * scale, height: height * scale };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function cropImageForAvatar(
  asset: ImagePicker.ImagePickerAsset,
  zoom: number,
  offset: { x: number; y: number },
) {
  if (asset.width <= 0 || asset.height <= 0) {
    throw new Error('Could not read the selected image dimensions.');
  }

  const image = new globalThis.Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not load the selected image.'));
    image.src = asset.uri;
  });

  const dimensions = getCropDimensions(image.naturalWidth, image.naturalHeight, zoom);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare the image crop.');

  const outputScale = canvas.width / CROP_SIZE;
  context.drawImage(
    image,
    ((CROP_SIZE - dimensions.width) / 2 + offset.x) * outputScale,
    ((CROP_SIZE - dimensions.height) / 2 + offset.y) * outputScale,
    dimensions.width * outputScale,
    dimensions.height * outputScale,
  );
  return canvas.toDataURL('image/jpeg', 0.9);
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
          placeholder={`${label} not provided`}
          placeholderTextColor="#737B98"
          style={styles.input}
          value={value}
        />
      ) : (
        <Text style={styles.detailValue}>{value.trim() || 'Not provided'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C14' },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 132,
  },
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
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    marginBottom: 12,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 34 },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  avatarButton: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#252A3D',
    marginBottom: 8,
  },
  avatarButtonText: { color: '#C4B5FD', fontSize: 12, fontWeight: '700' },
  avatarHint: { color: '#8D94B0', fontSize: 11, marginBottom: 10, textAlign: 'center' },
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
  cropBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  cropCard: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    padding: 22,
    borderRadius: 20,
    backgroundColor: '#141724',
    borderWidth: 1,
    borderColor: '#30364B',
  },
  cropTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  cropHint: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  cropError: { color: '#FF7675', fontSize: 13, marginTop: 14, textAlign: 'center' },
  cropCircle: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#252A3D',
  },
  cropImage: { position: 'absolute' },
  cropControls: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    marginTop: 18,
  },
  zoomControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoomLabel: { minWidth: 48, color: '#F1F3F9', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  cropControlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#252A3D',
  },
  cropControlText: { color: '#F1F3F9', fontSize: 20, fontWeight: '600' },
  positionControls: { alignItems: 'center', gap: 4 },
  positionRow: { flexDirection: 'row', gap: 28 },
  cropActions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 20 },
  pressed: { opacity: 0.7 },
});

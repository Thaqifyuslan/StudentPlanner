import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';

type ProfileDetailProps = {
  label: string;
  value?: string;
};

function ProfileDetail({ label, value }: ProfileDetailProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value?.trim() || 'Belum diisi'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.nama ?? profile?.name ?? 'Pelajar'}</Text>
          <Text style={styles.email}>{profile?.email ?? 'E-mel tidak tersedia'}</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Maklumat Akademik</Text>
          <ProfileDetail label="No. Matrik" value={profile?.noMatrik} />
          <ProfileDetail label="Program / Kursus" value={profile?.kursus} />
          <ProfileDetail
            label="Semester"
            value={profile?.semester ? `Semester ${profile.semester}` : undefined}
          />
          <ProfileDetail label="Kod Fakulti / Jabatan" value={profile?.kodFakulti} />
        </View>

        <Text style={styles.disclaimer}>
          Profil ini disimpan secara setempat pada peranti sebagai akaun demo.
        </Text>

        {error !== null && <Text style={styles.error}>{error}</Text>}

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
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
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
  disclaimer: { color: '#737B98', fontSize: 12, lineHeight: 18, marginTop: 16 },
  error: { color: '#FF7675', fontSize: 13, marginTop: 14 },
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

import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [noMatrik, setNoMatrik] = useState('');
  const [kursus, setKursus] = useState('');
  const [semester, setSemester] = useState('');
  const [kodFakulti, setKodFakulti] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    const normalizedEmail = email.trim();
    if (!nama.trim() || !noMatrik.trim() || !kursus.trim() || !semester.trim()) {
      setError('Sila isi nama, e-mel, nombor matrik, kursus dan semester.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Masukkan alamat e-mel yang sah untuk log masuk demo.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await register({ nama, email: normalizedEmail, noMatrik, kursus, semester, kodFakulti });
    } catch (registrationError) {
      console.error('Pendaftaran pelajar gagal:', registrationError);
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : 'Pendaftaran tidak berjaya. Sila cuba lagi.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.eyebrow}>STUDENT PLANNER</Text>
            <Text style={styles.title}>Daftar Akaun Pelajar</Text>
            <Text style={styles.subtitle}>
              Masukkan maklumat akademik untuk profil Campus Student Planner.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nama Penuh Pelajar</Text>
              <TextInput
                accessibilityLabel="Nama penuh pelajar"
                autoCapitalize="words"
                autoComplete="name"
                editable={!isSubmitting}
                onChangeText={setNama}
                placeholder="Contoh: Ahmad Albab"
                placeholderTextColor="#6C7293"
                returnKeyType="next"
                style={styles.input}
                value={nama}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>E-mel untuk Log Masuk Demo</Text>
              <TextInput
                accessibilityLabel="E-mel"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isSubmitting}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="nama@contoh.com"
                placeholderTextColor="#6C7293"
                returnKeyType="next"
                style={styles.input}
                value={email}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>No. Matrik</Text>
              <TextInput
                accessibilityLabel="Nombor matrik"
                autoCapitalize="characters"
                editable={!isSubmitting}
                onChangeText={setNoMatrik}
                placeholder="Contoh: B032210001"
                placeholderTextColor="#6C7293"
                returnKeyType="next"
                style={styles.input}
                value={noMatrik}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Program / Kursus</Text>
              <TextInput
                accessibilityLabel="Program atau kursus"
                autoCapitalize="words"
                editable={!isSubmitting}
                onChangeText={setKursus}
                placeholder="Contoh: Diploma Sains Komputer"
                placeholderTextColor="#6C7293"
                returnKeyType="next"
                style={styles.input}
                value={kursus}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.rowField]}>
                <Text style={styles.label}>Semester</Text>
                <TextInput
                  accessibilityLabel="Semester"
                  editable={!isSubmitting}
                  keyboardType="numeric"
                  onChangeText={setSemester}
                  placeholder="Contoh: 4"
                  placeholderTextColor="#6C7293"
                  returnKeyType="next"
                  style={styles.input}
                  value={semester}
                />
              </View>
              <View style={[styles.formGroup, styles.rowField]}>
                <Text style={styles.label}>Kod Fakulti / Jabatan</Text>
                <TextInput
                  accessibilityLabel="Kod fakulti atau jabatan"
                  autoCapitalize="characters"
                  editable={!isSubmitting}
                  onChangeText={setKodFakulti}
                  placeholder="Contoh: FPK"
                  placeholderTextColor="#6C7293"
                  returnKeyType="done"
                  style={styles.input}
                  value={kodFakulti}
                />
              </View>
            </View>

            {error !== null && <Text style={styles.error}>{error}</Text>}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => void handleRegister()}
              style={({ pressed }) => [
                styles.button,
                (pressed || isSubmitting) && styles.buttonMuted,
              ]}>
              <Text style={styles.buttonText}>
                {isSubmitting ? 'Menyimpan…' : 'Simpan & Masuk Portal'}
              </Text>
            </Pressable>

            <Text style={styles.loginPrompt}>
              Sudah berdaftar? <Link href="/(auth)/login" style={styles.link}>Log masuk</Link>
            </Text>
          </View>
          <Text style={styles.disclaimer}>
            Akaun demo disimpan pada peranti ini sahaja. Jangan gunakan untuk melindungi data
            sensitif.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#141724',
    borderWidth: 1,
    borderColor: '#232738',
  },
  eyebrow: { fontSize: 11, color: '#A5B4FC', fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginTop: 8, marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 19, color: '#9CA3AF', marginBottom: 22 },
  formGroup: { flex: 1, marginBottom: 14 },
  label: { fontSize: 12, color: '#A5B4FC', fontWeight: '600', marginBottom: 6 },
  input: {
    minHeight: 48,
    backgroundColor: '#1E1E2E',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#FFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  row: { flexDirection: 'row', gap: 12 },
  rowField: { minWidth: 0 },
  error: { color: '#FF7675', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  button: {
    minHeight: 50,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonMuted: { opacity: 0.7 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  loginPrompt: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 18 },
  link: { color: '#A5B4FC', fontWeight: '700' },
  disclaimer: {
    maxWidth: 520,
    alignSelf: 'center',
    color: '#737B98',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 14,
  },
});

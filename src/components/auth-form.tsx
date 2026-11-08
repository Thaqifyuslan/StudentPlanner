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

type AuthFormProps = {
  mode: 'login' | 'register';
  onSubmit: (name: string, email: string) => Promise<void>;
};

export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === 'register';

  const submit = async () => {
    const normalizedEmail = email.trim();
    if ((isRegister && !name.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(isRegister ? 'Masukkan nama dan e-mel yang sah.' : 'Masukkan e-mel yang sah.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(name, normalizedEmail);
    } catch (submitError) {
      console.error('Tindakan akaun demo gagal:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Tindakan tidak berjaya. Sila cuba lagi.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.eyebrow}>STUDENT PLANNER</Text>
            <Text style={styles.title}>{isRegister ? 'Cipta akaun demo' : 'Selamat kembali'}</Text>
            <Text style={styles.description}>
              {isRegister
                ? 'Simpan profil demo secara setempat pada peranti ini.'
                : 'Log masuk ke akaun demo yang disimpan pada peranti ini.'}
            </Text>

            {isRegister && (
              <TextInput
                accessibilityLabel="Nama"
                autoCapitalize="words"
                autoComplete="name"
                editable={!isSubmitting}
                onChangeText={setName}
                placeholder="Nama"
                placeholderTextColor="#7E85A3"
                returnKeyType="next"
                style={styles.input}
                value={name}
              />
            )}

            <TextInput
              accessibilityLabel="E-mel"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isSubmitting}
              keyboardType="email-address"
              onChangeText={setEmail}
              onSubmitEditing={() => void submit()}
              placeholder="E-mel"
              placeholderTextColor="#7E85A3"
              returnKeyType="done"
              style={styles.input}
              value={email}
            />

            {error !== null && <Text style={styles.error}>{error}</Text>}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.submitButton,
                (pressed || isSubmitting) && styles.buttonMuted,
              ]}>
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Sila tunggu…' : isRegister ? 'Daftar' : 'Log masuk'}
              </Text>
            </Pressable>

            <Text style={styles.switchPrompt}>
              {isRegister ? 'Sudah ada akaun? ' : 'Belum ada akaun? '}
              <Link
                href={isRegister ? '/(auth)/login' : '/(auth)/register'}
                style={styles.link}>
                {isRegister ? 'Log masuk' : 'Daftar'}
              </Link>
            </Text>
          </View>

          <Text style={styles.disclaimer}>
            Demo setempat sahaja. Tiada kata laluan atau pengesahan pelayan; jangan gunakan untuk
            melindungi data sensitif.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0C14',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#141724',
    borderWidth: 1,
    borderColor: '#232738',
  },
  eyebrow: {
    color: '#6C5CE7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: '#F1F3F9',
    fontSize: 26,
    fontWeight: '700',
    marginTop: 10,
  },
  description: {
    color: '#A0A5BD',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30364B',
    backgroundColor: '#0A0C14',
    color: '#FFFFFF',
    fontSize: 16,
  },
  error: {
    color: '#FF7675',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  submitButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#6C5CE7',
  },
  buttonMuted: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  switchPrompt: {
    color: '#A0A5BD',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  link: {
    color: '#A5B4FC',
    fontWeight: '700',
  },
  disclaimer: {
    maxWidth: 440,
    alignSelf: 'center',
    color: '#7E85A3',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 16,
  },
});

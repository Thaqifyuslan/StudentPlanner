import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  ActivityIndicator,
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

type AuthFormProps = {
  initialMode: 'login' | 'register';
};

const eyeSymbols = {
  visible: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  hidden: { ios: 'eye', android: 'visibility', web: 'visibility' },
} as const;

export function AuthForm({ initialMode }: AuthFormProps) {
  const router = useRouter();
  const { signIn, register } = useAuth();
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [noMatrik, setNoMatrik] = useState('');
  const [kursus, setKursus] = useState('');
  const [semester, setSemester] = useState('');
  const [kodFakulti, setKodFakulti] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleAuth = async () => {
    const normalizedEmail = email.trim().toLocaleLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !password) {
      setError('Enter a valid email address and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (isRegister && (!nama.trim() || !noMatrik.trim() || !kursus.trim() || !semester.trim())) {
      setError('Please complete your name, student ID, course, and semester.');
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      if (isRegister) {
        const result = await register({
          nama,
          email: normalizedEmail,
          password,
          noMatrik,
          kursus,
          semester,
          kodFakulti,
        });
        if (result.requiresEmailConfirmation) {
          setNotice('Account created. Verify your email address before signing in.');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        await signIn(normalizedEmail, password);
        router.replace('/(tabs)');
      }
    } catch (authError) {
      console.error(isRegister ? 'Supabase sign-up failed:' : 'Supabase sign-in failed:', authError);
      setError(authError instanceof Error ? authError.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsRegister((current) => !current);
    setError(null);
    setNotice(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.header}>
              <SymbolView
                name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }}
                tintColor="#8B5CF6"
                size={44}
              />
              <Text style={styles.title}>
                {isRegister ? 'Create a Secure Account' : 'Student Sign In'}
              </Text>
              <Text style={styles.subtitle}>
                {isRegister
                  ? 'Create an account to securely save your academic data.'
                  : 'Sign in to access your schedule and tasks.'}
              </Text>
            </View>

            <Text style={styles.label}>Student Email</Text>
            <TextInput
              accessibilityLabel="Student email"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isSubmitting}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="student@example.edu"
              placeholderTextColor="#6C7293"
              returnKeyType="next"
              style={styles.input}
              value={email}
            />

            <Text style={styles.label}>Password (at least 8 characters)</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                editable={!isSubmitting}
                onChangeText={setPassword}
                onSubmitEditing={() => void handleAuth()}
                placeholder="Password"
                placeholderTextColor="#6C7293"
                returnKeyType="done"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                value={password}
              />
              <Pressable
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
                onPress={() => setShowPassword((visible) => !visible)}
                style={styles.eyeButton}>
                <SymbolView
                  name={showPassword ? eyeSymbols.visible : eyeSymbols.hidden}
                  tintColor="#9CA3AF"
                  size={20}
                />
              </Pressable>
            </View>

            {isRegister && (
              <>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  accessibilityLabel="Full name"
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!isSubmitting}
                  onChangeText={setNama}
                  placeholder="Full name"
                  placeholderTextColor="#6C7293"
                  style={styles.input}
                  value={nama}
                />
                <View style={styles.row}>
                  <View style={styles.rowField}>
                    <Text style={styles.label}>Student ID</Text>
                    <TextInput
                      accessibilityLabel="Student ID"
                      autoCapitalize="characters"
                      editable={!isSubmitting}
                      onChangeText={setNoMatrik}
                      placeholder="B032210001"
                      placeholderTextColor="#6C7293"
                      style={styles.input}
                      value={noMatrik}
                    />
                  </View>
                  <View style={styles.rowField}>
                    <Text style={styles.label}>Semester</Text>
                    <TextInput
                      accessibilityLabel="Semester"
                      editable={!isSubmitting}
                      keyboardType="numeric"
                      onChangeText={setSemester}
                      placeholder="1 - 8"
                      placeholderTextColor="#6C7293"
                      style={styles.input}
                      value={semester}
                    />
                  </View>
                </View>
                <Text style={styles.label}>Course / Program</Text>
                <TextInput
                  accessibilityLabel="Course or program"
                  autoCapitalize="words"
                  editable={!isSubmitting}
                  onChangeText={setKursus}
                  placeholder="Diploma in Computer Science"
                  placeholderTextColor="#6C7293"
                  style={styles.input}
                  value={kursus}
                />
                <Text style={styles.label}>Faculty / Department Code (optional)</Text>
                <TextInput
                  accessibilityLabel="Faculty or department code"
                  autoCapitalize="characters"
                  editable={!isSubmitting}
                  onChangeText={setKodFakulti}
                  placeholder="Example: FPK"
                  placeholderTextColor="#6C7293"
                  style={styles.input}
                  value={kodFakulti}
                />
              </>
            )}

            {error !== null && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
            {notice !== null && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => void handleAuth()}
              style={({ pressed }) => [styles.submitButton, (pressed || isSubmitting) && styles.muted]}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isRegister ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={switchMode}
              style={styles.switchButton}>
              <Text style={styles.switchText}>
                {isRegister ? 'Already have an account? Sign in' : 'New here? Create an account'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F0F1A' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#1E1E2E',
  },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { color: '#FFFFFF', fontSize: 23, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  subtitle: { color: '#9CA3AF', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  label: { color: '#A5B4FC', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    minHeight: 48,
    backgroundColor: '#0F0F1A',
    borderRadius: 10,
    paddingHorizontal: 13,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2D2D44',
    marginBottom: 13,
  },
  passwordWrapper: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2D44',
    marginBottom: 13,
  },
  passwordInput: { flex: 1, minWidth: 0, minHeight: 46, paddingHorizontal: 13, color: '#FFFFFF', fontSize: 14 },
  eyeButton: { minWidth: 46, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  rowField: { flex: 1, minWidth: 0 },
  error: { color: '#FF7675', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  notice: { color: '#34D399', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  submitButton: {
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    marginTop: 6,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  switchButton: { alignItems: 'center', paddingVertical: 16 },
  switchText: { color: '#A5B4FC', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  muted: { opacity: 0.7 },
});

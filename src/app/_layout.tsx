import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/contexts/auth-context';

SplashScreen.preventAutoHideAsync();

function AppNavigator() {
  const { profile, isLoading, initializationError, clearLocalSession } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || initializationError) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!profile && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (profile && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [initializationError, isLoading, profile, router, segments]);

  if (isLoading) return <View style={styles.stateContainer} />;

  if (initializationError) {
    const handleReturnToLogin = async () => {
      setRecoveryError(null);
      try {
        await clearLocalSession();
        router.replace('/(auth)/login');
      } catch (error) {
        console.error('Gagal membersihkan sesi setempat:', error);
        setRecoveryError(
          error instanceof Error ? error.message : 'Sesi tidak dapat dibersihkan. Cuba muat semula halaman.',
        );
      }
    };

    return (
      <View style={styles.stateContainer}>
        <Text style={styles.errorTitle}>Sesi tidak dapat dimuat</Text>
        <Text style={styles.errorMessage}>{initializationError}</Text>
        {recoveryError !== null && <Text style={styles.recoveryError}>{recoveryError}</Text>}
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleReturnToLogin()}
          style={({ pressed }) => [styles.recoveryButton, pressed && styles.recoveryButtonPressed]}>
          <Text style={styles.recoveryButtonText}>Log masuk semula</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <StatusBar style="light" />
          <AnimatedSplashOverlay />
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0A0C14',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#A0A5BD',
    fontSize: 14,
    textAlign: 'center',
  },
  recoveryError: {
    color: '#FF7675',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  recoveryButton: {
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#6C5CE7',
    marginTop: 20,
  },
  recoveryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  recoveryButtonPressed: { opacity: 0.7 },
});

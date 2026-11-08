import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const PROFILE_KEY = 'user_profile';
const DEMO_ACCOUNT_KEY = '@studentplanner_demo_account';

export type UserProfile = {
  name: string;
  email: string;
  nama?: string;
  noMatrik?: string;
  kursus?: string;
  semester?: string;
  kodFakulti?: string;
  initials?: string;
};

export type StudentRegistration = {
  nama: string;
  email: string;
  noMatrik: string;
  kursus: string;
  semester: string;
  kodFakulti: string;
};

type AuthContextValue = {
  profile: UserProfile | null;
  isLoading: boolean;
  initializationError: string | null;
  signIn: (email: string) => Promise<void>;
  register: (student: StudentRegistration) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.name === 'string' &&
    typeof profile.email === 'string' &&
    (profile.nama === undefined || typeof profile.nama === 'string') &&
    (profile.noMatrik === undefined || typeof profile.noMatrik === 'string') &&
    (profile.kursus === undefined || typeof profile.kursus === 'string') &&
    (profile.semester === undefined || typeof profile.semester === 'string') &&
    (profile.kodFakulti === undefined || typeof profile.kodFakulti === 'string') &&
    (profile.initials === undefined || typeof profile.initials === 'string')
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem(PROFILE_KEY);
        if (storedProfile !== null) {
          const parsedProfile: unknown = JSON.parse(storedProfile);
          if (!isUserProfile(parsedProfile)) {
            throw new Error('Data profil yang disimpan tidak sah.');
          }
          if (active) setProfile(parsedProfile);
        }
      } catch (error) {
        console.error('Gagal memulihkan sesi pengguna:', error);
        if (active) setInitializationError('Sesi pengguna tidak dapat dibaca. Sila mulakan semula aplikasi.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string) => {
    const storedAccount = await AsyncStorage.getItem(DEMO_ACCOUNT_KEY);
    if (storedAccount === null) {
      throw new Error('Akaun demo belum didaftarkan pada peranti ini.');
    }

    const parsedAccount: unknown = JSON.parse(storedAccount);
    if (!isUserProfile(parsedAccount) || normalizeEmail(parsedAccount.email) !== normalizeEmail(email)) {
      throw new Error('E-mel tidak sepadan dengan akaun demo pada peranti ini.');
    }

    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(parsedAccount));
    setProfile(parsedAccount);
  }, []);

  const register = useCallback(async (student: StudentRegistration) => {
    const nama = student.nama.trim();
    const email = normalizeEmail(student.email);
    const noMatrik = student.noMatrik.trim();
    const kursus = student.kursus.trim();
    const semester = student.semester.trim();
    const kodFakulti = student.kodFakulti.trim();
    if (!nama || !email || !noMatrik || !kursus || !semester) {
      throw new Error('Nama, e-mel, nombor matrik, kursus dan semester diperlukan.');
    }

    const account: UserProfile = {
      name: nama,
      nama,
      email,
      noMatrik,
      kursus,
      semester,
      kodFakulti,
      initials: nama
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toLocaleUpperCase(),
    };

    await AsyncStorage.setItem(DEMO_ACCOUNT_KEY, JSON.stringify(account));
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(account));
    setProfile(account);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(PROFILE_KEY);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ profile, isLoading, initializationError, signIn, register, signOut }),
    [profile, isLoading, initializationError, signIn, register, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth mesti digunakan di dalam AuthProvider.');
  }
  return context;
}

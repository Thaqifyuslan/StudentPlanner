import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const PROFILE_FIELDS = 'id,email,nama,no_matrik,kursus,semester,kod_fakulti,avatar_url';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  nama: string;
  noMatrik: string;
  kursus: string;
  semester: string;
  kodFakulti: string;
  initials: string;
  avatarUri?: string;
};

export type StudentRegistration = {
  nama: string;
  email: string;
  password: string;
  noMatrik: string;
  kursus: string;
  semester: string;
  kodFakulti: string;
};

type AuthContextValue = {
  profile: UserProfile | null;
  isLoading: boolean;
  initializationError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (student: StudentRegistration) => Promise<{ requiresEmailConfirmation: boolean }>;
  updateProfile: (
    updates: Partial<Pick<UserProfile, 'nama' | 'noMatrik' | 'kursus' | 'semester' | 'kodFakulti' | 'avatarUri'>> & {
      avatarMimeType?: string;
    },
  ) => Promise<void>;
  signOut: () => Promise<void>;
  clearLocalSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toLocaleUpperCase();
}

async function loadProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', userId)
    .single();
  if (error) throw error;

  const row = data as {
    id: string;
    email: string;
    nama: string;
    no_matrik: string;
    kursus: string;
    semester: string;
    kod_fakulti: string;
    avatar_url: string | null;
  };

  let avatarUri: string | undefined;
  if (row.avatar_url) {
    const { data: signedUrl, error: avatarError } = await supabase.storage
      .from('avatars')
      .createSignedUrl(row.avatar_url, 60 * 60 * 24);
    if (avatarError) throw avatarError;
    avatarUri = signedUrl.signedUrl;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.nama,
    nama: row.nama,
    noMatrik: row.no_matrik,
    kursus: row.kursus,
    semester: row.semester,
    kodFakulti: row.kod_fakulti,
    initials: initialsFor(row.nama),
    avatarUri,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error !== 'object' || error === null) return fallback;

  const details = error as Record<string, unknown>;
  if (details.code === 'PGRST116') {
    return 'Account profile not found. Rerun the Supabase schema and verify your email address.';
  }
  if (details.code === 'PGRST205' || details.code === '42P01') {
    return 'The profiles table is unavailable. Run supabase/schema.sql in the Supabase SQL Editor.';
  }
  if (details.code === '42501' || details.status === 401 || details.status === 403) {
    return 'Supabase access was denied. Check the API key, RLS policies, and user session.';
  }
  if (typeof details.message === 'string') return details.message;
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [initializationError, setInitializationError] = useState<string | null>(
    isSupabaseConfigured
      ? null
      : 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to connect to Supabase.',
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          const restoredProfile = await loadProfile(data.session.user.id);
          if (active) setProfile(restoredProfile);
        }
      } catch (error) {
        console.error('Failed to restore Supabase session:', error);
        if (active) {
          setInitializationError(
            getErrorMessage(error, 'Could not load the Supabase session. Check your configuration and try again.'),
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (!session) {
        setProfile(null);
        setInitializationError(null);
        setIsLoading(false);
        return;
      }
      void Promise.resolve().then(async () => {
        const nextProfile = await loadProfile(session.user.id);
        if (active) {
          setProfile(nextProfile);
          setInitializationError(null);
          setIsLoading(false);
        }
      }).catch((error: unknown) => {
        console.error('Failed to load Supabase profile:', error);
        if (active) {
          setInitializationError(
            getErrorMessage(error, 'Could not load the profile. Make sure the Supabase tables are set up.'),
          );
          setIsLoading(false);
        }
      });
    });

    void restoreSession();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    const channel = supabase
      .channel(`profile:${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` },
        () => {
          void loadProfile(profile.id)
            .then((updatedProfile) => {
              if (active) setProfile(updatedProfile);
            })
            .catch((error: unknown) => {
              console.error('Failed to sync Supabase profile:', error);
            });
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLocaleLowerCase(),
      password,
    });
    if (error) throw error;
    setProfile(await loadProfile(data.session.user.id));
    setInitializationError(null);
  }, []);

  const register = useCallback(async (student: StudentRegistration) => {
    const nama = student.nama.trim();
    const email = student.email.trim().toLocaleLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: student.password,
      options: {
        data: {
          nama,
          no_matrik: student.noMatrik.trim(),
          kursus: student.kursus.trim(),
          semester: student.semester.trim(),
          kod_fakulti: student.kodFakulti.trim(),
        },
      },
    });
    if (error) throw error;
    if (data.session) {
      setProfile(await loadProfile(data.session.user.id));
      setInitializationError(null);
    }
    return { requiresEmailConfirmation: data.session === null };
  }, []);

  const updateProfile = useCallback(
    async (
      updates: Partial<
        Pick<UserProfile, 'nama' | 'noMatrik' | 'kursus' | 'semester' | 'kodFakulti' | 'avatarUri'>
      > & { avatarMimeType?: string },
    ) => {
      if (profile === null) throw new Error('You must be signed in to update your profile.');

      const nama = updates.nama?.trim() ?? profile.nama;
      if (!nama) throw new Error('Full name is required.');

      let avatarPath: string | null | undefined;
      if (updates.avatarUri !== undefined) {
        const uri = updates.avatarUri;
        const extension = uri.split(/[?#]/, 1)[0].split('.').pop()?.toLocaleLowerCase();
        const extensionFromMimeType = updates.avatarMimeType?.split('/')[1];
        const safeExtension =
          (extension && /^[a-z0-9]{1,5}$/.test(extension) ? extension : null) ??
          (extensionFromMimeType && /^[a-z0-9]{1,5}$/.test(extensionFromMimeType)
            ? extensionFromMimeType
            : 'jpg');
        const path = `${profile.id}/${Date.now()}.${safeExtension}`;
        const response = await fetch(uri);
        if (!response.ok) throw new Error('Could not read the profile picture file.');
        const fileData = await response.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, fileData, {
            contentType: updates.avatarMimeType,
            upsert: false,
          });
        if (uploadError) throw uploadError;
        avatarPath = path;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          nama,
          no_matrik: updates.noMatrik?.trim() ?? profile.noMatrik,
          kursus: updates.kursus?.trim() ?? profile.kursus,
          semester: updates.semester?.trim() ?? profile.semester,
          kod_fakulti: updates.kodFakulti?.trim() ?? profile.kodFakulti,
          ...(avatarPath !== undefined ? { avatar_url: avatarPath } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select(PROFILE_FIELDS)
        .single();
      if (error) throw error;

      const row = data as { id: string; avatar_url: string | null };
      const nextProfile = await loadProfile(row.id);
      setProfile(nextProfile);
    },
    [profile],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  }, []);

  const clearLocalSession = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    setProfile(null);
    setInitializationError(null);
    setIsLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      initializationError,
      signIn,
      register,
      updateProfile,
      signOut,
      clearLocalSession,
    }),
    [profile, isLoading, initializationError, signIn, register, updateProfile, signOut, clearLocalSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}

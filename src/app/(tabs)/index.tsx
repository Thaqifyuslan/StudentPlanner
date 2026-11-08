import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { usePlanner } from '@/contexts/planner-context';

const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LEGACY_DAY_NAMES: Record<string, string> = {
  ahad: 'sunday',
  isnin: 'monday',
  selasa: 'tuesday',
  rabu: 'wednesday',
  khamis: 'thursday',
  jumaat: 'friday',
  sabtu: 'saturday',
};

export default function HomeScreen() {
  const { profile, signOut } = useAuth();
  const { courses, assignments, isLoading, storageError } = usePlanner();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const today = ENGLISH_DAYS[currentDate.getDay()];
  const todayDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(currentDate);
  const classesToday = courses.filter((course) => {
    const courseDay = course.day.split(/[•|,]/, 1)[0].trim();
    const normalizedCourseDay =
      LEGACY_DAY_NAMES[courseDay.toLocaleLowerCase()] ?? courseDay.toLocaleLowerCase();
    return normalizedCourseDay === today.toLocaleLowerCase();
  });
  const pendingAssignments = assignments.filter((assignment) => assignment.status === 'Pending').length;

  useEffect(() => {
    const intervalId = setInterval(() => setCurrentDate(new Date()), 60_000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setSignOutError(null);
    } catch (error) {
      console.error('Failed to sign out:', error);
      setSignOutError('Could not sign out. Please try again.');
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>WELCOME</Text>
            <Text style={styles.name}>{profile?.nama ?? profile?.name ?? 'Student'}</Text>
            {profile?.noMatrik ? (
              <Text style={styles.profileDetails}>
                {profile.noMatrik}
                {profile.kursus ? ` • ${profile.kursus}` : ''}
                {profile.semester ? ` • Semester ${profile.semester}` : ''}
              </Text>
            ) : null}
          </View>
          <View style={styles.headerActions}>
            {profile?.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatar}>{initials}</Text>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleSignOut()}
              style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </View>

        {(storageError !== null || signOutError !== null) && (
          <Text style={styles.error}>{storageError ?? signOutError}</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{isLoading ? '…' : courses.length}</Text>
            <Text style={styles.statLabel}>Active courses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.pendingValue]}>
              {isLoading ? '…' : pendingAssignments}
            </Text>
            <Text style={styles.statLabel}>Pending tasks</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Today&apos;s Classes</Text>
            <Text style={styles.dateText}>{todayDate}</Text>
          </View>
          <Link href="/(tabs)/jadual" style={styles.sectionLink}>Schedule</Link>
        </View>
        {classesToday.length > 0 ? (
          classesToday.map((course) => (
            <View key={course.id} style={[styles.courseCard, { borderLeftColor: course.color }]}>
              <View style={styles.courseTop}>
                <Text style={[styles.courseCode, { color: course.color }]}>{course.code}</Text>
                <Text style={styles.mutedText}>{course.time}</Text>
              </View>
              <Text style={styles.courseName}>{course.name}</Text>
              <Text style={styles.mutedText}>{course.room}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No classes are scheduled for {todayDate}.</Text>
          </View>
        )}

        <Link href="/(tabs)/tugasan" asChild>
          <Pressable style={({ pressed }) => [styles.assignmentLink, pressed && styles.pressed]}>
            <Text style={styles.assignmentLinkText}>View and manage tasks</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C14' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerText: { flex: 1, minWidth: 0, paddingRight: 12 },
  greeting: { color: '#A5B4FC', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  name: { color: '#F1F3F9', fontSize: 22, fontWeight: '700', marginTop: 3 },
  profileDetails: { color: '#7E85A3', fontSize: 11, marginTop: 3 },
  headerActions: { alignItems: 'center', gap: 6 },
  avatar: {
    width: 44,
    height: 44,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#6C5CE7',
    color: '#FFFFFF',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 15,
    fontWeight: '700',
    paddingTop: 12,
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  signOutButton: { paddingVertical: 5, paddingHorizontal: 8 },
  signOutText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  statCard: { flex: 1, padding: 16, borderRadius: 14, backgroundColor: '#141724' },
  statValue: { color: '#A5B4FC', fontSize: 25, fontWeight: '700' },
  pendingValue: { color: '#FF7675' },
  statLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  dateText: { color: '#8D94B0', fontSize: 12, marginTop: 3 },
  sectionLink: { color: '#A5B4FC', fontSize: 13, fontWeight: '600' },
  courseCard: { padding: 15, borderRadius: 14, backgroundColor: '#141724', borderLeftWidth: 4, marginBottom: 10 },
  courseTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  courseCode: { fontSize: 12, fontWeight: '700' },
  courseName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 5 },
  mutedText: { color: '#8D94B0', fontSize: 12 },
  emptyCard: { padding: 22, borderRadius: 14, backgroundColor: '#141724', alignItems: 'center' },
  emptyText: { color: '#8D94B0', fontSize: 13, textAlign: 'center' },
  assignmentLink: { padding: 14, borderRadius: 12, backgroundColor: '#1E1E2E', alignItems: 'center', marginTop: 10 },
  assignmentLinkText: { color: '#A5B4FC', fontSize: 14, fontWeight: '700' },
  error: { color: '#FF7675', fontSize: 13, marginBottom: 12 },
  pressed: { opacity: 0.7 },
});

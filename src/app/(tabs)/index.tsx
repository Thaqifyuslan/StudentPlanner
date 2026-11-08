import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';

const MALAY_DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const { profile, signOut } = useAuth();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assignments' | 'timetable'>('dashboard');
  const [signOutError, setSignOutError] = useState<string | null>(null);
  
  // States Data
  const [courses, setCourses] = useState([
    { id: '1', code: 'DDWD2713', name: 'Mobile Programming', day: 'Isnin', time: '08:00 AM', room: 'Lab 2', lecturer: 'Mdm Noor Diana', color: '#6C5CE7' },
    { id: '2', code: 'SECJ1013', name: 'Data Structures', day: 'Selasa', time: '10:00 AM', room: 'DK 1', lecturer: 'Dr. Azman', color: '#00CEC9' },
  ]);

  const [assignments, setAssignments] = useState([
    { id: '1', title: 'Lab 4 Expo PWA 2026 UI', course: 'DDWD2713', dueDate: 'Esok', priority: 'High', status: 'Pending' },
  ]);

  // States Borang Tugasan
  const [newTitle, setNewTitle] = useState('');
  const [newCourse, setNewCourse] = useState('');

  // States Borang Subjek
  const [newCode, setNewCode] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newDay, setNewDay] = useState('');
  const [newRoom, setNewRoom] = useState('');

  const today = MALAY_DAYS[currentDate.getDay()];
  const classesToday = courses.filter((course) => {
    const courseDay = course.day.split(/[•|,]/, 1)[0].trim();
    return courseDay.toLocaleLowerCase() === today.toLocaleLowerCase();
  });
  const horizontalPadding = Math.min(Math.max(width * 0.05, 16), 24);

  const handleSignOut = async () => {
    try {
      await signOut();
      setSignOutError(null);
    } catch (error) {
      console.error('Gagal log keluar:', error);
      setSignOutError('Tidak dapat log keluar. Sila cuba lagi.');
    }
  };

  useEffect(() => {
    loadAllData();
    const intervalId = setInterval(() => setCurrentDate(new Date()), 60_000);
    return () => clearInterval(intervalId);
  }, []);

  // READ DATA
  const loadAllData = async () => {
    try {
      const savedAssign = await AsyncStorage.getItem('@assignments_2026');
      const savedCourses = await AsyncStorage.getItem('@courses_2026');
      if (savedAssign !== null) setAssignments(JSON.parse(savedAssign));
      if (savedCourses !== null) setCourses(JSON.parse(savedCourses));
    } catch (e) {
      console.error(e);
    }
  };

  const saveData = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(e);
    }
  };

  // --- ASSIGNMENT CRUD ---
  // 1. CREATE ASSIGNMENT
  const addAssignment = () => {
    if (!newTitle || !newCourse) return;
    const item = {
      id: Date.now().toString(),
      title: newTitle,
      course: newCourse,
      dueDate: 'Akan Datang',
      priority: 'High',
      status: 'Pending',
    };
    const updated = [item, ...assignments];
    setAssignments(updated);
    saveData('@assignments_2026', updated);
    setNewTitle('');
    setNewCourse('');
  };

  // 2. UPDATE ASSIGNMENT (Toggle Pending/DONE)
  const toggleStatus = (id: string) => {
    const updated = assignments.map(item => {
      if (item.id === id) {
        return { ...item, status: item.status === 'Pending' ? 'DONE' : 'Pending' };
      }
      return item;
    });
    setAssignments(updated);
    saveData('@assignments_2026', updated);
  };

  // 3. DELETE ASSIGNMENT
  const deleteAssignment = (id: string) => {
    const updated = assignments.filter(item => item.id !== id);
    setAssignments(updated);
    saveData('@assignments_2026', updated);
  };

  // --- COURSE CRUD ---
  // 1. CREATE COURSE
  const addCourse = () => {
    if (!newCode || !newSubName) return;
    const item = {
      id: Date.now().toString(),
      code: newCode,
      name: newSubName,
      day: newDay || 'Isnin',
      time: '09:00 AM',
      room: newRoom || 'Lab 1',
      lecturer: 'Pensyarah',
      color: '#6C5CE7'
    };
    const updated = [...courses, item];
    setCourses(updated);
    saveData('@courses_2026', updated);
    setNewCode('');
    setNewSubName('');
    setNewDay('');
    setNewRoom('');
  };

  // 2. DELETE COURSE
  const deleteCourse = (id: string) => {
    const updated = courses.filter(item => item.id !== id);
    setCourses(updated);
    saveData('@courses_2026', updated);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Bar Header */}
      <View
        style={[
          styles.topBar,
          { paddingHorizontal: horizontalPadding, width: '100%', maxWidth: 760, alignSelf: 'center' },
        ]}>
        <View>
          <Text style={styles.greetingText}>SELAMAT DATANG 👋</Text>
          <Text style={styles.userName}>{profile?.nama ?? profile?.name ?? 'Pelajar'}</Text>
          {profile?.noMatrik ? (
            <Text style={styles.profileDetails}>
              {profile.noMatrik}
              {profile.kursus ? ` • ${profile.kursus}` : ''}
              {profile.semester ? ` • Semester ${profile.semester}` : ''}
            </Text>
          ) : null}
        </View>
        <View style={styles.topBarActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleSignOut()}
            style={({ pressed }) => [styles.signOutButton, pressed && styles.buttonPressed]}>
            <Text style={styles.signOutText}>Log keluar</Text>
          </Pressable>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {profile?.initials ??
                profile?.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0]?.toLocaleUpperCase())
                  .join('') ??
                'P'}
            </Text>
          </View>
        </View>
      </View>
      {signOutError !== null && <Text style={styles.signOutError}>{signOutError}</Text>}

      {/* Navigation Tabs */}
      <View style={styles.tabNav}>
        <TouchableOpacity 
          style={[styles.navBtn, activeTab === 'dashboard' && styles.navBtnActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.navBtnText, activeTab === 'dashboard' && styles.navBtnTextActive]}>📊 Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navBtn, activeTab === 'timetable' && styles.navBtnActive]}
          onPress={() => setActiveTab('timetable')}
        >
          <Text style={[styles.navBtnText, activeTab === 'timetable' && styles.navBtnTextActive]}>📅 Jadual</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navBtn, activeTab === 'assignments' && styles.navBtnActive]}
          onPress={() => setActiveTab('assignments')}
        >
          <Text style={[styles.navBtnText, activeTab === 'assignments' && styles.navBtnTextActive]}>
            📝 Tugasan ({assignments.filter(a => a.status === 'Pending').length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[
          styles.scrollArea,
          { paddingHorizontal: horizontalPadding, width: '100%', maxWidth: 760, alignSelf: 'center' },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <View>
            <View style={styles.heroCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroSubTitle}>SASARAN CGPA SEMESTER</Text>
                <Text style={styles.heroGpaText}>3.85 <Text style={{fontSize: 16, color: '#A0A5BD'}}> / 4.00</Text></Text>
                <Text style={styles.heroStatus}>🔥 Anugerah Dekan Target</Text>
              </View>
              <View style={styles.progressRing}>
                <Text style={styles.progressText}>96%</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{courses.length}</Text>
                <Text style={styles.statLabel}>Subjek Aktif</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#FF7675' }]}>
                  {assignments.filter(a => a.status === 'Pending').length}
                </Text>
                <Text style={styles.statLabel}>Pending Tasks</Text>
              </View>
            </View>

            <Text style={styles.sectionHeader}>Kelas Hari Ini ({today})</Text>
            {classesToday.length > 0 ? classesToday.map(c => (
              <View key={c.id} style={[styles.courseCard, { borderLeftColor: c.color }]}>
                <View style={styles.courseHeader}>
                  <Text style={[styles.courseCodeBadge, { backgroundColor: c.color + '22', color: c.color }]}>{c.code}</Text>
                  <Text style={styles.courseTime}>🕒 {c.time}</Text>
                </View>
                <Text style={styles.courseName}>{c.name}</Text>
                <Text style={styles.courseMeta}>🏫 {c.room} • 👤 {c.lecturer}</Text>
              </View>
            )) : (
              <View style={styles.emptyClassesCard}>
                <Text style={styles.emptyClassesIcon}>☕</Text>
                <Text style={styles.emptyClassesText}>Tiada kelas dijadualkan untuk hari {today}.</Text>
              </View>
            )}
          </View>
        )}

        {/* JADUAL WAKTU (WITH COURSE CRUD) */}
        {activeTab === 'timetable' && (
          <View>
            {/* Form Tambah Subjek (Create Course) */}
            <View style={styles.inputCard}>
              <Text style={styles.inputCardTitle}>✨ Tambah Subjek Baru (Create)</Text>
              <TextInput 
                style={styles.modernInput} 
                placeholder="Kod Subjek (cth: DDWD2713)" 
                placeholderTextColor="#6C728F"
                value={newCode}
                onChangeText={setNewCode}
              />
              <TextInput 
                style={styles.modernInput} 
                placeholder="Nama Subjek (cth: Mobile Programming)" 
                placeholderTextColor="#6C728F"
                value={newSubName}
                onChangeText={setNewSubName}
              />
              <TextInput 
                style={styles.modernInput} 
                placeholder="Hari & Bilik (cth: Isnin • Lab 2)" 
                placeholderTextColor="#6C728F"
                value={newDay}
                onChangeText={setNewDay}
              />
              <TouchableOpacity style={styles.gradientBtn} onPress={addCourse}>
                <Text style={styles.gradientBtnText}>+ Simpan Subjek</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeader}>Senarai Subjek (Read & Delete)</Text>
            {courses.map(c => (
              <View key={c.id} style={[styles.courseCard, { borderLeftColor: c.color }]}>
                <View style={styles.courseHeader}>
                  <Text style={[styles.courseCodeBadge, { backgroundColor: c.color + '22', color: c.color }]}>{c.code}</Text>
                  <TouchableOpacity onPress={() => deleteCourse(c.id)}>
                    <Text style={styles.deleteBtnText}>🗑️ Padam</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.courseName}>{c.name}</Text>
                <Text style={styles.courseMeta}>🕒 {c.day} | 🏫 {c.room}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ASSIGNMENTS TRACKER (WITH ASSIGNMENT CRUD) */}
        {activeTab === 'assignments' && (
          <View>
            <View style={styles.inputCard}>
              <Text style={styles.inputCardTitle}>✨ Tambah Tugasan Baru (Create)</Text>
              <TextInput 
                style={styles.modernInput} 
                placeholder="Tajuk Tugasan (cth: Project Proposal)" 
                placeholderTextColor="#6C728F"
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <TextInput 
                style={styles.modernInput} 
                placeholder="Kod Subjek (cth: DDWD2713)" 
                placeholderTextColor="#6C728F"
                value={newCourse}
                onChangeText={setNewCourse}
              />
              <TouchableOpacity style={styles.gradientBtn} onPress={addAssignment}>
                <Text style={styles.gradientBtnText}>+ Simpan Tugasan</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeader}>Senarai Tugasan (Read, Update & Delete)</Text>
            {assignments.map(item => (
              <View key={item.id} style={[styles.assignCard, item.status === 'DONE' && styles.assignCardDone]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleStatus(item.id)}>
                  <Text style={[styles.assignTitle, item.status === 'DONE' && styles.textCompleted]}>{item.title}</Text>
                  <Text style={styles.assignMeta}>📚 {item.course} • ⏰ {item.dueDate}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity 
                    style={[styles.statusTag, item.status === 'DONE' ? styles.tagDone : styles.tagPending]}
                    onPress={() => toggleStatus(item.id)}
                  >
                    <Text style={styles.statusTagText}>{item.status}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => deleteAssignment(item.id)}>
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C14' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
  greetingText: { fontSize: 11, fontWeight: '800', color: '#6C5CE7', letterSpacing: 1.5 },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#F1F3F9', marginTop: 2 },
  profileDetails: { color: '#7E85A3', fontSize: 11, marginTop: 3, maxWidth: 250 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signOutButton: { paddingVertical: 8, paddingHorizontal: 10 },
  signOutText: { color: '#A0A5BD', fontSize: 12, fontWeight: '600' },
  signOutError: { color: '#FF7675', fontSize: 12, paddingHorizontal: 20, marginBottom: 8 },
  buttonPressed: { opacity: 0.7 },
  
  tabNav: { flexDirection: 'row', backgroundColor: '#141724', marginHorizontal: 20, padding: 4, borderRadius: 16, borderWidth: 1, borderColor: '#232738' },
  navBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  navBtnActive: { backgroundColor: '#6C5CE7' },
  navBtnText: { color: '#7E85A3', fontWeight: '600', fontSize: 13 },
  navBtnTextActive: { color: '#FFFFFF', fontWeight: 'bold' },

  scrollArea: { paddingHorizontal: 20, paddingTop: 15 },
  
  heroCard: { backgroundColor: '#181C2E', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2A3047', marginBottom: 15 },
  heroSubTitle: { fontSize: 10, fontWeight: '800', color: '#00CEC9', letterSpacing: 1 },
  heroGpaText: { fontSize: 32, fontWeight: '900', color: '#FFF', marginVertical: 4 },
  heroStatus: { fontSize: 12, color: '#A0A5BD' },
  progressRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' },
  progressText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#141724', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#232738' },
  statNumber: { fontSize: 26, fontWeight: 'bold', color: '#6C5CE7' },
  statLabel: { fontSize: 12, color: '#7E85A3', marginTop: 2 },

  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#F1F3F9', marginBottom: 12, marginTop: 5 },
  
  courseCard: { backgroundColor: '#141724', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#232738', borderLeftWidth: 5 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  courseCodeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 11, fontWeight: 'bold' },
  courseTime: { color: '#7E85A3', fontSize: 12 },
  courseName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  courseMeta: { color: '#7E85A3', fontSize: 13 },
  emptyClassesCard: { backgroundColor: '#141724', padding: 30, borderRadius: 16, borderWidth: 1, borderColor: '#232738', alignItems: 'center', justifyContent: 'center' },
  emptyClassesIcon: { fontSize: 28 },
  emptyClassesText: { color: '#7E85A3', fontSize: 13, textAlign: 'center', marginTop: 10 },

  inputCard: { backgroundColor: '#141724', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#232738', marginBottom: 20 },
  inputCardTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  modernInput: { backgroundColor: '#0A0C14', color: '#FFF', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#232738' },
  gradientBtn: { backgroundColor: '#6C5CE7', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  gradientBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  assignCard: { backgroundColor: '#141724', padding: 16, borderRadius: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#232738' },
  assignCardDone: { opacity: 0.5 },
  assignTitle: { color: '#FFF', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  textCompleted: { textDecorationLine: 'line-through', color: '#7E85A3' },
  assignMeta: { color: '#7E85A3', fontSize: 12 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagPending: { backgroundColor: '#FF767522' },
  tagDone: { backgroundColor: '#00CEC922' },
  statusTagText: { fontSize: 11, fontWeight: 'bold', color: '#FFF' },
  deleteBtnText: { fontSize: 12, color: '#FF7675', fontWeight: 'bold' }
});
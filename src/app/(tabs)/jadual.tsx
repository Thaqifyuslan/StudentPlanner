import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlanner } from '@/contexts/planner-context';

export default function JadualScreen() {
  const { courses, isLoading, storageError, addCourse, deleteCourse } = usePlanner();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [room, setRoom] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddCourse = async () => {
    if (!code.trim() || !name.trim()) {
      setError('Kod dan nama subjek diperlukan.');
      return;
    }

    try {
      await addCourse({
        code: code.trim(),
        name: name.trim(),
        day: day.trim() || 'Isnin',
        room: room.trim() || 'Lab 1',
      });
      setCode('');
      setName('');
      setDay('');
      setRoom('');
      setError(null);
    } catch (saveError) {
      console.error('Gagal menyimpan subjek:', saveError);
      setError('Subjek tidak dapat disimpan. Sila cuba lagi.');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteCourse(id);
      setError(null);
    } catch (deleteError) {
      console.error('Gagal memadam subjek:', deleteError);
      setError('Subjek tidak dapat dipadam. Sila cuba lagi.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>PERANCANGAN AKADEMIK</Text>
        <Text style={styles.title}>Jadual</Text>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Tambah subjek</Text>
          <TextInput
            accessibilityLabel="Kod subjek"
            autoCapitalize="characters"
            onChangeText={setCode}
            placeholder="Kod subjek (cth: DDWD2713)"
            placeholderTextColor="#737B98"
            style={styles.input}
            value={code}
          />
          <TextInput
            accessibilityLabel="Nama subjek"
            onChangeText={setName}
            placeholder="Nama subjek"
            placeholderTextColor="#737B98"
            style={styles.input}
            value={name}
          />
          <TextInput
            accessibilityLabel="Hari kelas"
            onChangeText={setDay}
            placeholder="Hari (cth: Isnin)"
            placeholderTextColor="#737B98"
            style={styles.input}
            value={day}
          />
          <TextInput
            accessibilityLabel="Bilik kelas"
            onChangeText={setRoom}
            placeholder="Bilik (cth: Lab 2)"
            placeholderTextColor="#737B98"
            style={styles.input}
            value={room}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleAddCourse()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Simpan subjek</Text>
          </Pressable>
        </View>

        {(error !== null || storageError !== null) && (
          <Text style={styles.error}>{error ?? storageError}</Text>
        )}

        <Text style={styles.sectionTitle}>Senarai subjek</Text>
        {isLoading ? <Text style={styles.emptyText}>Memuatkan jadual…</Text> : null}
        {!isLoading && courses.length === 0 ? (
          <Text style={styles.emptyText}>Belum ada subjek. Tambah subjek pertama anda di atas.</Text>
        ) : null}
        {courses.map((course) => (
          <View key={course.id} style={[styles.courseCard, { borderLeftColor: course.color }]}>
            <View style={styles.courseDetails}>
              <Text style={[styles.courseCode, { color: course.color }]}>{course.code}</Text>
              <Text style={styles.courseName}>{course.name}</Text>
              <Text style={styles.courseMeta}>{course.day} • {course.time} • {course.room}</Text>
              <Text style={styles.courseMeta}>{course.lecturer}</Text>
            </View>
            <Pressable
              accessibilityLabel={`Padam ${course.name}`}
              accessibilityRole="button"
              onPress={() => void handleDeleteCourse(course.id)}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
              <Text style={styles.deleteText}>Padam</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C14' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 120 },
  eyebrow: { color: '#A5B4FC', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#F1F3F9', fontSize: 28, fontWeight: '700', marginTop: 6, marginBottom: 18 },
  formCard: { padding: 16, borderRadius: 16, backgroundColor: '#141724', marginBottom: 20 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: { minHeight: 46, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: '#30364B', backgroundColor: '#0A0C14', color: '#FFFFFF', fontSize: 14, marginBottom: 10 },
  primaryButton: { minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6C5CE7', marginTop: 3 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  courseCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 14, borderLeftWidth: 4, backgroundColor: '#141724', marginBottom: 10 },
  courseDetails: { flex: 1, minWidth: 0 },
  courseCode: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  courseName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 5 },
  courseMeta: { color: '#8D94B0', fontSize: 12, marginTop: 2 },
  deleteButton: { paddingVertical: 8, paddingHorizontal: 10, marginLeft: 8 },
  deleteText: { color: '#FF7675', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#8D94B0', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  error: { color: '#FF7675', fontSize: 13, marginBottom: 14 },
  pressed: { opacity: 0.7 },
});

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

export default function TugasanScreen() {
  const {
    assignments,
    isLoading,
    storageError,
    addAssignment,
    toggleAssignment,
    deleteAssignment,
  } = usePlanner();
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pendingCount = assignments.filter((assignment) => assignment.status === 'Pending').length;

  const handleAddAssignment = async () => {
    if (!title.trim() || !course.trim()) {
      setError('Tajuk tugasan dan kod subjek diperlukan.');
      return;
    }
    try {
      await addAssignment(title.trim(), course.trim());
      setTitle('');
      setCourse('');
      setError(null);
    } catch (saveError) {
      console.error('Gagal menyimpan tugasan:', saveError);
      setError('Tugasan tidak dapat disimpan. Sila cuba lagi.');
    }
  };

  const handleToggleAssignment = async (id: string) => {
    try {
      await toggleAssignment(id);
      setError(null);
    } catch (updateError) {
      console.error('Gagal mengemas kini tugasan:', updateError);
      setError('Status tugasan tidak dapat dikemas kini. Sila cuba lagi.');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await deleteAssignment(id);
      setError(null);
    } catch (deleteError) {
      console.error('Gagal memadam tugasan:', deleteError);
      setError('Tugasan tidak dapat dipadam. Sila cuba lagi.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>PENGURUS TUGASAN</Text>
        <Text style={styles.title}>Tugasan</Text>
        <Text style={styles.subtitle}>{pendingCount} tugasan belum selesai</Text>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Tambah tugasan</Text>
          <TextInput
            accessibilityLabel="Tajuk tugasan"
            onChangeText={setTitle}
            placeholder="Tajuk tugasan"
            placeholderTextColor="#737B98"
            style={styles.input}
            value={title}
          />
          <TextInput
            accessibilityLabel="Kod subjek tugasan"
            autoCapitalize="characters"
            onChangeText={setCourse}
            placeholder="Kod subjek (cth: DDWD2713)"
            placeholderTextColor="#737B98"
            style={styles.input}
            value={course}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleAddAssignment()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Simpan tugasan</Text>
          </Pressable>
        </View>

        {(error !== null || storageError !== null) && (
          <Text style={styles.error}>{error ?? storageError}</Text>
        )}

        <Text style={styles.sectionTitle}>Senarai tugasan</Text>
        {isLoading ? <Text style={styles.emptyText}>Memuatkan tugasan…</Text> : null}
        {!isLoading && assignments.length === 0 ? (
          <Text style={styles.emptyText}>Belum ada tugasan. Tambah tugasan pertama anda di atas.</Text>
        ) : null}
        {assignments.map((assignment) => {
          const isDone = assignment.status === 'DONE';
          return (
            <View key={assignment.id} style={[styles.assignmentCard, isDone && styles.doneCard]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${isDone ? 'Tandakan belum selesai' : 'Tandakan selesai'}: ${assignment.title}`}
                onPress={() => void handleToggleAssignment(assignment.id)}
                style={styles.assignmentInfo}>
                <Text style={[styles.assignmentTitle, isDone && styles.completedTitle]}>
                  {assignment.title}
                </Text>
                <Text style={styles.assignmentMeta}>
                  {assignment.course} • {assignment.dueDate}
                </Text>
              </Pressable>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Status ${assignment.title}: ${assignment.status}`}
                  onPress={() => void handleToggleAssignment(assignment.id)}
                  style={[styles.statusBadge, isDone ? styles.doneBadge : styles.pendingBadge]}>
                  <Text style={styles.statusText}>{assignment.status}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Padam ${assignment.title}`}
                  onPress={() => void handleDeleteAssignment(assignment.id)}
                  style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                  <Text style={styles.deleteText}>Padam</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C14' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 120 },
  eyebrow: { color: '#A5B4FC', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#F1F3F9', fontSize: 28, fontWeight: '700', marginTop: 6 },
  subtitle: { color: '#8D94B0', fontSize: 13, marginTop: 5, marginBottom: 18 },
  formCard: { padding: 16, borderRadius: 16, backgroundColor: '#141724', marginBottom: 20 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: { minHeight: 46, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: '#30364B', backgroundColor: '#0A0C14', color: '#FFFFFF', fontSize: 14, marginBottom: 10 },
  primaryButton: { minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6C5CE7', marginTop: 3 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  assignmentCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 14, backgroundColor: '#141724', marginBottom: 10 },
  doneCard: { opacity: 0.65 },
  assignmentInfo: { flex: 1, minWidth: 0, paddingRight: 8 },
  assignmentTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 5 },
  completedTitle: { textDecorationLine: 'line-through', color: '#8D94B0' },
  assignmentMeta: { color: '#8D94B0', fontSize: 12 },
  actions: { alignItems: 'flex-end', gap: 5 },
  statusBadge: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8 },
  pendingBadge: { backgroundColor: '#FF767522' },
  doneBadge: { backgroundColor: '#00CEC922' },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  deleteButton: { paddingVertical: 5, paddingHorizontal: 6 },
  deleteText: { color: '#FF7675', fontSize: 11, fontWeight: '700' },
  emptyText: { color: '#8D94B0', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  error: { color: '#FF7675', fontSize: 13, marginBottom: 14 },
  pressed: { opacity: 0.7 },
});

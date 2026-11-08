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

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDueDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

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
  const [dueDate, setDueDate] = useState(() => toDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingCount = assignments.filter((assignment) => assignment.status === 'Pending').length;

  const handleAddAssignment = async () => {
    if (!title.trim() || !course.trim()) {
      setError('Task title and course code are required.');
      return;
    }
    try {
      await addAssignment(title.trim(), course.trim(), dueDate);
      setTitle('');
      setCourse('');
      setDueDate(toDateKey(new Date()));
      setCalendarOpen(false);
      setError(null);
    } catch (saveError) {
      console.error('Failed to save task:', saveError);
      const message =
        typeof saveError === 'object' &&
        saveError !== null &&
        'message' in saveError &&
        typeof saveError.message === 'string'
          ? saveError.message
          : 'Could not save the task. Please try again.';
      setError(message);
    }
  };

  const handleToggleAssignment = async (id: string) => {
    try {
      await toggleAssignment(id);
      setError(null);
    } catch (updateError) {
      console.error('Failed to update task:', updateError);
      setError('Could not update task status. Please try again.');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await deleteAssignment(id);
      setError(null);
    } catch (deleteError) {
      console.error('Failed to delete task:', deleteError);
      setError('Could not delete the task. Please try again.');
    }
  };

  const monthStartOffset = (calendarMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarCells = [
    ...Array.from({ length: monthStartOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>TASK MANAGER</Text>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.subtitle}>{pendingCount} pending tasks</Text>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Add a Task</Text>
          <TextInput
            accessibilityLabel="Task title"
            onChangeText={setTitle}
            placeholder="Task title"
            placeholderTextColor="#737B98"
            style={styles.input}
            value={title}
          />
          <TextInput
            accessibilityLabel="Task course code"
            autoCapitalize="characters"
            onChangeText={setCourse}
            placeholder="Course code (e.g. DDWD2713)"
            placeholderTextColor="#737B98"
            style={styles.input}
            value={course}
          />
          <Text style={styles.inputLabel}>Due Date</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Select due date, currently ${formatDueDate(dueDate)}`}
            onPress={() => setCalendarOpen((open) => !open)}
            style={styles.dateButton}>
            <Text style={styles.dateButtonText}>{formatDueDate(dueDate)}</Text>
            <Text style={styles.dateButtonIcon}>▦</Text>
          </Pressable>
          {calendarOpen && (
            <View style={styles.calendar}>
              <View style={styles.calendarHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  onPress={() =>
                    setCalendarMonth(
                      (month) => new Date(month.getFullYear(), month.getMonth() - 1, 1),
                    )
                  }
                  style={styles.monthButton}>
                  <Text style={styles.monthButtonText}>‹</Text>
                </Pressable>
                <Text style={styles.monthTitle}>
                  {new Intl.DateTimeFormat('en-GB', {
                    month: 'long',
                    year: 'numeric',
                  }).format(calendarMonth)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  onPress={() =>
                    setCalendarMonth(
                      (month) => new Date(month.getFullYear(), month.getMonth() + 1, 1),
                    )
                  }
                  style={styles.monthButton}>
                  <Text style={styles.monthButtonText}>›</Text>
                </Pressable>
              </View>
              <View style={styles.calendarGrid}>
                {weekdays.map((weekday) => (
                  <View key={weekday} style={styles.calendarCell}>
                    <Text style={styles.weekdayText}>{weekday}</Text>
                  </View>
                ))}
                {calendarCells.map((day, index) => {
                  if (day === null) {
                    return <View key={`empty-${index}`} style={styles.calendarCell} />;
                  }

                  const dateKey = toDateKey(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day),
                  );
                  const selected = dateKey === dueDate;
                  return (
                    <Pressable
                      key={dateKey}
                      accessibilityRole="button"
                      accessibilityLabel={`${day} ${new Intl.DateTimeFormat('en-GB', {
                        month: 'long',
                      }).format(calendarMonth)}`}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setDueDate(dateKey);
                        setCalendarOpen(false);
                      }}
                      style={[styles.calendarCell, selected && styles.selectedDay]}>
                      <Text style={[styles.dayText, selected && styles.selectedDayText]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const today = new Date();
                  setDueDate(toDateKey(today));
                  setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  setCalendarOpen(false);
                }}
                style={styles.todayButton}>
                <Text style={styles.todayButtonText}>Today</Text>
              </Pressable>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleAddAssignment()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Save Task</Text>
          </Pressable>
        </View>

        {(error !== null || storageError !== null) && (
          <Text style={styles.error}>{error ?? storageError}</Text>
        )}

        <Text style={styles.sectionTitle}>Tasks</Text>
        {isLoading ? <Text style={styles.emptyText}>Loading tasks…</Text> : null}
        {!isLoading && assignments.length === 0 ? (
          <Text style={styles.emptyText}>No tasks yet. Add your first task above.</Text>
        ) : null}
        {assignments.map((assignment) => {
          const isDone = assignment.status === 'DONE';
          return (
            <View key={assignment.id} style={[styles.assignmentCard, isDone && styles.doneCard]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${isDone ? 'Mark as incomplete' : 'Mark as complete'}: ${assignment.title}`}
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
                  accessibilityLabel={`${assignment.title} status: ${assignment.status}`}
                  onPress={() => void handleToggleAssignment(assignment.id)}
                  style={[styles.statusBadge, isDone ? styles.doneBadge : styles.pendingBadge]}>
                  <Text style={styles.statusText}>{assignment.status}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${assignment.title}`}
                  onPress={() => void handleDeleteAssignment(assignment.id)}
                  style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                  <Text style={styles.deleteText}>Delete</Text>
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
  inputLabel: { color: '#A5B4FC', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { minHeight: 46, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: '#30364B', backgroundColor: '#0A0C14', color: '#FFFFFF', fontSize: 14, marginBottom: 10 },
  dateButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: '#30364B', backgroundColor: '#0A0C14', marginBottom: 10 },
  dateButtonText: { color: '#FFFFFF', fontSize: 14 },
  dateButtonIcon: { color: '#A5B4FC', fontSize: 18 },
  calendar: { padding: 12, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: '#30364B', backgroundColor: '#0A0C14' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#141724' },
  monthButtonText: { color: '#FFFFFF', fontSize: 24, lineHeight: 28 },
  monthTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.2857%', height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  weekdayText: { color: '#8D94B0', fontSize: 11, fontWeight: '600' },
  dayText: { color: '#D5D8E5', fontSize: 13 },
  selectedDay: { backgroundColor: '#6C5CE7' },
  selectedDayText: { color: '#FFFFFF', fontWeight: '700' },
  todayButton: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },
  todayButtonText: { color: '#A5B4FC', fontSize: 12, fontWeight: '700' },
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

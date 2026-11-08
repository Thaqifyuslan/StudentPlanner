import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SubjectGrade = {
  id: string;
  name: string;
  credits: string;
  gradePoint: string;
};

type SavedCalculator = {
  previousCgpa: string;
  previousCredits: string;
  subjects: SubjectGrade[];
};

const STORAGE_KEY = '@cgpa_2026';
const EMPTY_SUBJECT: SubjectGrade = { id: 'initial', name: '', credits: '', gradePoint: '' };

function isSubjectGrade(value: unknown): value is SubjectGrade {
  if (typeof value !== 'object' || value === null) return false;
  const subject = value as Record<string, unknown>;
  return (
    typeof subject.id === 'string' &&
    typeof subject.name === 'string' &&
    typeof subject.credits === 'string' &&
    typeof subject.gradePoint === 'string'
  );
}

function isSavedCalculator(value: unknown): value is SavedCalculator {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.previousCgpa === 'string' &&
    typeof data.previousCredits === 'string' &&
    Array.isArray(data.subjects) &&
    data.subjects.every(isSubjectGrade)
  );
}

function numericValue(value: string) {
  if (value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatGpa(value: number) {
  return value.toFixed(2);
}

export default function CgpaScreen() {
  const [previousCgpa, setPreviousCgpa] = useState('0');
  const [previousCredits, setPreviousCredits] = useState('0');
  const [subjects, setSubjects] = useState<SubjectGrade[]>([EMPTY_SUBJECT]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadCalculator = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          const parsed: unknown = JSON.parse(stored);
          if (!isSavedCalculator(parsed)) {
            throw new Error('The saved calculator data is invalid.');
          }
          if (active) {
            setPreviousCgpa(parsed.previousCgpa);
            setPreviousCredits(parsed.previousCredits);
            setSubjects(parsed.subjects.length > 0 ? parsed.subjects : [EMPTY_SUBJECT]);
          }
        }
      } catch (error) {
        console.error('Failed to load CGPA data:', error);
        if (active) setLoadError('Could not load CGPA data. Check your device storage and try again.');
      } finally {
        if (active) setIsLoaded(true);
      }
    };

    void loadCalculator();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || loadError !== null) return;
    const data: SavedCalculator = { previousCgpa, previousCredits, subjects };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      .then(() => setSaveError(null))
      .catch((error: unknown) => {
        console.error('Failed to save CGPA data:', error);
        setSaveError('Could not save CGPA changes on this device.');
      });
  }, [isLoaded, loadError, previousCgpa, previousCredits, subjects]);

  const calculation = (() => {
    const priorGpa = numericValue(previousCgpa);
    const priorCreditsValue = numericValue(previousCredits);
    if (
      priorGpa === null ||
      priorCreditsValue === null ||
      priorGpa < 0 ||
      priorGpa > 4 ||
      priorCreditsValue < 0
    ) {
      return { error: 'Enter a previous CGPA between 0.00 and 4.00, and valid credits.' };
    }

    let semesterCredits = 0;
    let semesterPoints = 0;
    let hasSubject = false;

    for (const subject of subjects) {
      const name = subject.name.trim();
      const creditsText = subject.credits.trim();
      const gradeText = subject.gradePoint.trim();
      if (!name && !creditsText && !gradeText) continue;

      const credits = numericValue(creditsText);
      const gradePoint = numericValue(gradeText);
      if (!name || credits === null || gradePoint === null || credits <= 0 || gradePoint < 0 || gradePoint > 4) {
        return { error: 'Complete each subject. Credits must be greater than 0 and grade points must be between 0.00 and 4.00.' };
      }

      hasSubject = true;
      semesterCredits += credits;
      semesterPoints += credits * gradePoint;
    }

    const totalCredits = priorCreditsValue + semesterCredits;
    if (!hasSubject || totalCredits <= 0) return { error: null };

    return {
      error: null,
      semesterGpa: semesterPoints / semesterCredits,
      cumulativeGpa: (priorGpa * priorCreditsValue + semesterPoints) / totalCredits,
      semesterCredits,
      totalCredits,
    };
  })();

  const updateSubject = (id: string, field: keyof Omit<SubjectGrade, 'id'>, value: string) => {
    setSubjects((current) =>
      current.map((subject) => (subject.id === id ? { ...subject, [field]: value } : subject)),
    );
  };

  const addSubject = () => {
    setSubjects((current) => [
      ...current,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: '', credits: '', gradePoint: '' },
    ]);
  };

  const removeSubject = (id: string) => {
    setSubjects((current) => {
      const remaining = current.filter((subject) => subject.id !== id);
      return remaining.length > 0 ? remaining : [EMPTY_SUBJECT];
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>ACADEMIC TOOLS</Text>
        <Text style={styles.title}>CGPA Calculator</Text>
        <Text style={styles.subtitle}>
          Cumulative GPA is weighted using credits and grade points from 0.00 to 4.00.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Previous Record</Text>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Previous CGPA</Text>
              <TextInput
                accessibilityLabel="Previous CGPA"
                keyboardType="decimal-pad"
                onChangeText={setPreviousCgpa}
                placeholder="0.00"
                placeholderTextColor="#737B98"
                style={styles.input}
                value={previousCgpa}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Previous total credits</Text>
              <TextInput
                accessibilityLabel="Previous total credits"
                keyboardType="decimal-pad"
                onChangeText={setPreviousCredits}
                placeholder="0"
                placeholderTextColor="#737B98"
                style={styles.input}
                value={previousCredits}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>This Semester&apos;s Subjects</Text>
          <Pressable
            accessibilityRole="button"
            onPress={addSubject}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Text style={styles.addButtonText}>+ Subject</Text>
          </Pressable>
        </View>

        {subjects.map((subject, index) => (
          <View key={subject.id} style={styles.subjectCard}>
            <View style={styles.subjectHeading}>
              <Text style={styles.subjectTitle}>Subject {index + 1}</Text>
              {subjects.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete subject ${index + 1}`}
                  onPress={() => removeSubject(subject.id)}
                  style={styles.removeButton}>
                  <Text style={styles.removeText}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
            <TextInput
              accessibilityLabel={`Subject name ${index + 1}`}
              onChangeText={(value) => updateSubject(subject.id, 'name', value)}
              placeholder="Subject name or code"
              placeholderTextColor="#737B98"
              style={styles.input}
              value={subject.name}
            />
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Credits</Text>
                <TextInput
                  accessibilityLabel={`Credits for subject ${index + 1}`}
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateSubject(subject.id, 'credits', value)}
                  placeholder="3"
                  placeholderTextColor="#737B98"
                  style={styles.input}
                  value={subject.credits}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Grade points (0.00–4.00)</Text>
                <TextInput
                  accessibilityLabel={`Grade points for subject ${index + 1}`}
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateSubject(subject.id, 'gradePoint', value)}
                  placeholder="4.00"
                  placeholderTextColor="#737B98"
                  style={styles.input}
                  value={subject.gradePoint}
                />
              </View>
            </View>
          </View>
        ))}

        {calculation.error !== null ? <Text style={styles.error}>{calculation.error}</Text> : null}
        {loadError !== null || saveError !== null ? (
          <Text style={styles.error}>{loadError ?? saveError}</Text>
        ) : null}

        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>CURRENT CGPA</Text>
          <Text style={styles.resultValue}>
            {'cumulativeGpa' in calculation && calculation.cumulativeGpa !== undefined
              ? formatGpa(calculation.cumulativeGpa)
              : '—'}
          </Text>
          <View style={styles.resultDetails}>
            <Text style={styles.resultDetail}>
              Semester GPA: {'semesterGpa' in calculation && calculation.semesterGpa !== undefined
                ? formatGpa(calculation.semesterGpa)
                : '—'}
            </Text>
            <Text style={styles.resultDetail}>
              Total credits: {'totalCredits' in calculation && calculation.totalCredits !== undefined
                ? calculation.totalCredits
                : '—'}
            </Text>
          </View>
        </View>
        <Text style={styles.note}>
          Formula: (previous CGPA × previous credits + semester grade points) ÷ total accumulated credits.
          Enter grade points according to your institution&apos;s scale.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C14' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 120 },
  eyebrow: { color: '#A5B4FC', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#F1F3F9', fontSize: 28, fontWeight: '700', marginTop: 6 },
  subtitle: { color: '#8D94B0', fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 18 },
  formCard: { padding: 16, borderRadius: 16, backgroundColor: '#141724', marginBottom: 18 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, minWidth: 0 },
  label: { color: '#A5B4FC', fontSize: 11, fontWeight: '600', marginBottom: 6 },
  input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#30364B', backgroundColor: '#0A0C14', color: '#FFFFFF', fontSize: 14, marginBottom: 10 },
  subjectCard: { padding: 14, borderRadius: 14, backgroundColor: '#141724', marginBottom: 10 },
  subjectHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subjectTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  removeButton: { paddingHorizontal: 8, paddingVertical: 5, marginBottom: 7 },
  removeText: { color: '#FF7675', fontSize: 11, fontWeight: '600' },
  addButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: '#25213F', marginBottom: 10 },
  addButtonText: { color: '#C4B5FD', fontSize: 12, fontWeight: '700' },
  resultCard: { alignItems: 'center', padding: 20, borderRadius: 16, backgroundColor: '#1E1E2E', marginTop: 8 },
  resultLabel: { color: '#A5B4FC', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  resultValue: { color: '#FFFFFF', fontSize: 42, fontWeight: '800', marginTop: 4 },
  resultDetails: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 8 },
  resultDetail: { color: '#A0A5BD', fontSize: 12 },
  note: { color: '#737B98', fontSize: 11, lineHeight: 17, marginTop: 14 },
  error: { color: '#FF7675', fontSize: 12, lineHeight: 18, marginVertical: 8 },
  pressed: { opacity: 0.7 },
});

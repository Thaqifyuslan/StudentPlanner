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
            throw new Error('Data kalkulator yang disimpan tidak sah.');
          }
          if (active) {
            setPreviousCgpa(parsed.previousCgpa);
            setPreviousCredits(parsed.previousCredits);
            setSubjects(parsed.subjects.length > 0 ? parsed.subjects : [EMPTY_SUBJECT]);
          }
        }
      } catch (error) {
        console.error('Gagal memuat data CGPA:', error);
        if (active) setLoadError('Data CGPA tidak dapat dimuat. Semak storan peranti dan cuba lagi.');
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
        console.error('Gagal menyimpan data CGPA:', error);
        setSaveError('Perubahan CGPA tidak dapat disimpan pada peranti ini.');
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
      return { error: 'Masukkan CGPA terdahulu antara 0.00 hingga 4.00 dan kredit yang sah.' };
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
        return { error: 'Lengkapkan setiap subjek. Kredit mesti melebihi 0 dan mata gred antara 0.00 hingga 4.00.' };
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
        <Text style={styles.eyebrow}>ALAT AKADEMIK</Text>
        <Text style={styles.title}>Kalkulator CGPA</Text>
        <Text style={styles.subtitle}>
          CGPA kumulatif dikira secara berwajaran menggunakan kredit dan mata gred 0.00–4.00.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Rekod terdahulu</Text>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>CGPA terdahulu</Text>
              <TextInput
                accessibilityLabel="CGPA terdahulu"
                keyboardType="decimal-pad"
                onChangeText={setPreviousCgpa}
                placeholder="0.00"
                placeholderTextColor="#737B98"
                style={styles.input}
                value={previousCgpa}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Jumlah kredit terdahulu</Text>
              <TextInput
                accessibilityLabel="Jumlah kredit terdahulu"
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
          <Text style={styles.sectionTitle}>Subjek semester ini</Text>
          <Pressable
            accessibilityRole="button"
            onPress={addSubject}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Text style={styles.addButtonText}>+ Subjek</Text>
          </Pressable>
        </View>

        {subjects.map((subject, index) => (
          <View key={subject.id} style={styles.subjectCard}>
            <View style={styles.subjectHeading}>
              <Text style={styles.subjectTitle}>Subjek {index + 1}</Text>
              {subjects.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Padam subjek ${index + 1}`}
                  onPress={() => removeSubject(subject.id)}
                  style={styles.removeButton}>
                  <Text style={styles.removeText}>Padam</Text>
                </Pressable>
              ) : null}
            </View>
            <TextInput
              accessibilityLabel={`Nama subjek ${index + 1}`}
              onChangeText={(value) => updateSubject(subject.id, 'name', value)}
              placeholder="Nama atau kod subjek"
              placeholderTextColor="#737B98"
              style={styles.input}
              value={subject.name}
            />
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Kredit</Text>
                <TextInput
                  accessibilityLabel={`Kredit subjek ${index + 1}`}
                  keyboardType="decimal-pad"
                  onChangeText={(value) => updateSubject(subject.id, 'credits', value)}
                  placeholder="3"
                  placeholderTextColor="#737B98"
                  style={styles.input}
                  value={subject.credits}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Mata gred (0.00–4.00)</Text>
                <TextInput
                  accessibilityLabel={`Mata gred subjek ${index + 1}`}
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
          <Text style={styles.resultLabel}>CGPA TERKINI</Text>
          <Text style={styles.resultValue}>
            {'cumulativeGpa' in calculation && calculation.cumulativeGpa !== undefined
              ? formatGpa(calculation.cumulativeGpa)
              : '—'}
          </Text>
          <View style={styles.resultDetails}>
            <Text style={styles.resultDetail}>
              GPA semester: {'semesterGpa' in calculation && calculation.semesterGpa !== undefined
                ? formatGpa(calculation.semesterGpa)
                : '—'}
            </Text>
            <Text style={styles.resultDetail}>
              Jumlah kredit: {'totalCredits' in calculation && calculation.totalCredits !== undefined
                ? calculation.totalCredits
                : '—'}
            </Text>
          </View>
        </View>
        <Text style={styles.note}>
          Formula: (CGPA terdahulu × kredit terdahulu + jumlah mata gred semester) ÷ jumlah kredit terkumpul.
          Masukkan nilai mata gred mengikut skala institusi anda.
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

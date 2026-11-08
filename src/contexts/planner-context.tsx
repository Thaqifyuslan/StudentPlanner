import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

export type Course = {
  id: string;
  code: string;
  name: string;
  day: string;
  time: string;
  room: string;
  lecturer: string;
  color: string;
};

export type Assignment = {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  priority: string;
  status: 'Pending' | 'DONE';
};

type PlannerContextValue = {
  courses: Course[];
  assignments: Assignment[];
  isLoading: boolean;
  storageError: string | null;
  addCourse: (course: Pick<Course, 'code' | 'name' | 'day' | 'room'>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addAssignment: (title: string, course: string) => Promise<void>;
  toggleAssignment: (id: string) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
};

type ScheduleRow = {
  id: string;
  kod_subjek: string;
  nama_subjek: string;
  pensyarah: string;
  bilik: string;
  hari: string;
  masa: string;
  kod_warna: string;
};

type TaskRow = {
  id: string;
  tajuk: string;
  course: string;
  due_date: string;
  priority: string;
  is_done: boolean;
};

const PlannerContext = createContext<PlannerContextValue | null>(null);

function mapCourse(row: ScheduleRow): Course {
  return {
    id: row.id,
    code: row.kod_subjek,
    name: row.nama_subjek,
    lecturer: row.pensyarah,
    room: row.bilik,
    day: row.hari,
    time: row.masa,
    color: row.kod_warna,
  };
}

function mapAssignment(row: TaskRow): Assignment {
  return {
    id: row.id,
    title: row.tajuk,
    course: row.course,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.is_done ? 'DONE' : 'Pending',
  };
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  const refresh = useCallback(async (activeUserId: string) => {
    const [scheduleResult, taskResult] = await Promise.all([
      supabase
        .from('schedules')
        .select('id,kod_subjek,nama_subjek,pensyarah,bilik,hari,masa,kod_warna')
        .eq('user_id', activeUserId)
        .order('created_at', { ascending: true }),
      supabase
        .from('tasks')
        .select('id,tajuk,course,due_date,priority,is_done')
        .eq('user_id', activeUserId)
        .order('created_at', { ascending: false }),
    ]);
    if (scheduleResult.error) throw scheduleResult.error;
    if (taskResult.error) throw taskResult.error;

    return {
      courses: (scheduleResult.data ?? []).map((row) => mapCourse(row as ScheduleRow)),
      assignments: (taskResult.data ?? []).map((row) => mapAssignment(row as TaskRow)),
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!userId) return;

    const handleRefresh = () => {
      void refresh(userId)
        .then((data) => {
          if (!active) return;
          setCourses(data.courses);
          setAssignments(data.assignments);
          setStorageError(null);
        })
        .catch((error: unknown) => {
          console.error('Gagal memuat data planner dari Supabase:', error);
          if (active) setStorageError('Data planner tidak dapat dimuat. Semak sambungan Supabase.');
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    };

    handleRefresh();
    const channel = supabase
      .channel(`planner:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules', filter: `user_id=eq.${userId}` },
        handleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        handleRefresh,
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  const addCourse = useCallback(
    async (course: Pick<Course, 'code' | 'name' | 'day' | 'room'>) => {
      if (!userId) throw new Error('Log masuk diperlukan untuk menyimpan jadual.');
      const { data, error } = await supabase
        .from('schedules')
        .insert({
          user_id: userId,
          kod_subjek: course.code,
          nama_subjek: course.name,
          pensyarah: 'Pensyarah',
          bilik: course.room,
          hari: course.day,
          masa: '09:00 AM',
          kod_warna: '#6C5CE7',
        })
        .select('id,kod_subjek,nama_subjek,pensyarah,bilik,hari,masa,kod_warna')
        .single();
      if (error) throw error;
      const savedCourse = mapCourse(data as ScheduleRow);
      setCourses((current) => [...current, savedCourse]);
      setStorageError(null);
    },
    [userId],
  );

  const deleteCourse = useCallback(
    async (id: string) => {
      if (!userId) throw new Error('Log masuk diperlukan untuk memadam jadual.');
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      setCourses((current) => current.filter((course) => course.id !== id));
      setStorageError(null);
    },
    [userId],
  );

  const addAssignment = useCallback(
    async (title: string, course: string) => {
      if (!userId) throw new Error('Log masuk diperlukan untuk menyimpan tugasan.');
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          tajuk: title,
          course,
          due_date: 'Akan Datang',
          priority: 'High',
        })
        .select('id,tajuk,course,due_date,priority,is_done')
        .single();
      if (error) throw error;
      const savedAssignment = mapAssignment(data as TaskRow);
      setAssignments((current) => [savedAssignment, ...current]);
      setStorageError(null);
    },
    [userId],
  );

  const toggleAssignment = useCallback(
    async (id: string) => {
      if (!userId) throw new Error('Log masuk diperlukan untuk mengemas kini tugasan.');
      const assignment = assignments.find((item) => item.id === id);
      if (!assignment) return;
      const isDone = assignment.status !== 'DONE';
      const { error } = await supabase
        .from('tasks')
        .update({ is_done: isDone })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      setAssignments((current) =>
        current.map((item) => (item.id === id ? { ...item, status: isDone ? 'DONE' : 'Pending' } : item)),
      );
      setStorageError(null);
    },
    [assignments, userId],
  );

  const deleteAssignment = useCallback(
    async (id: string) => {
      if (!userId) throw new Error('Log masuk diperlukan untuk memadam tugasan.');
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      setAssignments((current) => current.filter((assignment) => assignment.id !== id));
      setStorageError(null);
    },
    [userId],
  );

  const value = useMemo(
    () => ({
      courses,
      assignments,
      isLoading,
      storageError,
      addCourse,
      deleteCourse,
      addAssignment,
      toggleAssignment,
      deleteAssignment,
    }),
    [
      courses,
      assignments,
      isLoading,
      storageError,
      addCourse,
      deleteCourse,
      addAssignment,
      toggleAssignment,
      deleteAssignment,
    ],
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (context === null) {
    throw new Error('usePlanner mesti digunakan di dalam PlannerProvider.');
  }
  return context;
}

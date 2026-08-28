/**
 * TeacherDashboard — Teacher Progress View
 *
 * Protected route for users with role='teacher'.
 * Shows a list of students with their progress data.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, createShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/hooks/useAuth';
import { getSupabase } from '@/src/lib/supabase';

interface StudentProgress {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  level: number | null;
  specialty: string | null;
  status: string | null;
  last_activity: string | null;
}

export default function TeacherDashboard() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    // Redirect if not a teacher
    if (user && user.user_metadata?.role !== 'teacher') {
      router.replace('/(tabs)');
      return;
    }

    fetchStudents();
  }, [user, authLoading]);

  const fetchStudents = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          role,
          pedagogical_progress (
            specialty,
            level,
            status,
            completed_at
          )
        `)
        .eq('role', 'student');

      if (error) {
        console.warn('Failed to fetch students:', error.message);
        setLoading(false);
        return;
      }

      const mapped: StudentProgress[] = (data ?? []).map((profile: any) => {
        const progress = profile.pedagogical_progress ?? [];
        const latestProgress = progress.length > 0
          ? progress.reduce((latest: any, p: any) =>
              !latest || (p.completed_at && p.completed_at > latest.completed_at) ? p : latest
            , null)
          : null;

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: null,
          role: profile.role,
          level: latestProgress?.level ?? null,
          specialty: latestProgress?.specialty ?? null,
          status: latestProgress?.status ?? null,
          last_activity: latestProgress?.completed_at ?? null,
        };
      });

      setStudents(mapped);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.skyLight }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.clinicalBlue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.skyLight }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.deepSlate }]}>Panel Docente</Text>
        <Text style={[styles.subtitle, { color: colors.neutral }]}>
          {students.length} estudiantes
        </Text>
      </View>

      {students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.neutral }]}>
            No hay estudiantes registrados
          </Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.studentCard, { backgroundColor: colors.surface }]}>
              <View style={styles.studentInfo}>
                <Text style={[styles.studentName, { color: colors.deepSlate }]}>
                  {item.full_name ?? 'Estudiante'}
                </Text>
                <Text style={[styles.studentDetail, { color: colors.neutral }]}>
                  {item.specialty ?? 'Sin especialidad'} · Nivel {item.level ?? '-'}
                </Text>
                <Text style={[styles.studentDetail, { color: colors.neutral }]}>
                  Estado: {item.status ?? 'Sin actividad'}
                </Text>
                {item.last_activity && (
                  <Text style={[styles.studentDate, { color: colors.neutral }]}>
                    Última actividad: {new Date(item.last_activity).toLocaleDateString('es-ES')}
                  </Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  studentCard: {
    borderRadius: 16,
    padding: 16,
    ...createShadow(2, 8, '#000000', 0.05),
    elevation: 2,
  },
  studentInfo: {
    gap: 4,
  },
  studentName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
  },
  studentDetail: {
    fontFamily: 'Inter',
    fontSize: 13,
  },
  studentDate: {
    fontFamily: 'Inter',
    fontSize: 11,
    marginTop: 4,
  },
});

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
  FlatList,
  ActivityIndicator,
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
  }, [user, authLoading, router]);

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
            specialty_id,
            level,
            status,
            completed_at,
            specialties (
              name
            )
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
          specialty: latestProgress?.specialties?.name ?? null,
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
      <SafeAreaView className="flex-1 bg-sky-light">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.clinicalBlue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sky-light">
      <View className="px-6 py-4">
        <Text className="font-heading-bold text-2xl text-deep-slate">Panel Docente</Text>
        <Text className="mt-1 font-sans text-sm text-neutral">
          {students.length} estudiantes
        </Text>
      </View>

      {students.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-sm text-neutral">
            No hay estudiantes registrados
          </Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}
          renderItem={({ item }) => (
            <View
              className="rounded-xl bg-surface p-4"
              style={{ ...createShadow(2, 8, '#000000', 0.05), elevation: 2 }}
            >
              <View className="gap-1">
                <Text className="font-heading-bold text-base text-deep-slate">
                  {item.full_name ?? 'Estudiante'}
                </Text>
                <Text className="font-sans text-[13px] text-neutral">
                  {item.specialty ?? 'Sin especialidad'} · Nivel {item.level ?? '-'}
                </Text>
                <Text className="font-sans text-[13px] text-neutral">
                  Estado: {item.status ?? 'Sin actividad'}
                </Text>
                {item.last_activity && (
                  <Text className="mt-1 font-sans text-[11px] text-neutral">
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

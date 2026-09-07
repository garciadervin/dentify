import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { getSupabase } from '@/src/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSaveProfile = async () => {
    setError(null);

    const role = (user?.user_metadata?.role as 'student' | 'teacher') ?? 'student';

    if (!fullName.trim()) {
      setError('Escribe tu nombre completo');
      return;
    }
    if (role === 'student' && !studentId.trim()) {
      setError('Completa el ID de estudiante');
      return;
    }

    if (!user) {
      setError('Debes iniciar sesión primero');
      return;
    }

    setSubmitting(true);

    const supabase = getSupabase();
    if (!supabase) {
      setError('Error de conexión');
      setSubmitting(false);
      return;
    }

    // Mirror the name into user_metadata (avatars, guards) and profiles.
    await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });

    // Upsert so revisiting this screen after a partial setup does not fail
    // on a duplicate primary key (profiles.id references auth.users.id).
    const { error: dbError } = await (supabase.from('profiles') as any).upsert(
      {
        id: user.id,
        full_name: fullName.trim(),
        student_id: role === 'student' ? studentId.trim() || null : null,
        role,
      },
      { onConflict: 'id' }
    );

    setSubmitting(false);

    if (dbError) {
      setError(dbError.message);
    } else {
      await refreshProfile(user.id);
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sky-light" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full">
          {/* Header */}
          <View className="mb-10 items-center">
            <Text className="mb-2 font-heading-bold text-[32px] text-deep-slate">
              Tu perfil
            </Text>
            <Text className="font-sans text-[16px] text-neutral">
              Completa tu información
            </Text>
          </View>

          {/* Error message */}
          {error && (
            <View className="mb-4 rounded-[12px] bg-[#FEE2E2] p-3">
              <Text className="font-sans text-[14px] text-[#DC2626]">
                {error}
              </Text>
            </View>
          )}

          {/* Full name input */}
          <View className="mb-4">
            <Text className="mb-1.5 font-sans text-[14px] text-deep-slate">
              Nombre completo
            </Text>
            <TextInput
              testID="fullname-input"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Dr. Juan Pérez"
              placeholderTextColor={colors.neutral}
              autoCapitalize="words"
              className="rounded-[12px] border border-border-light bg-surface p-4 font-sans text-[16px] text-deep-slate"
            />
          </View>

          {/* Student ID input (solo estudiantes) */}
          {(user?.user_metadata?.role ?? 'student') === 'student' ? (
            <View className="mb-6">
              <Text className="mb-1.5 font-sans text-[14px] text-deep-slate">
                ID de estudiante
              </Text>
              <TextInput
                testID="student-id-input"
                value={studentId}
                onChangeText={setStudentId}
                placeholder="STU-2024-001"
                placeholderTextColor={colors.neutral}
                autoCapitalize="characters"
                className="rounded-[12px] border border-border-light bg-surface p-4 font-sans text-[16px] text-deep-slate"
              />
            </View>
          ) : (
            <View className="mb-6">
              <Text className="font-sans text-[13px] text-neutral">
                Registrarás tu cuenta como docente. Verás el panel de seguimiento de estudiantes.
              </Text>
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            testID="save-profile-button"
            onPress={handleSaveProfile}
            disabled={submitting}
            activeOpacity={0.8}
            className={`items-center rounded-[12px] p-4 ${
              submitting ? 'bg-neutral' : 'bg-clinical-blue'
            }`}
          >
            <Text className="font-inter-semibold text-[16px] text-white">
              {submitting ? 'Guardando...' : 'Guardar perfil'}
            </Text>
          </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

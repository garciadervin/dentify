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
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSaveProfile = async () => {
    setError(null);

    if (!fullName.trim() || !studentId.trim()) {
      setError('Completa todos los campos');
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

    // Upsert so revisiting this screen after a partial setup does not fail
    // on a duplicate primary key (profiles.id references auth.users.id).
    const { error: dbError } = await (supabase.from('profiles') as any).upsert(
      {
        id: user.id,
        full_name: fullName.trim(),
        student_id: studentId.trim() || null,
        role: 'student',
      },
      { onConflict: 'id' }
    );

    setSubmitting(false);

    if (dbError) {
      setError(dbError.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.skyLight }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{ marginBottom: 40, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'Manrope-Bold',
                fontSize: 32,
                color: colors.deepSlate,
                marginBottom: 8,
              }}
            >
              Tu perfil
            </Text>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 16,
                color: colors.neutral,
              }}
            >
              Completa tu información
            </Text>
          </View>

          {/* Error message */}
          {error && (
            <View
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#DC2626', fontFamily: 'Inter', fontSize: 14 }}>
                {error}
              </Text>
            </View>
          )}

          {/* Full name input */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 14,
                color: colors.deepSlate,
                marginBottom: 6,
              }}
            >
              Nombre completo
            </Text>
            <TextInput
              testID="fullname-input"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Dr. Juan Pérez"
              placeholderTextColor={colors.neutral}
              autoCapitalize="words"
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                fontFamily: 'Inter',
                color: colors.deepSlate,
                borderWidth: 1,
                borderColor: colors.borderLight,
              }}
            />
          </View>

          {/* Student ID input */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 14,
                color: colors.deepSlate,
                marginBottom: 6,
              }}
            >
              ID de estudiante
            </Text>
            <TextInput
              testID="student-id-input"
              value={studentId}
              onChangeText={setStudentId}
              placeholder="STU-2024-001"
              placeholderTextColor={colors.neutral}
              autoCapitalize="characters"
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                fontFamily: 'Inter',
                color: colors.deepSlate,
                borderWidth: 1,
                borderColor: colors.borderLight,
              }}
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            testID="save-profile-button"
            onPress={handleSaveProfile}
            disabled={submitting}
            activeOpacity={0.8}
            style={{
              backgroundColor: submitting ? colors.neutral : colors.clinicalBlue,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 16,
                color: '#FFFFFF',
              }}
            >
              {submitting ? 'Guardando...' : 'Guardar perfil'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/src/hooks/useAuth';
import { getSupabase } from '@/src/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Role = 'student' | 'teacher';

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSubmitting(true);
    const { error: signUpError, needsConfirmation } = await signUp(email.trim(), password, role);
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError);
    } else if (needsConfirmation) {
      // Email confirmation enabled: no session yet — show the confirm view.
      setRegisteredEmail(email.trim());
    } else {
      router.push('/auth/profile-setup');
    }
  };

  const handleResend = async () => {
    if (!registeredEmail || resending) return;
    setResending(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { error: resendError } = supabase
        ? await supabase.auth.resend({ type: 'signup', email: registeredEmail })
        : { error: { message: 'Supabase no está configurado' } };
      if (resendError) {
        setError(resendError.message);
      } else {
        setError(null);
      }
    } finally {
      setResending(false);
    }
  };

  if (registeredEmail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.skyLight }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#0077B614', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="email-check-outline" size={40} color={colors.clinicalBlue} />
          </View>
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 26, color: colors.deepSlate, textAlign: 'center' }}>
            Revisa tu correo
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 15, color: colors.neutral, textAlign: 'center', lineHeight: 22 }}>
            Te enviamos un enlace de confirmación a{' '}
            <Text style={{ fontFamily: 'Inter-Bold', color: colors.deepSlate }}>{registeredEmail}</Text>.
            {'\n'}Confirma tu cuenta y luego inicia sesión.
          </Text>
          {error && (
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: '#DC2626', textAlign: 'center' }}>{error}</Text>
          )}
          <TouchableOpacity
            testID="resend-email"
            onPress={handleResend}
            disabled={resending}
            style={{
              backgroundColor: colors.clinicalBlue,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              alignSelf: 'stretch',
              marginTop: 8,
            }}
          >
            <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#FFFFFF' }}>
              {resending ? 'Enviando...' : 'Reenviar correo de confirmación'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/auth/login')} style={{ paddingVertical: 10 }}>
            <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.clinicalBlue }}>
              Iniciar sesión
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={{ width: '100%' }}>
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
              Registro
            </Text>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 16,
                color: colors.neutral,
              }}
            >
              Crea tu cuenta en Dentify
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

          {/* Email input */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 13,
                color: colors.deepSlate,
                marginBottom: 6,
              }}
            >
              Correo electrónico
            </Text>
            <TextInput
              testID="reg-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor={colors.neutral}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 14,
                fontSize: 15,
                fontFamily: 'Inter',
                color: colors.deepSlate,
                borderWidth: 2,
                borderColor: emailFocused ? colors.clinicalBlue : colors.borderLight,
                borderBottomWidth: 4.5,
              }}
            />
          </View>

          {/* Password input */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 13,
                color: colors.deepSlate,
                marginBottom: 6,
              }}
            >
              Contraseña
            </Text>
            <TextInput
              testID="reg-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.neutral}
              secureTextEntry
              autoCapitalize="none"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 14,
                fontSize: 15,
                fontFamily: 'Inter',
                color: colors.deepSlate,
                borderWidth: 2,
                borderColor: passwordFocused ? colors.clinicalBlue : colors.borderLight,
                borderBottomWidth: 4.5,
              }}
            />
          </View>

          {/* Confirm password input */}
          <View style={{ marginBottom: 26 }}>
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 13,
                color: colors.deepSlate,
                marginBottom: 6,
              }}
            >
              Confirmar contraseña
            </Text>
            <TextInput
              testID="reg-confirm-input"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.neutral}
              secureTextEntry
              autoCapitalize="none"
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 14,
                fontSize: 15,
                fontFamily: 'Inter',
                color: colors.deepSlate,
                borderWidth: 2,
                borderColor: confirmFocused ? colors.clinicalBlue : colors.borderLight,
                borderBottomWidth: 4.5,
              }}
            />
          </View>

          {/* Rol */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 13,
                color: colors.deepSlate,
                marginBottom: 8,
              }}
            >
              Me registro como
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['student', 'teacher'] as Role[]).map((r) => {
                const selected = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    testID={`role-${r}`}
                    onPress={() => setRole(r)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderRadius: 14,
                      borderWidth: 2,
                      backgroundColor: selected ? colors.clinicalBlue : colors.surface,
                      borderColor: selected ? '#005C8A' : colors.borderLight,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={r === 'student' ? 'school-outline' : 'account-tie'}
                      size={20}
                      color={selected ? '#FFFFFF' : colors.neutral}
                    />
                    <Text
                      style={{
                        fontFamily: 'Inter-SemiBold',
                        fontSize: 13,
                        color: selected ? '#FFFFFF' : colors.deepSlate,
                        marginTop: 4,
                      }}
                    >
                      {r === 'student' ? 'Estudiante' : 'Docente'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Register button */}
          <TouchableOpacity
            testID="register-button"
            onPress={handleRegister}
            disabled={submitting}
            activeOpacity={0.8}
            style={{
              backgroundColor: submitting ? colors.neutral : colors.clinicalBlue,
              borderColor: submitting ? colors.neutral : '#005C8A',
              borderWidth: 1,
              borderBottomWidth: submitting ? 1 : 5,
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter-Bold',
                fontSize: 16,
                color: '#FFFFFF',
              }}
            >
              {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </Text>
          </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

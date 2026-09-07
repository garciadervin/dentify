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

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    const { error: signUpError, needsConfirmation } = await signUp(email.trim(), password);
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
      <SafeAreaView className="flex-1 bg-sky-light" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <View className="h-[88px] w-[88px] items-center justify-center rounded-[44px] bg-[#0077B614]">
            <MaterialCommunityIcons name="email-check-outline" size={40} color={colors.clinicalBlue} />
          </View>
          <Text className="text-center font-heading-bold text-[26px] text-deep-slate">
            Revisa tu correo
          </Text>
          <Text className="text-center font-sans text-[15px] leading-[22px] text-neutral">
            Te enviamos un enlace de confirmación a{' '}
            <Text className="font-inter-bold text-deep-slate">{registeredEmail}</Text>.
            {'\n'}Confirma tu cuenta y luego inicia sesión.
          </Text>
          {error && (
            <Text className="text-center font-sans text-[13px] text-[#DC2626]">{error}</Text>
          )}
          <TouchableOpacity
            testID="resend-email"
            onPress={handleResend}
            disabled={resending}
            className="mt-2 items-center self-stretch rounded-[14px] bg-clinical-blue py-3.5"
          >
            <Text className="font-inter-semibold text-[15px] text-white">
              {resending ? 'Enviando...' : 'Reenviar correo de confirmación'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/auth/login')} className="py-2.5">
            <Text className="font-inter-semibold text-[14px] text-clinical-blue">
              Iniciar sesión
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
              Registro
            </Text>
            <Text className="font-sans text-[16px] text-neutral">
              Crea tu cuenta en Dentify
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

          {/* Email input */}
          <View className="mb-[18px]">
            <Text className="mb-1.5 font-inter-semibold text-[13px] text-deep-slate">
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
              className={`rounded-[14px] border-2 border-b-[4.5px] bg-surface p-3.5 font-sans text-[15px] text-deep-slate ${
                emailFocused ? 'border-clinical-blue' : 'border-border-light'
              }`}
            />
          </View>

          {/* Password input */}
          <View className="mb-[18px]">
            <Text className="mb-1.5 font-inter-semibold text-[13px] text-deep-slate">
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
              className={`rounded-[14px] border-2 border-b-[4.5px] bg-surface p-3.5 font-sans text-[15px] text-deep-slate ${
                passwordFocused ? 'border-clinical-blue' : 'border-border-light'
              }`}
            />
          </View>

          {/* Confirm password input */}
          <View className="mb-[26px]">
            <Text className="mb-1.5 font-inter-semibold text-[13px] text-deep-slate">
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
              className={`rounded-[14px] border-2 border-b-[4.5px] bg-surface p-3.5 font-sans text-[15px] text-deep-slate ${
                confirmFocused ? 'border-clinical-blue' : 'border-border-light'
              }`}
            />
          </View>

          {/* Teacher note — no self-service teacher accounts (privilege escalation) */}
          <View className="mb-6 flex-row items-center gap-2.5 rounded-[14px] border border-border-light bg-surface p-3.5">
            <MaterialCommunityIcons
              name="account-tie-outline"
              size={20}
              color={colors.clinicalBlue}
            />
            <Text className="flex-1 font-sans text-[12px] leading-[17px] text-neutral">
              Esta cuenta se crea como estudiante. Si eres docente, tu acceso
              docente es activado por el coordinador del programa.
            </Text>
          </View>

          {/* Register button */}
          <TouchableOpacity
            testID="register-button"
            onPress={handleRegister}
            disabled={submitting}
            activeOpacity={0.8}
            className={`mb-5 items-center rounded-[16px] border p-4 ${
              submitting
                ? 'border-neutral bg-neutral'
                : 'border-b-[5px] border-clinical-dark bg-clinical-blue'
            }`}
          >
            <Text className="font-inter-bold text-[16px] text-white">
              {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </Text>
          </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

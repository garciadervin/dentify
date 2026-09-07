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
import { useRouter, Link } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (signInError) {
      setError(signInError);
    } else {
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
              Dentify
            </Text>
            <Text className="font-sans text-[16px] text-neutral">
              Inicia sesión para continuar
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
              testID="email-input"
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
          <View className="mb-[26px]">
            <Text className="mb-1.5 font-inter-semibold text-[13px] text-deep-slate">
              Contraseña
            </Text>
            <TextInput
              testID="password-input"
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

          {/* Login button */}
          <TouchableOpacity
            testID="login-button"
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.8}
            className={`mb-5 items-center rounded-[16px] border p-4 ${
              submitting
                ? 'border-neutral bg-neutral'
                : 'border-b-[5px] border-clinical-dark bg-clinical-blue'
            }`}
          >
            <Text className="font-inter-bold text-[16px] text-white">
              {submitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Text>
          </TouchableOpacity>

          {/* Register link */}
          <View className="items-center">
            <Text className="font-sans text-[14px] text-neutral">
              ¿No tienes cuenta?{' '}
              <Link href="/auth/register" asChild>
                <TouchableOpacity>
                  <Text className="font-inter-bold text-[14px] text-clinical-blue">
                    Crear cuenta
                  </Text>
                </TouchableOpacity>
              </Link>
            </Text>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

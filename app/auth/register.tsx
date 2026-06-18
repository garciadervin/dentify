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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    const { error: signUpError } = await signUp(email.trim(), password);
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError);
    } else {
      router.push('/auth/profile-setup');
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
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 14,
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

          {/* Password input */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 14,
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

          {/* Confirm password input */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 14,
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

          {/* Register button */}
          <TouchableOpacity
            testID="register-button"
            onPress={handleRegister}
            disabled={submitting}
            activeOpacity={0.8}
            style={{
              backgroundColor: submitting ? colors.neutral : colors.clinicalBlue,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 16,
                color: '#FFFFFF',
              }}
            >
              {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

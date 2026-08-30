import '../global.css';
// Configure Three.js for React Native (Worker mock, DRACOLoader)
import '@/src/lib/threeConfig';

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { View, ActivityIndicator } from 'react-native';
import Head from 'expo-router/head';

import { useAuth } from '@/src/hooks/useAuth';
import { Colors } from '@/constants/theme';
import { configureNotifications } from '@/src/services/notifications';

// Prevent splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, profileLoaded, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colors = Colors.light;

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = segments[0] === 'auth';
    const isProfileSetup = isAuthRoute && segments[1] === 'profile-setup';
    const isTeacherRoute = segments[0] === '(teacher)';
    const userRole = user?.user_metadata?.role;

    if (!user && !isAuthRoute) {
      router.replace('/auth/login');
    } else if (user && isAuthRoute && !isProfileSetup) {
      // Allow /auth/profile-setup with a session (sign-up flow).
      router.replace('/(tabs)');
    } else if (user && !isAuthRoute && !isTeacherRoute && profileLoaded && !profile) {
      // First login without a created profile → complete the profile.
      router.replace('/auth/profile-setup');
    } else if (isTeacherRoute && userRole !== 'teacher') {
      router.replace('/(tabs)');
    }
  }, [user, profile, profileLoaded, loading, segments]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.skyLight,
        }}
      >
        <ActivityIndicator size="large" color={colors.clinicalBlue} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    'Inter': require('@/assets/fonts/Inter-Regular.ttf'),
    'Inter-SemiBold': require('@/assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('@/assets/fonts/Inter-Bold.ttf'),
    'Manrope': require('@/assets/fonts/Manrope-Regular.ttf'),
    'Manrope-Bold': require('@/assets/fonts/Manrope-Bold.ttf'),
  });

  useEffect(() => {
    configureNotifications();
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Head>
        <title>Dentify — Aprendizaje Dental Clínico</title>
        <meta name="description" content="Dentify es una plataforma interactiva de aprendizaje dental con simulador 3D, quizzes clínicos y asistente IA especializado en odontología." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Dentify — Aprendizaje Dental Clínico" />
        <meta property="og:description" content="Plataforma interactiva de aprendizaje dental con simulador 3D, quizzes clínicos y asistente IA." />
        <meta property="og:type" content="website" />
      </Head>
      <AuthGuard>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(teacher)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="quiz" options={{ headerShown: false }} />
        </Stack>
      </AuthGuard>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

/**
 * AppHeader — Dentify top bar.
 *
 * Variants:
 * - `home` (default): logo Dentify + avatar → /profile
 * - `title`: left-aligned title (tab screens)
 * - `back`: back button + title (stacked screens)
 * - `bot`: bot avatar + "Denty-AI" + "Online" status
 */

import React, { type ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';

interface AppHeaderProps {
  variant?: 'home' | 'title' | 'back' | 'bot';
  title?: string;
  subtitle?: string;
  /** Status that accompanies the title (e.g. "Online · Based on UNERG manuals"). */
  status?: string;
  onBack?: () => void;
  /** Optional right slot (e.g. download button in the simulator). */
  right?: ReactNode;
}

export default function AppHeader({
  variant = 'home',
  title,
  subtitle,
  status,
  onBack,
  right,
}: AppHeaderProps) {
  const { user, profile } = useAuth();
  const router = useRouter();

  const fullName =
    profile?.full_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    'Estudiante';
  const initial = fullName.charAt(0).toUpperCase();

  const goBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Screens render AppHeader inside a ScreenContainer that already applies the
  // top safe-area inset; wrapping the header in another SafeAreaView would
  // double the status-bar padding on every screen.
  return (
    <View testID="app-header" className="bg-[#FFFFFFE6]">
      <View className="h-[60px] flex-row items-center gap-3 px-6">
        {variant === 'home' && (
          <>
            <View className="flex-1 flex-row items-center gap-1.5">
              <View className="h-2.5 w-2.5 rounded-full bg-clinical-blue" />
              <Text className="font-heading-bold text-[22px] text-clinical-blue">Dentify</Text>
              {subtitle && <Text className="ml-1 font-inter-semibold text-[11px] uppercase tracking-[0.6px] text-neutral">{subtitle}</Text>}
            </View>
            <TouchableOpacity
              testID="user-avatar"
              className="h-9 w-9 items-center justify-center rounded-full bg-clinical-blue"
              onPress={() => router.push('/profile')}
              accessibilityLabel={`Perfil de ${fullName}`}
              accessibilityRole="button"
            >
              <Text className="font-heading-bold text-[15px] text-white">{initial}</Text>
            </TouchableOpacity>
          </>
        )}

        {variant === 'title' && (
          <>
            <View className="flex-1">
              <Text className="font-heading-bold text-lg text-deep-slate">{title}</Text>
              {subtitle && <Text className="mt-px font-inter-semibold text-[11px] uppercase tracking-[0.6px] text-neutral">{subtitle}</Text>}
            </View>
            {right}
          </>
        )}

        {variant === 'back' && (
          <>
            <TouchableOpacity
              testID="header-back"
              onPress={goBack}
              className="-ml-2 h-8 w-8 items-center justify-center"
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={26}
                color={Colors.deepSlate}
              />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="font-heading-bold text-lg text-deep-slate">{title}</Text>
              {subtitle && <Text className="mt-px font-inter-semibold text-[11px] uppercase tracking-[0.6px] text-neutral">{subtitle}</Text>}
            </View>
            {right}
          </>
        )}

        {variant === 'bot' && (
          <>
            <View className="h-8 w-8 items-center justify-center rounded-full bg-clinical-blue">
              <MaterialCommunityIcons
                name="creation"
                size={15}
                color="#FFFFFF"
              />
            </View>
            <View className="flex-1">
              <Text className="font-heading-bold text-lg text-deep-slate">{title ?? 'Denty-AI'}</Text>
              <Text className="mt-px font-sans text-[11px] text-success-teal">
                {status ?? 'En línea · Basado en manuales UNERG'}
              </Text>
            </View>
            {right}
            <TouchableOpacity
              testID="user-avatar"
              className="h-9 w-9 items-center justify-center rounded-full bg-clinical-blue"
              onPress={() => router.push('/profile')}
              accessibilityLabel={`Perfil de ${fullName}`}
              accessibilityRole="button"
            >
              <Text className="font-heading-bold text-[15px] text-white">{initial}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

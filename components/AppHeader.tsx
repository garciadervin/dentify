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
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View testID="app-header" style={styles.bar}>
        {variant === 'home' && (
          <>
            <View style={styles.logoGroup}>
              <View style={styles.logoDot} />
              <Text style={styles.logo}>Dentify</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <TouchableOpacity
              testID="user-avatar"
              style={styles.avatar}
              onPress={() => router.push('/profile' as any)}
              accessibilityLabel={`Perfil de ${fullName}`}
              accessibilityRole="button"
            >
              <Text style={styles.avatarInitial}>{initial}</Text>
            </TouchableOpacity>
          </>
        )}

        {variant === 'title' && (
          <>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.titleSubtitle}>{subtitle}</Text>}
            </View>
            {right}
          </>
        )}

        {variant === 'back' && (
          <>
            <TouchableOpacity
              testID="header-back"
              onPress={goBack}
              style={styles.backButton}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={26}
                color={Colors.deepSlate}
              />
            </TouchableOpacity>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.titleSubtitle}>{subtitle}</Text>}
            </View>
            {right}
          </>
        )}

        {variant === 'bot' && (
          <>
            <View style={styles.botAvatar}>
              <MaterialCommunityIcons
                name="creation"
                size={15}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{title ?? 'Denty-AI'}</Text>
              <Text style={styles.botStatus}>
                {status ?? 'En línea · Basado en manuales UNERG'}
              </Text>
            </View>
            {right}
            <TouchableOpacity
              testID="user-avatar"
              style={styles.avatar}
              onPress={() => router.push('/profile' as any)}
              accessibilityLabel={`Perfil de ${fullName}`}
              accessibilityRole="button"
            >
              <Text style={styles.avatarInitial}>{initial}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFFE6',
  },
  bar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  logoGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.clinicalBlue,
  },
  logo: {
    fontFamily: 'Manrope-Bold',
    fontSize: 22,
    color: Colors.clinicalBlue,
  },
  subtitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: Colors.neutral,
    marginLeft: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.clinicalBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: Colors.deepSlate,
  },
  titleSubtitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: Colors.neutral,
    marginTop: 1,
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.clinicalBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botStatus: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: Colors.successTeal,
    marginTop: 1,
  },
});

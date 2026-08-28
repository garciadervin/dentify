/**
 * AppHeader — Barra superior de Dentify.
 *
 * - Logo "Dentify" en Manrope Bold a la izquierda
 * - Subtítulo de contexto (pantalla actual)
 * - Avatar circular con la inicial del usuario a la derecha
 * - Fondo blanco 85% opacidad con blur (BlurView) en iOS
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/hooks/useAuth';

interface AppHeaderProps {
  subtitle?: string;
  description?: string;
  /** Show back arrow instead of logo — for nested screens */
  showBack?: boolean;
}

export default function AppHeader({ subtitle, showBack }: AppHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const router = useRouter();

  const userName =
    user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'U';
  const initial = userName.charAt(0).toUpperCase();

  return (
    <SafeAreaView
      edges={['top']}
      style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(26,29,33,0.92)' : 'rgba(255,255,255,0.88)' }}
    >
      <View testID="app-header" style={styles.bar}>
        {/* Left: back button or logo */}
        {showBack ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.deepSlate} />
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={[styles.logo, { color: colors.clinicalBlue }]}>Dentify</Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.neutral }]}>{subtitle}</Text>
            )}
          </View>
        )}

        {/* Right: avatar */}
        <TouchableOpacity
          testID="user-avatar"
          style={[styles.avatar, { backgroundColor: colors.clinicalBlue }]}
          onPress={() => router.push('/(tabs)/explore')}
          accessibilityLabel={`Perfil de ${userName}`}
          accessibilityRole="button"
        >
          <Text style={styles.avatarInitial}>{initial}</Text>
        </TouchableOpacity>
      </View>
      {/* Separator line */}
      <View style={[styles.separator, { backgroundColor: colors.borderLight }]} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logo: {
    fontFamily: 'Manrope-Bold',
    fontSize: 22,
  },
  subtitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  avatarInitial: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  separator: {
    height: 1,
  },
});

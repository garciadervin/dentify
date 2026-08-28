/**
 * SpecialtyCard — Tappable card for a dental specialty.
 *
 * Navigates to /quiz/{specialty}-{level} when pressed (unless locked).
 * Displays name, current level, progress bar, and lock state.
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, createShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SpecialtyCardProps {
  name: string;
  level: number;
  progress: number;
  locked?: boolean;
  icon?: string;
}

const SPECIALTY_ICONS: Record<string, string> = {
  'Operatoria Dental': '🦷',
  'Endodoncia': '🔬',
  'Periodoncia': '🫀',
  'Ortodoncia': '😁',
  'Cirugía Oral': '🔪',
  'Prostodoncia': '🦿',
  'Odontopediatría': '👶',
  'Radiología': '📡',
  'Anatomía Dental': '📚',
};

/**
 * SpecialtyCard displays a dental specialty with its current level,
 * progress bar, and optional lock state. Tapping navigates to the quiz.
 */
export default function SpecialtyCard({ name, level, progress, locked, icon }: SpecialtyCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const emoji = icon ?? SPECIALTY_ICONS[name] ?? '📚';

  const handlePress = useCallback(() => {
    if (locked) return;
    router.push(`/quiz/${encodeURIComponent(`${name}-${level}`)}`);
  }, [router, name, level, locked]);

  // Get card-specific 3D styles
  const getCardStyle = () => {
    if (locked) {
      return {
        backgroundColor: colors.surface,
        borderColor: colors.borderLight,
        borderBottomWidth: 1,
        opacity: 0.6,
      };
    }
    if (progress >= 100) {
      return {
        backgroundColor: colors.surface,
        borderColor: colors.successTeal,
        borderBottomWidth: 5,
        shadowColor: colors.successTeal,
        shadowOpacity: 0.08,
      };
    }
    return {
      backgroundColor: colors.surface,
      borderColor: colors.clinicalBlue,
      borderBottomWidth: 5,
      shadowColor: colors.clinicalBlue,
      shadowOpacity: 0.08,
    };
  };

  return (
    <TouchableOpacity
      testID="specialty-card"
      style={[
        styles.card,
        getCardStyle(),
        {
          borderWidth: 2,
        },
      ]}
      onPress={handlePress}
      disabled={locked}
      activeOpacity={0.8}
      accessibilityLabel={`${name}, nivel ${level}${locked ? ', bloqueado' : ', toca para practicar'}`}
      accessibilityRole={locked ? 'text' : 'button'}
      accessibilityState={{ disabled: locked }}
    >
      {/* Emoji icon */}
      <Text style={styles.emoji}>{emoji}</Text>

      {/* Header row: name + lock */}
      <View style={styles.headerRow}>
        <Text
          testID="specialty-name"
          style={[styles.name, { color: colors.deepSlate }]}
          numberOfLines={2}
        >
          {name}
        </Text>
        {locked ? (
          <MaterialCommunityIcons
            testID="specialty-locked"
            name="lock-outline"
            size={14}
            color={colors.neutral}
          />
        ) : (
          <MaterialCommunityIcons
            name="chevron-right"
            size={14}
            color={colors.neutral}
            style={{ opacity: 0.5 }}
          />
        )}
      </View>

      {/* Level indicator */}
      <Text
        testID="specialty-level"
        style={[styles.levelText, { color: colors.neutral }]}
      >
        Nivel {level}
      </Text>

      {/* Progress bar */}
      <View
        testID="specialty-progress"
        style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(Math.max(progress, 0), 100)}%` as any,
              backgroundColor: locked ? colors.neutral : colors.clinicalBlue,
            },
          ]}
        />
      </View>

      {/* Progress label */}
      {!locked && (
        <Text style={[styles.progressLabel, { color: colors.neutral }]}>
          {progress}% completado
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    ...createShadow(2, 8, '#000000', 0.05),
    elevation: 2,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  name: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  levelText: {
    fontFamily: 'Inter',
    fontSize: 11,
    marginBottom: 10,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
  },
  progressLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    marginTop: 5,
  },
});

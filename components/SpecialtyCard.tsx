import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SpecialtyCardProps {
  name: string;
  level: number;
  progress: number;
  locked?: boolean;
}

/**
 * SpecialtyCard displays a dental specialty with its current level,
 * progress bar, and optional lock state.
 * Used in the Dashboard grid to show the student's learning status.
 */
export default function SpecialtyCard({ name, level, progress, locked }: SpecialtyCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        opacity: locked ? 0.6 : 1,
      }}
    >
      {/* Header row: name + lock icon */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          testID="specialty-name"
          style={{
            fontFamily: 'Inter-SemiBold',
            fontSize: 14,
            color: colors.deepSlate,
            flex: 1,
          }}
        >
          {name}
        </Text>
        {locked && (
          <Text testID="specialty-locked" style={{ fontSize: 16, marginLeft: 8 }}>
            🔒
          </Text>
        )}
      </View>

      {/* Level indicator */}
      <Text
        testID="specialty-level"
        style={{
          fontFamily: 'Inter',
          fontSize: 12,
          color: colors.neutral,
          marginTop: 4,
          marginBottom: 12,
        }}
      >
        Nivel {level}
      </Text>

      {/* Progress bar */}
      <View
        testID="specialty-progress"
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.borderLight,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.min(progress, 100)}%` as any,
            height: '100%',
            borderRadius: 3,
            backgroundColor: locked ? colors.neutral : colors.clinicalBlue,
          }}
        />
      </View>
    </View>
  );
}

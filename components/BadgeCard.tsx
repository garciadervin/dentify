/**
 * BadgeCard — Achievement badge display component
 *
 * Renders a badge card with full color when earned,
 * or grayscale with a lock overlay when locked.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface BadgeCardBadge {
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

interface BadgeCardProps {
  badge: BadgeCardBadge;
}

export default function BadgeCard({ badge }: BadgeCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const testId = badge.earned
    ? `badge-earned-${badge.name}`
    : `badge-locked-${badge.name}`;

  return (
    <View
      testID={testId}
      style={{
        width: 120,
        padding: 12,
        borderRadius: 16,
        backgroundColor: badge.earned ? colors.surface : colors.borderLight,
        alignItems: 'center',
        gap: 8,
        opacity: badge.earned ? 1 : 0.5,
        borderWidth: 1,
        borderColor: badge.earned ? colors.clinicalBlue : colors.borderLight,
      }}
    >
      {/* Icon area */}
      <View style={{ position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 28, opacity: badge.earned ? 1 : 0.4 }}>
          {badge.icon}
        </Text>
        {!badge.earned && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: colors.neutral,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '700' }}>🔒</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text
        style={{
          fontFamily: 'Inter-SemiBold',
          fontSize: 11,
          color: badge.earned ? colors.deepSlate : colors.neutral,
          textAlign: 'center',
        }}
        numberOfLines={2}
      >
        {badge.name}
      </Text>

      {/* Description */}
      <Text
        style={{
          fontFamily: 'Inter',
          fontSize: 9,
          color: colors.neutral,
          textAlign: 'center',
        }}
        numberOfLines={2}
      >
        {badge.description}
      </Text>
    </View>
  );
}

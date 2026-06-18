/**
 * MessageBubble — Chat message component
 *
 * Renders a single chat message with role-based alignment and styling.
 * Supports loading state with animated dots indicator.
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface MessageBubbleProps {
  text: string;
  role: 'user' | 'assistant';
  timestamp?: string;
  isLoading?: boolean;
}

export default function MessageBubble({
  text,
  role,
  timestamp,
  isLoading = false,
}: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isUser = role === 'user';

  return (
    <View
      testID={isUser ? 'bubble-user' : 'bubble-assistant'}
      style={{
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          maxWidth: '80%',
          backgroundColor: isUser ? colors.clinicalBlue : colors.surface,
          borderRadius: 16,
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius: isUser ? 16 : 4,
          paddingHorizontal: 16,
          paddingVertical: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {isLoading ? (
          <View testID="bubble-loading" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ActivityIndicator size="small" color={colors.neutral} />
            <Text style={{ color: colors.neutral, fontSize: 14, fontFamily: 'Inter' }}>
              Pensando...
            </Text>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 15,
              fontFamily: 'Inter',
              color: isUser ? '#FFFFFF' : colors.deepSlate,
              lineHeight: 22,
            }}
          >
            {text}
          </Text>
        )}
      </View>
      {timestamp && !isLoading ? (
        <Text
          style={{
            fontSize: 11,
            fontFamily: 'Inter',
            color: colors.neutral,
            marginTop: 4,
            marginHorizontal: 4,
          }}
        >
          {timestamp}
        </Text>
      ) : null}
    </View>
  );
}

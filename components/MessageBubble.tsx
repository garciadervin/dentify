/**
 * MessageBubble — burbuja de mensaje (boceto dentify.pen).
 *
 * Asistente: avatar azul + burbuja blanca (esquina inferior izquierda) con
 * fuente opcional. Usuario: burbuja azul alineada a la derecha.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export interface MessageBubbleProps {
  text: string;
  role: 'user' | 'assistant';
  timestamp?: string;
  isLoading?: boolean;
  /** Fuente del manual (solo asistente). */
  source?: string;
}

export default function MessageBubble({
  text,
  role,
  timestamp,
  isLoading = false,
  source,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <View
        testID="bubble-user"
        style={[styles.row, { justifyContent: 'flex-end' }]}
      >
        <View style={styles.userCol}>
          <View style={[styles.bubble, styles.bubbleUser]}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.textUser}>{text}</Text>
            )}
          </View>
          {timestamp && !isLoading && <Text style={styles.timestamp}>{timestamp}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View testID="bubble-assistant" style={styles.row}>
      <View style={styles.avatar}>
        <MaterialCommunityIcons name="creation" size={14} color="#FFFFFF" />
      </View>
      <View style={styles.assistantCol}>
        <View style={[styles.bubble, styles.bubbleAssistant]}>
          {isLoading ? (
            <View style={styles.loadingRow} testID="bubble-loading">
              <ActivityIndicator size="small" color={Colors.neutral} />
              <Text style={styles.loadingText}>Pensando...</Text>
            </View>
          ) : (
            <Text style={styles.textAssistant}>{text}</Text>
          )}
        </View>
        {source ? (
          <View style={styles.source}>
            <MaterialCommunityIcons name="book-open-variant" size={12} color={Colors.neutral} />
            <Text style={styles.sourceText} numberOfLines={1}>
              {source}
            </Text>
          </View>
        ) : null}
        {timestamp && !isLoading && <Text style={styles.timestamp}>{timestamp}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 12,
    width: '100%',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.clinicalBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  userCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timestamp: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: Colors.neutral,
    paddingHorizontal: 4,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.pillBorder,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 20,
  },
  bubbleUser: {
    backgroundColor: Colors.clinicalBlue,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 6,
  },
  textAssistant: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.deepSlate,
  },
  textUser: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: Colors.neutral,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    backgroundColor: Colors.sourceFill,
    borderRadius: 13,
    paddingHorizontal: 10,
  },
  sourceText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: Colors.neutral,
    flexShrink: 1,
  },
});

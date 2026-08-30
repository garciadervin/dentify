/**
 * MessageBubble — message bubble.
 *
 * Assistant: blue avatar + white bubble (bottom-left corner) with
 * optional source. User: right-aligned blue bubble.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Markdown from 'react-native-markdown-display';
import { Colors } from '@/constants/theme';
import type { AgentSource } from '@/src/services/agent';

export interface MessageBubbleProps {
  text: string;
  role: 'user' | 'assistant';
  timestamp?: string;
  isLoading?: boolean;
  /** Manual source (assistant only). */
  source?: string;
  /** Sources used by the agent (manuals, web, progress). */
  sources?: AgentSource[];
  /** Attached image URI (user only). */
  imageUri?: string;
  /** Etiqueta de archivo adjunto (p. ej. "documento.txt"). */
  attachmentLabel?: string;
}

const SOURCE_ICONS: Record<AgentSource['type'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  manual: 'book-open-variant',
  web: 'web',
  progress: 'chart-line',
};

const markdownStyles = {
  body: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.deepSlate,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  heading1: { fontFamily: 'Manrope-Bold', fontSize: 20, lineHeight: 26, color: Colors.deepSlate, marginBottom: 8 },
  heading2: { fontFamily: 'Manrope-Bold', fontSize: 17, lineHeight: 23, color: Colors.deepSlate, marginBottom: 6 },
  heading3: { fontFamily: 'Manrope-Bold', fontSize: 15, lineHeight: 21, color: Colors.deepSlate, marginBottom: 6 },
  strong: { fontFamily: 'Inter-Bold', color: Colors.deepSlate },
  em: { fontStyle: 'italic' },
  link: { color: Colors.clinicalBlue },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.clinicalBlue,
    paddingLeft: 10,
    marginVertical: 8,
    backgroundColor: Colors.sourceFill,
    borderRadius: 6,
    paddingVertical: 6,
    paddingRight: 8,
  },
  code_inline: {
    fontFamily: 'monospace',
    backgroundColor: Colors.sourceFill,
    borderRadius: 4,
    paddingHorizontal: 4,
    color: Colors.deepSlate,
    fontSize: 13,
  },
  code_block: {
    fontFamily: 'monospace',
    backgroundColor: Colors.sourceFill,
    borderRadius: 8,
    padding: 10,
    color: Colors.deepSlate,
    fontSize: 12.5,
    lineHeight: 18,
  },
  fence: {
    fontFamily: 'monospace',
    backgroundColor: Colors.sourceFill,
    borderRadius: 8,
    padding: 10,
    color: Colors.deepSlate,
    fontSize: 12.5,
    lineHeight: 18,
  },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginBottom: 3, flexDirection: 'row' },
  hr: { backgroundColor: Colors.borderLight, height: 1, marginVertical: 10 },
} as any;

export default function MessageBubble({
  text,
  role,
  timestamp,
  isLoading = false,
  source,
  sources,
  imageUri,
  attachmentLabel,
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
              <>
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.attachedImage}
                    contentFit="cover"
                    transition={150}
                  />
                ) : null}
                {attachmentLabel ? (
                  <View style={styles.attachedFileRow}>
                    <MaterialCommunityIcons name="file-document-outline" size={13} color="#FFFFFF" />
                    <Text style={styles.attachedFileText} numberOfLines={1}>
                      {attachmentLabel}
                    </Text>
                  </View>
                ) : null}
                {text ? <Text style={styles.textUser}>{text}</Text> : null}
              </>
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
            <Markdown style={markdownStyles}>{text}</Markdown>
          )}
        </View>
        {sources && sources.length > 0 ? (
          <View style={styles.sourceRow}>
            {sources.slice(0, 3).map((s, i) => {
              const Chip = (
                <View style={styles.source} key={`${s.type}-${i}`}>
                  <MaterialCommunityIcons
                    name={SOURCE_ICONS[s.type] ?? 'book-open-variant'}
                    size={12}
                    color={Colors.neutral}
                  />
                  <Text style={styles.sourceText} numberOfLines={1}>
                    {s.title}
                  </Text>
                </View>
              );
              return s.type === 'web' && s.url ? (
                <Pressable
                  key={`${s.type}-${i}`}
                  accessibilityRole="link"
                  onPress={() => {
                    if (s.url) void Linking.openURL(s.url);
                  }}
                >
                  {Chip}
                </Pressable>
              ) : (
                Chip
              );
            })}
          </View>
        ) : source ? (
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
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  attachedImage: {
    width: 180,
    height: 140,
    borderRadius: 10,
    marginBottom: 8,
  },
  attachedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  attachedFileText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
    flexShrink: 1,
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

/**
 * MessageBubble — message bubble.
 *
 * Assistant: blue avatar + white bubble (bottom-left corner) with
 * optional source. User: right-aligned blue bubble.
 */

import React from 'react';
import { View, Text, ActivityIndicator, Pressable, Linking, Platform } from 'react-native';
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

function hasMarkdown(text: string): boolean {
  return /[#*`\[\]>]|^\s*[-*] |\d+\.\s/.test(text);
}

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
        className="mb-3 w-full flex-row items-end justify-end gap-2 px-6"
      >
        <View className="items-end gap-1">
          <View className="max-w-[78%] rounded-t-[20px] rounded-bl-[20px] rounded-br-[6px] bg-clinical-blue px-3.5 py-3">
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: 180, height: 140, borderRadius: 10, marginBottom: 8 }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : null}
                {attachmentLabel ? (
                  <View className="mb-1.5 flex-row items-center gap-1.5">
                    <MaterialCommunityIcons name="file-document-outline" size={13} color="#FFFFFF" />
                    <Text className="shrink font-inter-semibold text-[12px] text-white" numberOfLines={1}>
                      {attachmentLabel}
                    </Text>
                  </View>
                ) : null}
                {text ? <Text className="font-sans text-[14px] leading-[21px] text-white">{text}</Text> : null}
              </>
            )}
          </View>
          {timestamp && !isLoading && <Text className="px-1 font-sans text-[11px] text-neutral">{timestamp}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View testID="bubble-assistant" className="mb-3 w-full flex-row items-end gap-2 px-6">
      <View className="h-[26px] w-[26px] items-center justify-center rounded-[13px] bg-clinical-blue">
        <MaterialCommunityIcons name="creation" size={14} color="#FFFFFF" />
      </View>
      <View className="flex-1 items-start gap-1">
        <View className="max-w-[78%] rounded-t-[20px] rounded-bl-[6px] rounded-br-[20px] border border-pill-border bg-surface px-3.5 py-3">
          {isLoading ? (
            <View className="flex-row items-center gap-1.5" testID="bubble-loading">
              <ActivityIndicator size="small" color={Colors.neutral} />
              <Text className="font-sans text-[13px] text-neutral">Pensando...</Text>
            </View>
          ) : Platform.OS === 'web' ? (
            <Text className="font-sans text-[14px] leading-[21px] text-deep-slate">{text}</Text>
          ) : hasMarkdown(text) ? (
            <Markdown style={markdownStyles}>{text}</Markdown>
          ) : (
            <Text className="font-sans text-[14px] leading-[21px] text-deep-slate">{text}</Text>
          )}
        </View>
        {sources && sources.length > 0 ? (
          <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
            {sources.slice(0, 3).map((s, i) => {
              const Chip = (
                <View
                  className="h-[26px] flex-row items-center gap-1.5 rounded-[13px] bg-source-fill px-2.5"
                  key={`${s.type}-${i}`}
                >
                  <MaterialCommunityIcons
                    name={SOURCE_ICONS[s.type] ?? 'book-open-variant'}
                    size={12}
                    color={Colors.neutral}
                  />
                  <Text className="shrink font-sans text-[11px] text-neutral" numberOfLines={1}>
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
          <View className="h-[26px] flex-row items-center gap-1.5 rounded-[13px] bg-source-fill px-2.5">
            <MaterialCommunityIcons name="book-open-variant" size={12} color={Colors.neutral} />
            <Text className="shrink font-sans text-[11px] text-neutral" numberOfLines={1}>
              {source}
            </Text>
          </View>
        ) : null}
        {timestamp && !isLoading && <Text className="px-1 font-sans text-[11px] text-neutral">{timestamp}</Text>}
      </View>
    </View>
  );
}

// `markdownStyles` above intentionally stays as inline RN style objects:
// react-native-markdown-display requires a nested style dictionary per node type.

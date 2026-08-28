/**
 * ChatScreen — Denty-AI Clinical Assistant
 *
 * Full chat interface with FlatList of messages, ChatInput at the bottom,
 * welcome message, RAG-powered responses via Groq, and conversation history.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, createShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AppHeader from '@/components/AppHeader';
import MessageBubble from '@/components/MessageBubble';
import ChatInput from '@/components/ChatInput';
import { chatWithContext } from '@/src/services/rag';
import type { GroqMessage } from '@/src/services/groq';
import { getOfflineMessage } from '@/src/services/groq';
import {
  initLocalDB,
  saveConversationLocal,
  getConversationsLocal,
  deleteConversationLocal,
  type Conversation,
  type StoredMessage,
} from '@/src/services/conversations';

interface ChatMessage {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: string;
  isLoading?: boolean;
}

let messageCounter = 0;
function generateId(): string {
  messageCounter += 1;
  return `msg-${Date.now()}-${messageCounter}`;
}

function formatTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  text: '¡Hola! Soy tu asistente clínico dental. ¿En qué puedo ayudarte?',
  role: 'assistant',
  timestamp: formatTimestamp(),
};

function generateConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Initialize local DB and load conversations on mount
  useEffect(() => {
    initLocalDB().then(() => {
      loadConversations();
    });
  }, []);

  const loadConversations = useCallback(async () => {
    const convs = await getConversationsLocal();
    setConversations(convs);
  }, []);

  /**
   * Save messages as a conversation to local DB.
   * Accepts an explicit message list so callers can save the exact array they
   * just rendered (avoids the stale-closure bug where a deferred save missed
   * the latest exchange). Preserves started_at across updates.
   */
  const saveCurrentConversation = useCallback(
    async (messageList?: ChatMessage[]) => {
      const source = messageList ?? messages;
      const userMessages = source.filter((m) => m.id !== 'welcome' && !m.isLoading);
      if (userMessages.length === 0) return;

      const storedMessages: StoredMessage[] = userMessages.map((m) => ({
        role: m.role,
        content: m.text,
        timestamp: m.timestamp,
      }));

      const firstUserMsg = userMessages.find((m) => m.role === 'user');
      const title = firstUserMsg ? firstUserMsg.text.slice(0, 60) : 'Conversación';

      const convId = currentConvId ?? generateConversationId();
      const existing = conversations.find((c) => c.id === convId);
      const started_at = existing?.started_at ?? new Date().toISOString();
      setCurrentConvId(convId);

      const conv: Conversation = {
        id: convId,
        title,
        messages: storedMessages,
        started_at,
        last_updated: new Date().toISOString(),
      };

      await saveConversationLocal(conv);
      await loadConversations();
    },
    [messages, currentConvId, conversations, loadConversations]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (isLoading) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        text,
        role: 'user',
        timestamp: formatTimestamp(),
      };

      const loadingMessage: ChatMessage = {
        id: generateId(),
        text: '',
        role: 'assistant',
        timestamp: '',
        isLoading: true,
      };

      const nextMessages = [...messages, userMessage, loadingMessage];
      setMessages(nextMessages);
      setIsLoading(true);

      const applyReply = (reply: ChatMessage) => {
        const finalMessages = [...nextMessages];
        finalMessages[finalMessages.length - 1] = reply;
        setMessages(finalMessages);
        setIsLoading(false);
        // Save with the actual final messages.
        void saveCurrentConversation(finalMessages);
      };

      try {
        // Full conversation history (minus welcome + loading placeholder) so
        // the assistant has context from previous turns.
        const history: GroqMessage[] = nextMessages
          .filter((m) => m.id !== 'welcome' && !m.isLoading)
          .map((m) => ({ role: m.role, content: m.text }));

        const response = await chatWithContext(history);

        applyReply({
          id: generateId(),
          text: response.content,
          role: 'assistant',
          timestamp: formatTimestamp(),
        });
      } catch (err: any) {
        const errorText = err?.message ?? '';
        const isBackendError =
          errorText.includes('Groq proxy error') ||
          errorText.includes('Groq API error') ||
          errorText.includes('no configurada') ||
          errorText.includes('fetch failed') ||
          errorText.includes('Network request failed');

        const fallbackText = isBackendError
          ? getOfflineMessage()
          : 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.';

        applyReply({
          id: generateId(),
          text: fallbackText,
          role: 'assistant',
          timestamp: formatTimestamp(),
        });
      }
    },
    [isLoading, messages, saveCurrentConversation]
  );

  /**
   * Load a past conversation into the chat.
   */
  const loadConversation = useCallback((conv: Conversation) => {
    const loadedMessages: ChatMessage[] = conv.messages.map((m, i) => ({
      id: `restored-${i}`,
      text: m.content,
      role: m.role,
      timestamp: m.timestamp,
    }));

    setMessages([WELCOME_MESSAGE, ...loadedMessages]);
    setCurrentConvId(conv.id);
    setShowConversations(false);
  }, []);

  /**
   * Delete a conversation with confirmation.
   */
  const handleDeleteConversation = useCallback(
    (conv: Conversation) => {
      Alert.alert(
        'Eliminar conversación',
        `¿Eliminar "${conv.title}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              await deleteConversationLocal(conv.id);
              await loadConversations();
              if (currentConvId === conv.id) {
                setMessages([WELCOME_MESSAGE]);
                setCurrentConvId(null);
              }
            },
          },
        ]
      );
    },
    [currentConvId, loadConversations]
  );

  /**
   * Format a date string for display.
   */
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const SUGGESTIONS = [
    '¿Qué es la periodontitis?',
    '¿Cómo identificar caries?',
    'Explícame la anatomía pulpar',
    'Protocolo de endodoncia',
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.skyLight }} edges={['bottom']}>
      <AppHeader subtitle="Denty-AI" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          testID="messages-list"
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              text={item.text}
              role={item.role}
              timestamp={item.timestamp}
              isLoading={item.isLoading}
            />
          )}
          contentContainerStyle={{
            paddingTop: 16,
            paddingBottom: 8,
          }}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <View style={{ marginBottom: 12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {SUGGESTIONS.map((suggestion, index) => (
                <TouchableOpacity
                  key={`suggest-${index}`}
                  onPress={() => handleSend(suggestion)}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                    borderWidth: 1.5,
                    borderBottomWidth: 3.5,
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={colors.clinicalBlue} />
                  <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 12, color: colors.deepSlate }}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </KeyboardAvoidingView>

      {/* Conversation history button */}
      <TouchableOpacity
        testID="conversations-button"
        onPress={() => {
          loadConversations();
          setShowConversations(true);
        }}
        style={{
          position: 'absolute',
          top: 80,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          ...createShadow(2, 4, '#000000', 0.1),
          elevation: 3,
        }}
      >
        <Ionicons name="chatbubbles-outline" size={20} color={colors.neutral} />
      </TouchableOpacity>

      {/* Conversations modal */}
      <Modal
        visible={showConversations}
        animationType="slide"
        transparent
        onRequestClose={() => setShowConversations(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '70%',
              paddingTop: 16,
              paddingBottom: 32,
            }}
          >
            {/* Handle */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.borderLight,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />

            <Text
              style={{
                fontFamily: 'Manrope-Bold',
                fontSize: 18,
                color: colors.deepSlate,
                paddingHorizontal: 24,
                marginBottom: 16,
              }}
            >
              Conversaciones
            </Text>

            {conversations.length === 0 ? (
              <Text
                style={{
                  fontFamily: 'Inter',
                  fontSize: 14,
                  color: colors.neutral,
                  textAlign: 'center',
                  paddingVertical: 32,
                }}
              >
                No hay conversaciones guardadas
              </Text>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => loadConversation(item)}
                    onLongPress={() => handleDeleteConversation(item)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: colors.skyLight,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter-SemiBold',
                        fontSize: 14,
                        color: colors.deepSlate,
                        marginBottom: 4,
                      }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Inter',
                        fontSize: 12,
                        color: colors.neutral,
                      }}
                    >
                      {formatDate(item.last_updated)} · {item.messages.length} mensajes
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              onPress={() => setShowConversations(false)}
              style={{
                marginHorizontal: 24,
                marginTop: 12,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.borderLight,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 14,
                  color: colors.deepSlate,
                }}
              >
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

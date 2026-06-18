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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AppHeader from '@/components/AppHeader';
import MessageBubble from '@/components/MessageBubble';
import ChatInput from '@/components/ChatInput';
import { chatWithContext } from '@/src/services/rag';
import type { GroqMessage } from '@/src/services/groq';
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
   * Save current messages as a conversation to local DB.
   */
  const saveCurrentConversation = useCallback(async () => {
    const userMessages = messages.filter((m) => m.id !== 'welcome');
    if (userMessages.length === 0) return;

    const storedMessages: StoredMessage[] = userMessages.map((m) => ({
      role: m.role,
      content: m.text,
      timestamp: m.timestamp,
    }));

    const firstUserMsg = userMessages.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.text.slice(0, 60)
      : 'Conversación';

    const convId = currentConvId ?? generateConversationId();
    setCurrentConvId(convId);

    const conv: Conversation = {
      id: convId,
      title,
      messages: storedMessages,
      started_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    };

    await saveConversationLocal(conv);
    await loadConversations();
  }, [messages, currentConvId, loadConversations]);

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

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setIsLoading(true);

      try {
        const groqMessages: GroqMessage[] = [
          { role: 'user', content: text },
        ];

        const response = await chatWithContext(groqMessages);

        setMessages((prev) => {
          const updated = [...prev];
          const loadingIndex = updated.findIndex((m) => m.isLoading);
          if (loadingIndex !== -1) {
            updated[loadingIndex] = {
              id: generateId(),
              text: response.content,
              role: 'assistant',
              timestamp: formatTimestamp(),
            };
          }
          return updated;
        });

        // Auto-save conversation after receiving response
        setTimeout(() => saveCurrentConversation(), 100);
      } catch {
        setMessages((prev) => {
          const updated = [...prev];
          const loadingIndex = updated.findIndex((m) => m.isLoading);
          if (loadingIndex !== -1) {
            updated[loadingIndex] = {
              id: generateId(),
              text: 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.',
              role: 'assistant',
              timestamp: formatTimestamp(),
            };
          }
          return updated;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, saveCurrentConversation]
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
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
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

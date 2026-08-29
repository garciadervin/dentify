/**
 * ChatScreen — Denty-AI Clinical Assistant (boceto dentify.pen).
 *
 * Chat RAG con historial local (SQLite) sincronizado a ai_conversations,
 * sugerencias rápidas, burbujas con avatar y entrada en píldora.
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
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import MessageBubble from '@/components/MessageBubble';
import ChatInput from '@/components/ChatInput';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { chatWithContext } from '@/src/services/rag';
import type { GroqMessage } from '@/src/services/groq';
import { getOfflineMessage } from '@/src/services/groq';
import {
  initLocalDB,
  saveConversationLocal,
  getConversationsLocal,
  deleteConversationLocal,
  syncToSupabase,
  syncFromSupabase,
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
  text: '¡Hola! Soy Denty, tu asistente clínico. Pregúntame sobre anatomía, operatoria, endodoncia y periodoncia.',
  role: 'assistant',
  timestamp: formatTimestamp(),
};

function generateConversationId(): string {
  // ai_conversations.id es UUID en Supabase.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SUGGESTIONS = [
  '¿Qué es la caries dental?',
  '¿Cómo identificar restauraciones?',
  'Explícame la anatomía pulpar',
  'Protocolo de endodoncia',
];

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initLocalDB().then(() => {
      loadConversations();
      if (user) {
        void syncFromSupabase(user.id).then(() => loadConversations());
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadConversations = useCallback(async () => {
    const convs = await getConversationsLocal();
    setConversations(convs);
  }, []);

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
      // Sincroniza a Supabase (ai_conversations) si hay sesión.
      if (user) {
        void syncToSupabase(user.id);
      }
    },
    [messages, currentConvId, conversations, loadConversations, user]
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
        void saveCurrentConversation(finalMessages);
      };

      try {
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
    <ScreenContainer style={styles.flex} edges={['top']}>
      <AppHeader
        variant="bot"
        right={
          <TouchableOpacity
            testID="conversations-button"
            onPress={() => {
              loadConversations();
              setShowConversations(true);
            }}
            style={styles.historyButton}
            accessibilityLabel="Historial de conversaciones"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="history" size={20} color={Colors.neutral} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        {messages.length === 1 && (
          <View style={styles.suggestions}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              <View style={styles.suggestionsRow}>
                {SUGGESTIONS.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`suggest-${index}`}
                    onPress={() => handleSend(suggestion)}
                    style={styles.suggestionChip}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons
                      name="lightbulb-on-outline"
                      size={14}
                      color={Colors.clinicalBlue}
                    />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </KeyboardAvoidingView>

      {/* Modal de conversaciones */}
      <Modal
        visible={showConversations}
        animationType="slide"
        transparent
        onRequestClose={() => setShowConversations(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Conversaciones</Text>

            {conversations.length === 0 ? (
              <Text style={styles.modalEmpty}>No hay conversaciones guardadas</Text>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => loadConversation(item)}
                    onLongPress={() => handleDeleteConversation(item)}
                    style={styles.convRow}
                  >
                    <Text style={styles.convTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.convMeta}>
                      {formatDate(item.last_updated)} · {item.messages.length} mensajes
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              onPress={() => setShowConversations(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  suggestions: {
    marginBottom: 10,
  },
  suggestionsScroll: {
    paddingHorizontal: 24,
  },
  suggestionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.pillBorder,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
  },
  suggestionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.deepSlate,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingTop: 16,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: Colors.deepSlate,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  modalEmpty: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: Colors.neutral,
    textAlign: 'center',
    paddingVertical: 32,
  },
  modalList: {
    paddingHorizontal: 16,
  },
  convRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.skyLight,
    marginBottom: 8,
  },
  convTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.deepSlate,
    marginBottom: 4,
  },
  convMeta: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: Colors.neutral,
  },
  modalClose: {
    marginHorizontal: 24,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.deepSlate,
  },
});

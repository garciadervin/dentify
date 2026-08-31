/**
 * ChatScreen — Denty-AI Clinical Assistant.
 *
 * Agent chat with local history (SQLite) synced to ai_conversations, quick
 * suggestions, avatar bubbles and a pill input.
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
import { Image } from 'expo-image';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import MessageBubble from '@/components/MessageBubble';
import ChatInput from '@/components/ChatInput';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import {
  sendAgentMessage,
  type AgentMessage,
  type AgentSource,
  type AgentAttachment,
} from '@/src/services/agent';
import {
  pickImageAttachment,
  pickFileAttachment,
  type Attachment,
} from '@/src/services/attachments';
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
  sources?: AgentSource[];
  imageUri?: string;
  attachmentLabel?: string;
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
  // ai_conversations.id is a UUID in Supabase.
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
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
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
      // Sync to Supabase (ai_conversations) when signed in.
      if (user) {
        void syncToSupabase(user.id);
      }
    },
    [messages, currentConvId, conversations, loadConversations, user]
  );

  const handlePickAttachment = useCallback(async (kind: 'image' | 'file') => {
    setShowAttachMenu(false);
    try {
      const picked = kind === 'image' ? await pickImageAttachment() : await pickFileAttachment();
      if (picked) setAttachment(picked);
    } catch (err: any) {
      Alert.alert('Adjuntar', err?.message ?? 'No se pudo adjuntar el archivo.');
    }
  }, []);

  const handleRemoveAttachment = useCallback(() => {
    setAttachment(null);
  }, []);

  const handleNewConversation = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setCurrentConvId(null);
    setAttachment(null);
    setShowConversations(false);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (isLoading) return;
      const currentAttachment = attachment;

      const userMessage: ChatMessage = {
        id: generateId(),
        text,
        role: 'user',
        timestamp: formatTimestamp(),
        imageUri: currentAttachment?.type === 'image' ? currentAttachment.uri : undefined,
        attachmentLabel: currentAttachment && currentAttachment.type !== 'image' ? currentAttachment.name : undefined,
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
        if (currentAttachment) setAttachment(null);
      };

      // Build the text-only history for the agent.
      const history: AgentMessage[] = nextMessages
        .filter((m) => m.id !== 'welcome' && !m.isLoading)
        .map((m) => ({ role: m.role, content: m.text }));

      // Attachments (image or file) are sent separately; the Edge Function
      // processes them: vision for images, text extraction for the rest.
      const attachments: AgentAttachment[] | undefined = currentAttachment
        ? [{ name: currentAttachment.name, mime: currentAttachment.mime, base64: currentAttachment.base64 }]
        : undefined;

      try {
        const response = await sendAgentMessage(history, attachments);

        applyReply({
          id: generateId(),
          text: response.content,
          role: 'assistant',
          timestamp: formatTimestamp(),
          sources: response.sources,
        });
      } catch (err: any) {
        const errorText = err?.message ?? '';
        let fallbackText: string;

        if (/Rate limit|429|muy solicitado/.test(errorText)) {
          fallbackText =
            'El asistente está muy solicitado en este momento. Espera unos segundos y vuelve a intentarlo.';
        } else if (errorText.includes('tardando') || errorText.includes('El asistente')) {
          fallbackText = 'El asistente tardó en responder. Intenta de nuevo en unos segundos.';
        } else if (
          errorText.includes('no configurada') ||
          errorText.includes('Proxy request failed') ||
          errorText.includes('fetch failed') ||
          errorText.includes('Network request failed')
        ) {
          fallbackText =
            'El asistente Denty-AI no pudo conectarse al servidor.\n\n' +
            'Verifica tu conexión y que la Edge Function `denty-agent` esté desplegada ' +
            'en Supabase con el secreto `GEMINI_API_KEY` configurado.';
        } else {
          fallbackText =
            errorText ||
            'Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.';
        }

        applyReply({
          id: generateId(),
          text: fallbackText,
          role: 'assistant',
          timestamp: formatTimestamp(),
        });
      }
    },
    [isLoading, messages, attachment, saveCurrentConversation]
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
          <View style={styles.headerActions}>
            <TouchableOpacity
              testID="new-conversation"
              onPress={handleNewConversation}
              style={styles.historyButton}
              accessibilityLabel="Nueva conversación"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="plus" size={20} color={Colors.neutral} />
            </TouchableOpacity>
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
          </View>
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
              sources={item.sources}
              imageUri={item.imageUri}
              attachmentLabel={item.attachmentLabel}
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

        {attachment && (
          <View style={styles.attachmentPreview} testID="attachment-preview">
            {attachment.type === 'image' ? (
              <Image
                source={{ uri: attachment.uri }}
                style={styles.attachmentImage}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View style={styles.attachmentFileIcon}>
                <MaterialCommunityIcons name="file-document-outline" size={18} color={Colors.clinicalBlue} />
              </View>
            )}
            <Text style={styles.attachmentName} numberOfLines={1}>
              {attachment.name}
            </Text>
            <TouchableOpacity
              testID="remove-attachment"
              onPress={handleRemoveAttachment}
              style={styles.attachmentRemove}
              accessibilityLabel="Quitar adjunto"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="close" size={16} color={Colors.neutral} />
            </TouchableOpacity>
          </View>
        )}

        <ChatInput onSend={handleSend} onAttach={() => setShowAttachMenu(true)} disabled={isLoading} />
      </KeyboardAvoidingView>

      {/* Attachments modal */}
      <Modal
        visible={showAttachMenu}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <TouchableOpacity
          style={styles.attachBackdrop}
          activeOpacity={1}
          onPress={() => setShowAttachMenu(false)}
        >
          <View style={styles.attachSheet}>
            <Text style={styles.attachTitle}>Adjuntar a la conversación</Text>
            <TouchableOpacity
              testID="attach-image"
              style={styles.attachOption}
              onPress={() => handlePickAttachment('image')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="image-outline" size={20} color={Colors.clinicalBlue} />
              <Text style={styles.attachOptionText}>Imagen de la galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="attach-text"
              style={styles.attachOption}
              onPress={() => handlePickAttachment('file')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="file-document-outline" size={20} color={Colors.clinicalBlue} />
              <Text style={styles.attachOptionText}>Archivo (PDF, DOCX, txt…)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachCancel} onPress={() => setShowAttachMenu(false)}>
              <Text style={styles.attachCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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

            <TouchableOpacity
              testID="modal-new-conversation"
              onPress={handleNewConversation}
              style={styles.newConversationButton}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.newConversationText}>Nueva conversación</Text>
            </TouchableOpacity>

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
                    style={styles.convRow}
                    accessibilityRole="button"
                  >
                    <View style={styles.convRowInfo}>
                      <Text style={styles.convTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.convMeta}>
                        {formatDate(item.last_updated)} · {item.messages.length} mensajes
                      </Text>
                    </View>
                    <TouchableOpacity
                      testID={`delete-conversation-${item.id}`}
                      onPress={() => handleDeleteConversation(item)}
                      style={styles.convDelete}
                      accessibilityLabel="Eliminar conversación"
                      accessibilityRole="button"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#C0392B" />
                    </TouchableOpacity>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
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
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: Colors.skyLight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  attachmentImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  attachmentFileIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentName: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.deepSlate,
  },
  attachmentRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  attachSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  attachTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: Colors.deepSlate,
    marginBottom: 4,
  },
  attachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.skyLight,
  },
  attachOptionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.deepSlate,
  },
  attachCancel: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  attachCancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.neutral,
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
  newConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.clinicalBlue,
  },
  newConversationText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.skyLight,
    marginBottom: 8,
  },
  convRowInfo: {
    flex: 1,
  },
  convDelete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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

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
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import MessageBubble from '@/components/MessageBubble';
import ChatInput from '@/components/ChatInput';
import { Colors } from '@/constants/theme';
import { getSupabase } from '@/src/lib/supabase';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
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
  const { toast } = useFeedback();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Conversation | null>(null);
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
      toast(err?.message ?? 'No se pudo adjuntar el archivo.', 'error');
    }
  }, [toast]);

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

  const handleDeleteConversation = useCallback((conv: Conversation) => {
    // In-app confirmation modal (consistent on web and native; avoids the
    // browser confirm and native Alert look).
    setConfirmDelete(conv);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const conv = confirmDelete;
    if (!conv) return;
    // Remove locally (SQLite on native / in-memory on web).
    await deleteConversationLocal(conv.id);
    // Delete the remote row so the conversation does not come back on the
    // next sync/load (the DELETE policy was added in migration 0008).
    if (user) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase
            .from('ai_conversations')
            .delete()
            .eq('id', conv.id)
            .eq('profile_id', user.id);
        } catch (e) {
          console.warn('Failed to delete conversation on Supabase', e);
        }
      }
    }
    await loadConversations();
    if (currentConvId === conv.id) {
      setMessages([WELCOME_MESSAGE]);
      setCurrentConvId(null);
    }
    setConfirmDelete(null);
  }, [confirmDelete, user, currentConvId, loadConversations]);

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
    <ScreenContainer style={{ flex: 1 }} edges={['top']}>
      <AppHeader
        variant="bot"
        right={
          <View className="flex-row gap-2">
            <TouchableOpacity
              testID="new-conversation"
              onPress={handleNewConversation}
              className="h-9 w-9 items-center justify-center rounded-[18px] border border-border-light bg-surface"
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
              className="h-9 w-9 items-center justify-center rounded-[18px] border border-border-light bg-surface"
              accessibilityLabel="Historial de conversaciones"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="history" size={20} color={Colors.neutral} />
            </TouchableOpacity>
          </View>
        }
      />

      <KeyboardAvoidingView
        className="flex-1"
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
          contentContainerClassName="py-3"
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        {messages.length === 1 && (
          <View className="mb-2.5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="px-6"
            >
              <View className="flex-row gap-2">
                {SUGGESTIONS.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`suggest-${index}`}
                    onPress={() => handleSend(suggestion)}
                    className="h-[34px] flex-row items-center gap-1.5 rounded-[17px] border border-pill-border bg-surface px-3.5"
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons
                      name="lightbulb-on-outline"
                      size={14}
                      color={Colors.clinicalBlue}
                    />
                    <Text className="font-inter-semibold text-[12px] text-deep-slate">{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {attachment && (
          <View className="mx-6 mb-2 flex-row items-center gap-2.5 rounded-[14px] border border-border-light bg-sky-light p-2.5" testID="attachment-preview">
            {attachment.type === 'image' ? (
              <Image
                source={{ uri: attachment.uri }}
                style={{ width: 44, height: 44, borderRadius: 8 }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View className="h-11 w-11 items-center justify-center rounded-[8px] border border-border-light bg-surface">
                <MaterialCommunityIcons name="file-document-outline" size={18} color={Colors.clinicalBlue} />
              </View>
            )}
            <Text className="flex-1 font-inter-semibold text-[13px] text-deep-slate" numberOfLines={1}>
              {attachment.name}
            </Text>
            <TouchableOpacity
              testID="remove-attachment"
              onPress={handleRemoveAttachment}
              className="h-7 w-7 items-center justify-center rounded-[14px] bg-surface"
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
          className="flex-1 justify-center bg-black/40 px-8"
          activeOpacity={1}
          onPress={() => setShowAttachMenu(false)}
        >
          <View className="gap-2 rounded-[20px] bg-surface p-4">
            <Text className="mb-1 font-heading-bold text-[16px] text-deep-slate">Adjuntar a la conversación</Text>
            <TouchableOpacity
              testID="attach-image"
              className="flex-row items-center gap-3 rounded-[12px] bg-sky-light px-3 py-3.5"
              onPress={() => handlePickAttachment('image')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="image-outline" size={20} color={Colors.clinicalBlue} />
              <Text className="font-inter-semibold text-[14px] text-deep-slate">Imagen de la galería</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="attach-text"
              className="flex-row items-center gap-3 rounded-[12px] bg-sky-light px-3 py-3.5"
              onPress={() => handlePickAttachment('file')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="file-document-outline" size={20} color={Colors.clinicalBlue} />
              <Text className="font-inter-semibold text-[14px] text-deep-slate">Archivo (PDF, DOCX, txt…)</Text>
            </TouchableOpacity>
            <TouchableOpacity className="items-center py-3" onPress={() => setShowAttachMenu(false)}>
              <Text className="font-inter-semibold text-[14px] text-neutral">Cancelar</Text>
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
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[70%] rounded-t-[24px] bg-surface pb-8 pt-4">
            <View className="mb-4 h-1 w-10 self-center rounded-[2px] bg-border-light" />
            <Text className="mb-4 px-6 font-heading-bold text-[18px] text-deep-slate">Conversaciones</Text>

            <TouchableOpacity
              testID="modal-new-conversation"
              onPress={handleNewConversation}
              className="mx-6 mb-3 flex-row items-center justify-center gap-2 rounded-[12px] bg-clinical-blue py-3"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              <Text className="font-inter-semibold text-[14px] text-white">Nueva conversación</Text>
            </TouchableOpacity>

            {conversations.length === 0 ? (
              <Text className="py-8 text-center font-sans text-[14px] text-neutral">No hay conversaciones guardadas</Text>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                contentContainerClassName="px-4"
                renderItem={({ item }) => (
                  <View className="mb-2 flex-row items-center gap-2 rounded-[12px] bg-sky-light px-3 py-3">
                    <TouchableOpacity
                      onPress={() => loadConversation(item)}
                      className="flex-1"
                      accessibilityRole="button"
                    >
                      <Text className="mb-1 font-inter-semibold text-[14px] text-deep-slate" numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text className="font-sans text-[12px] text-neutral">
                        {formatDate(item.last_updated)} · {item.messages.length} mensajes
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID={`delete-conversation-${item.id}`}
                      onPress={() => handleDeleteConversation(item)}
                      className="h-8 w-8 items-center justify-center rounded-[16px] bg-surface"
                      accessibilityLabel="Eliminar conversación"
                      accessibilityRole="button"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#C0392B" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              onPress={() => setShowConversations(false)}
              className="mx-6 mt-3 items-center rounded-[12px] bg-border-light py-3"
            >
              <Text className="font-inter-semibold text-[14px] text-deep-slate">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación de borrado */}
      <Modal
        visible={!!confirmDelete}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmDelete(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className="w-full max-w-[400px] rounded-[20px] bg-surface p-6">
            <View className="mb-2 flex-row items-center gap-2">
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#C0392B" />
              <Text className="font-heading-bold text-[17px] text-deep-slate">Eliminar conversación</Text>
            </View>
            <Text className="mb-5 font-sans text-[14px] leading-[20px] text-neutral">
              ¿Eliminar “{confirmDelete?.title}”? Esta acción no se puede deshacer.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmDelete(null)}
                className="flex-1 items-center rounded-[12px] bg-border-light py-3"
                accessibilityRole="button"
              >
                <Text className="font-inter-semibold text-[14px] text-deep-slate">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="confirm-delete"
                onPress={() => void handleConfirmDelete()}
                className="flex-1 items-center rounded-[12px] bg-error py-3"
                accessibilityRole="button"
              >
                <Text className="font-inter-semibold text-[14px] text-white">Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

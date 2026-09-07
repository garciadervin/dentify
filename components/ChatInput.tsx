/**
 * ChatInput — input bar.
 *
 * White pill with microphone (record → transcribe), text field and
 * circular blue send button. Voice is transcribed server-side with Gemini
 * and supports voice navigation commands.
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { transcribeAudio } from '@/src/services/voice';
import { parseNavigationCommand, NAVIGATION_COMMANDS } from '@/src/services/voiceCommands';

// Lazy-load expo-speech (TTS), not available on web
let SpeechModule: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional module guarded by Platform
    SpeechModule = require('expo-speech');
  } catch {
    // expo-speech not available — TTS disabled
  }
}

export interface ChatInputProps {
  onSend: (text: string) => void;
  /** Opens the attachment menu (image or file). */
  onAttach?: () => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onAttach, disabled = false }: ChatInputProps) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const startingRef = useRef(false);
  const recordingRef = useRef(false);

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSend(trimmed);
    setText('');
  };

  const canSend = text.trim().length > 0 && !disabled;

  /**
   * Start audio recording (native only; on web show a platform note).
   */
  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      toast('La grabación de voz solo está disponible en la app móvil.', 'info');
      return;
    }
    if (startingRef.current) return;

    startingRef.current = true;
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        toast('Se necesita acceso al micrófono para grabar voz.', 'error');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      recordingRef.current = true;
      setIsRecording(true);
    } catch {
      toast('No se pudo iniciar la grabación de voz.', 'error');
    } finally {
      startingRef.current = false;
    }
  }, [audioRecorder, toast]);

  /**
   * Stop recording, transcribe via Gemini, and handle the result.
   */
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return; // recording never started (e.g. denied)
    recordingRef.current = false;
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) return;

      const transcribedText = await transcribeAudio(uri);
      if (!transcribedText.trim()) return;

      const route = parseNavigationCommand(transcribedText);

      if (route) {
        const destinationName =
          Object.entries(NAVIGATION_COMMANDS as Record<string, string>).find(([, r]) => r === route)?.[0] ??
          route;

        if (Platform.OS !== 'web' && SpeechModule) {
          SpeechModule.speak(`Navegando a ${destinationName}`, {
            language: 'es-ES',
            rate: 0.85,
          });
        }

        router.replace(route as any);
      } else {
        setText('');
        onSend(transcribedText);
      }
    } catch {
      toast('No se pudo transcribir el audio.', 'error');
    } finally {
      setIsRecording(false);
    }
  }, [audioRecorder, onSend, router, toast]);

  return (
    <View className="mx-6 mb-2 h-[52px] flex-row items-center gap-2 rounded-[26px] border border-pill-border bg-surface pl-2.5 pr-1.5">
      {/* Attach image or file */}
      {onAttach ? (
        <TouchableOpacity
          testID="attach-button"
          onPress={onAttach}
          disabled={disabled}
          className="h-10 w-[34px] items-center justify-center rounded-[17px] bg-transparent"
          activeOpacity={0.6}
          accessibilityLabel="Adjuntar imagen o archivo"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="paperclip" size={20} color={Colors.neutral} />
        </TouchableOpacity>
      ) : null}

      {/* Mic — hold to record, release to transcribe (native only; hidden on web) */}
      {Platform.OS !== 'web' && (
        <TouchableOpacity
          testID="voice-button"
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={disabled}
          className={`h-10 w-[34px] items-center justify-center rounded-[17px] ${isRecording ? 'bg-error-bright' : 'bg-transparent'}`}
          activeOpacity={0.6}
          accessibilityLabel="Grabar por voz"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name={isRecording ? 'microphone' : 'microphone-outline'}
            size={20}
            color={isRecording ? '#FFFFFF' : Colors.neutral}
          />
        </TouchableOpacity>
      )}

      <TextInput
        testID="chat-input"
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSend}
        placeholder="Escribe tu pregunta…"
        placeholderTextColor={Colors.muted}
        editable={!disabled}
        multiline
        blurOnSubmit={false}
        className="max-h-20 flex-1 py-0 font-sans text-[14px] text-deep-slate"
      />

      {/* Enviar */}
      <TouchableOpacity
        testID="send-button"
        onPress={handleSend}
        disabled={!canSend}
        className={`h-10 w-10 items-center justify-center rounded-[20px] ${canSend ? 'bg-clinical-blue' : 'bg-pill-border'}`}
        activeOpacity={0.7}
        accessibilityLabel="Enviar mensaje"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons
          name="send"
          size={16}
          color={canSend ? '#FFFFFF' : Colors.neutral}
        />
      </TouchableOpacity>
    </View>
  );
}

/**
 * ChatInput — input bar.
 *
 * White pill with microphone (record → transcribe), text field and
 * circular blue send button. Voice is transcribed with Groq Whisper and
 * supports voice navigation commands.
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Platform, Alert, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { transcribeAudio } from '@/src/services/groq';
import { parseNavigationCommand, NAVIGATION_COMMANDS } from '@/src/services/voiceCommands';

// Lazy-load expo-speech (TTS), not available on web
let SpeechModule: any = null;
if (Platform.OS !== 'web') {
  try {
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
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const startingRef = useRef(false);

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
      Alert.alert('No disponible', 'La grabación de voz solo está disponible en la app móvil.');
      return;
    }
    if (startingRef.current) return;

    startingRef.current = true;
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso denegado', 'Se necesita acceso al micrófono para grabar voz.');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch {
      Alert.alert('Error', 'No se pudo iniciar la grabación de voz.');
    } finally {
      startingRef.current = false;
    }
  }, [audioRecorder]);

  /**
   * Stop recording, transcribe via Groq Whisper, and handle the result.
   */
  const stopRecording = useCallback(async () => {
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
      Alert.alert('Error', 'No se pudo transcribir el audio.');
    } finally {
      setIsRecording(false);
    }
  }, [audioRecorder, onSend, router]);

  return (
    <View style={styles.pill}>
      {/* Attach image or file */}
      {onAttach ? (
        <TouchableOpacity
          testID="attach-button"
          onPress={onAttach}
          disabled={disabled}
          style={styles.attachButton}
          activeOpacity={0.6}
          accessibilityLabel="Adjuntar imagen o archivo"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="paperclip" size={20} color={Colors.neutral} />
        </TouchableOpacity>
      ) : null}

      {/* Mic — hold to record, release to transcribe */}
      <TouchableOpacity
        testID="voice-button"
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={disabled}
        style={[styles.micButton, isRecording && styles.micButtonRecording]}
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
        style={styles.input}
      />

      {/* Enviar */}
      <TouchableOpacity
        testID="send-button"
        onPress={handleSend}
        disabled={!canSend}
        style={[styles.sendButton, { backgroundColor: canSend ? Colors.clinicalBlue : Colors.pillBorder }]}
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

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.pillBorder,
    paddingLeft: 10,
    paddingRight: 6,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  micButton: {
    width: 34,
    height: 40,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  attachButton: {
    width: 34,
    height: 40,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  micButtonRecording: {
    backgroundColor: '#E74C3C',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter',
    color: Colors.deepSlate,
    paddingVertical: 0,
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

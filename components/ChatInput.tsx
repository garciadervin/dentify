/**
 * ChatInput — Message composition component
 *
 * Provides a text input with send, voice, and attach buttons.
 * Voice button records with expo-audio and transcribes with Groq Whisper.
 * If the transcribed text matches a navigation command, it navigates instead
 * of sending.
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  onVoice?: () => void;
  onAttach?: () => void;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  onVoice,
  onAttach,
  disabled = false,
}: ChatInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // Guards the press-in → press-out race: stop() must not run before record()
  // has finished starting (a fast tap).
  const startingRef = useRef(false);

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSend(trimmed);
    setText('');
  };

  const canSend = text.trim().length > 0 && !disabled;

  /**
   * Start audio recording (native only; shows alert on web).
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

      // Check if it's a navigation command
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
        // Treat as regular chat input — clear text state first to avoid double-send
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
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        gap: 8,
      }}
    >
      {/* Text Input */}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.skyLight,
          borderRadius: 24,
          paddingHorizontal: 16,
          height: 44,
        }}
      >
        <TextInput
          testID="chat-input"
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.neutral}
          editable={!disabled}
          multiline
          blurOnSubmit={false}
          style={{
            flex: 1,
            fontSize: 15,
            fontFamily: 'Inter',
            color: colors.deepSlate,
            maxHeight: 100,
            paddingVertical: 0,
          }}
        />
      </View>

      {/* Attach Button */}
      <TouchableOpacity
        testID="attach-button"
        onPress={onAttach}
        disabled={disabled}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.skyLight,
        }}
        activeOpacity={0.6}
      >
        <Ionicons name="attach-outline" size={22} color={colors.neutral} />
      </TouchableOpacity>

      {/* Voice Button — press to start, release to stop */}
      <TouchableOpacity
        testID="voice-button"
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={disabled}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isRecording ? '#FF4444' : colors.skyLight,
        }}
        activeOpacity={0.6}
      >
        <Ionicons
          name={isRecording ? 'mic' : 'mic-outline'}
          size={22}
          color={isRecording ? '#FFFFFF' : colors.neutral}
        />
      </TouchableOpacity>

      {/* Send Button */}
      <TouchableOpacity
        testID="send-button"
        onPress={handleSend}
        disabled={!canSend}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: canSend ? colors.clinicalBlue : colors.borderLight,
        }}
        activeOpacity={0.7}
      >
        <Ionicons
          name="send"
          size={20}
          color={canSend ? '#FFFFFF' : colors.neutral}
        />
      </TouchableOpacity>
    </View>
  );
}

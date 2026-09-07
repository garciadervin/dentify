/**
 * CameraView — Wrapper around expo-camera's CameraView.
 *
 * Provides a full-screen camera preview with capture button, flash toggle,
 * and camera flip controls. Shows a loading indicator while processing.
 */

import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, Linking } from 'react-native';
import { CameraView as ExpoCameraView, useCameraPermissions, CameraType, FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

// ── Props ──────────────────────────────────────────────────────────────────

export interface CameraViewProps {
  onCapture: (uri: string) => void;
  /** Optional callback for real-time frame processing */
  onFrame?: (tensor: any) => void;
  isProcessing: boolean;
  /** Framed mode: hides the internal capture button (an external shutter is used via ref). */
  framed?: boolean;
}

export interface CameraViewHandle {
  capture: () => Promise<string | null>;
}

// ── Component ──────────────────────────────────────────────────────────────

const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(function CameraView(
  { onCapture, isProcessing, framed = false },
  ref
) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const cameraRef = useRef<any>(null);

  const toggleFacing = useCallback(() => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  }, []);

  const toggleFlash = useCallback(() => {
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  }, []);

  const handleCapture = useCallback(async () => {
    if (cameraRef.current && !isProcessing) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        if (photo?.uri) {
          onCapture(photo.uri);
          return photo.uri;
        }
      } catch {
        // Silently fail — camera might not be ready
      }
    }
    return null;
  }, [isProcessing, onCapture]);

  useImperativeHandle(ref, () => ({ capture: handleCapture }), [handleCapture]);

  // Permission handling
  if (!permission) {
    // Camera permissions are still loading
    return (
      <View className="flex-1 bg-sky-light">
        <ActivityIndicator size="large" color={Colors.clinicalBlue} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-sky-light">
        <Text className="mb-4 px-6 text-center font-sans text-base text-deep-slate">
          Necesitamos acceso a la cámara para realizar diagnósticos
        </Text>
        {permission.canAskAgain === false ? (
          <>
            <Text className="mb-4 px-6 text-center font-sans text-sm text-neutral">
              El permiso de cámara fue denegado permanentemente. Actívalo desde los
              ajustes del dispositivo para usar el diagnóstico.
            </Text>
            <TouchableOpacity
              className="rounded-[12px] bg-clinical-blue px-6 py-3"
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
            >
              <Text className="font-inter-semibold text-base text-white">
                Abrir ajustes
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            className="rounded-[12px] bg-clinical-blue px-6 py-3"
            onPress={requestPermission}
            accessibilityRole="button"
          >
            <Text className="font-inter-semibold text-base text-white">
              Permitir acceso
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ExpoCameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        flash={flash}
        testID="camera-preview"
      >
        {/* Loading overlay */}
        {isProcessing && (
          <View className="absolute inset-0 items-center justify-center bg-black/60">
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text className="mt-3 font-inter-semibold text-[18px] text-white">
              Analizando...
            </Text>
          </View>
        )}

        {/* Top controls */}
        <View className="absolute left-5 right-5 top-[60px] flex-row justify-between">
          <TouchableOpacity
            testID="flash-toggle"
            className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
            onPress={toggleFlash}
            accessibilityRole="button"
            accessibilityLabel={flash === 'on' ? 'Apagar flash' : 'Encender flash'}
          >
            <Ionicons
              name={flash === 'on' ? 'flash' : 'flash-off'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            testID="flip-camera"
            className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
            onPress={toggleFacing}
            accessibilityRole="button"
            accessibilityLabel="Cambiar cámara frontal/trasera"
          >
            <Ionicons
              name="camera-reverse"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Bottom capture button (oculto en modo enmarcado) */}
        {!framed && (
          <View className="absolute bottom-[60px] left-0 right-0 items-center">
            <TouchableOpacity
              testID="capture-button"
              className={`h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/80 ${
                isProcessing ? 'bg-white/40' : 'bg-white'
              }`}
              onPress={handleCapture}
              disabled={isProcessing}
              accessibilityRole="button"
              accessibilityLabel="Capturar foto"
            >
              <View className="h-[60px] w-[60px] rounded-full bg-white" />
            </TouchableOpacity>
          </View>
        )}
      </ExpoCameraView>
    </View>
  );
});

export default CameraView;

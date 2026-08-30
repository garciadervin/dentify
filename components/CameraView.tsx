/**
 * CameraView — Wrapper around expo-camera's CameraView.
 *
 * Provides a full-screen camera preview with capture button, flash toggle,
 * and camera flip controls. Shows a loading indicator while processing.
 */

import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { CameraView as ExpoCameraView, useCameraPermissions, CameraType, FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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
      <View style={[styles.container, { backgroundColor: colors.skyLight }]}>
        <ActivityIndicator size="large" color={colors.clinicalBlue} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.skyLight }]}>
        <Text
          style={{
            fontFamily: 'Inter',
            fontSize: 16,
            color: colors.deepSlate,
            textAlign: 'center',
            marginBottom: 16,
            paddingHorizontal: 24,
          }}
        >
          Necesitamos acceso a la cámara para realizar diagnósticos
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: colors.clinicalBlue,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
          onPress={requestPermission}
        >
          <Text
            style={{
              fontFamily: 'Inter-SemiBold',
              fontSize: 16,
              color: '#FFFFFF',
            }}
          >
            Permitir acceso
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoCameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
        testID="camera-preview"
      >
        {/* Loading overlay */}
        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 18,
                color: '#FFFFFF',
                marginTop: 12,
              }}
            >
              Analizando...
            </Text>
          </View>
        )}

        {/* Top controls */}
        <View style={styles.topControls}>
          <TouchableOpacity
            testID="flash-toggle"
            style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
            onPress={toggleFlash}
          >
            <Ionicons
              name={flash === 'on' ? 'flash' : 'flash-off'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            testID="flip-camera"
            style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
            onPress={toggleFacing}
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
          <View style={styles.bottomControls}>
            <TouchableOpacity
              testID="capture-button"
              style={[
                styles.captureButton,
                { backgroundColor: isProcessing ? 'rgba(255,255,255,0.4)' : '#FFFFFF' },
              ]}
              onPress={handleCapture}
              disabled={isProcessing}
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        )}
      </ExpoCameraView>
    </View>
  );
});

export default CameraView;

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topControls: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
});

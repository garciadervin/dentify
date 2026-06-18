/**
 * Scanner Screen — YOLO Diagnosis Module
 *
 * Full-screen camera with YOLO inference overlay. Captures an image,
 * runs the segmentation model, displays bounding boxes, and allows
 * saving the diagnosis to Supabase or viewing an educational description
 * via the RAG service.
 *
 * State machine: idle → capturing → processing → results
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/hooks/useAuth';
import { useBadges } from '@/src/hooks/useBadges';
import { getSupabase } from '@/src/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/types/supabase';
import CameraView from '@/components/CameraView';
import DetectionOverlay from '@/components/DetectionOverlay';
import { processImage, setWebViewRef, handleWebViewMessage, CLASS_NAMES, type Detection } from '@/src/services/yolo';
import { retrieveRelevantChunks, generatePrompt } from '@/src/services/rag';
import { sendMessage } from '@/src/services/groq';

// ── Types ──────────────────────────────────────────────────────────────────

type ScannerState = 'idle' | 'capturing' | 'processing' | 'results';

// ── Component ──────────────────────────────────────────────────────────────

export default function ScannerScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { checkAndAwardBadge } = useBadges();
  const router = useRouter();
  const inferenceWebViewRef = useRef<WebView | null>(null);

  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [detections, setDetections] = useState<Detection[]>([]);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState<string | null>(null);
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Callback ref: registers WebView instance with YOLO service when available
  const handleInferenceWebViewRef = useCallback((ref: WebView | null) => {
    inferenceWebViewRef.current = ref;
    setWebViewRef(ref);
  }, []);

  // ── Capture handler ────────────────────────────────────────────────────

  const handleCapture = useCallback(async (uri: string) => {
    setCapturedUri(uri);
    setScannerState('processing');

    try {
      const results = await processImage(uri);
      setDetections(results);
      setScannerState('results');
    } catch (error) {
      console.warn('YOLO inference failed:', error);
      setDetections([]);
      setScannerState('results');
    }
  }, []);

  // ── Retake ─────────────────────────────────────────────────────────────

  const handleRetake = useCallback(() => {
    setDetections([]);
    setCapturedUri(null);
    setDescription(null);
    setShowDescription(false);
    setScannerState('idle');
  }, []);

  // ── Save diagnosis ─────────────────────────────────────────────────────

  const handleSaveDiagnosis = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    const supabase = getSupabase();

    try {
      if (supabase) {
        await (supabase.from('diagnosis_sessions') as unknown as ReturnType<SupabaseClient<Database>['from']>).insert({
          profile_id: user.id,
          image_url: capturedUri ?? null,
          detected_objects: detections as unknown as Database['public']['Tables']['diagnosis_sessions']['Insert']['detected_objects'],
          clinical_notes: null,
        });
      }

      // Award badge for first diagnosis
      await checkAndAwardBadge('diagnosis', 1);

      // Show success feedback
      setSaving(false);
    } catch (error) {
      console.warn('Failed to save diagnosis:', error);
      setSaving(false);
    }
  }, [user, capturedUri, detections, checkAndAwardBadge]);

  // ── View description (RAG) ─────────────────────────────────────────────

  const handleViewDescription = useCallback(async () => {
    if (description) {
      setShowDescription((prev) => !prev);
      return;
    }

    setLoadingDescription(true);
    setShowDescription(true);

    try {
      // Build a query from detected conditions
      const conditionNames = detections.map((d) => d.className);
      const uniqueConditions = [...new Set(conditionNames)];
      const query = `Describe las siguientes condiciones dentales detectadas: ${uniqueConditions.join(', ')}. Proporciona información clínica relevante sobre cada una.`;

      const context = await retrieveRelevantChunks(query);
      const prompt = generatePrompt(query, context);
      const response = await sendMessage([{ role: 'user', content: prompt }]);
      setDescription(response.content);
    } catch {
      setDescription('No se pudo obtener la descripción. Intenta de nuevo más tarde.');
    }

    setLoadingDescription(false);
  }, [detections, description]);

  // ── Render ─────────────────────────────────────────────────────────────
  // WebView for TFJS inference is always mounted across all states.

  const inferenceWebView = (
    <WebView
      ref={handleInferenceWebViewRef}
      source={require('@/assets/ml/yolo_inference.html')}
      onMessage={handleWebViewMessage}
      style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
      javaScriptEnabled
      domStorageEnabled
    />
  );

  // Idle / Capturing
  if (scannerState === 'idle' || scannerState === 'capturing') {
    return (
      <View style={styles.container}>
        <CameraView
          onCapture={handleCapture}
          isProcessing={scannerState === 'capturing'}
        />
        {inferenceWebView}
        <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 22, color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
            Escáner de Diagnóstico
          </Text>
        </View>
      </View>
    );
  }

  // Processing
  if (scannerState === 'processing') {
    return (
      <View style={[styles.container, { backgroundColor: colors.skyLight }]}>
        <CameraView onCapture={handleCapture} isProcessing />
        {inferenceWebView}
      </View>
    );
  }

  // Results
  return (
    <View style={styles.container}>
      {inferenceWebView}
      <View style={styles.previewContainer}>
        {capturedUri && (
          <View style={StyleSheet.absoluteFill}>
            <DetectionOverlay
              detections={detections}
              imageWidth={640}
              imageHeight={640}
              previewWidth={screenWidth}
              previewHeight={screenHeight * 0.55}
            />
          </View>
        )}
      </View>

      {/* Results panel */}
      <View
        style={[
          styles.resultsPanel,
          { backgroundColor: colors.surface },
        ]}
      >
        {/* Header */}
        <View style={styles.resultsHeader}>
          <Text
            style={{
              fontFamily: 'Manrope-Bold',
              fontSize: 20,
              color: colors.deepSlate,
            }}
          >
            Resultados
          </Text>
          {detections.length > 0 && (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.clinicalBlue + '20' },
              ]}
            >
              <Text
                style={{
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 12,
                  color: colors.clinicalBlue,
                }}
              >
                {detections.length} condición(es)
              </Text>
            </View>
          )}
        </View>

        {/* Detection list */}
        <ScrollView
          style={styles.detectionList}
          showsVerticalScrollIndicator={false}
        >
          {detections.length === 0 ? (
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 14,
                color: colors.neutral,
                textAlign: 'center',
                marginTop: 20,
              }}
            >
              No se detectaron condiciones dentales
            </Text>
          ) : (
            detections.map((detection, index) => (
              <View
                key={`result-${detection.classId}-${index}`}
                style={[
                  styles.detectionItem,
                  { backgroundColor: colors.borderLight },
                ]}
              >
                <View style={styles.detectionInfo}>
                  <Text
                    style={{
                      fontFamily: 'Inter-SemiBold',
                      fontSize: 14,
                      color: colors.deepSlate,
                    }}
                  >
                    {detection.className}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: colors.neutral,
                      marginTop: 2,
                    }}
                  >
                    Confianza: {(detection.confidence * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Description section */}
        {showDescription && (
          <View
            style={[
              styles.descriptionBox,
              { backgroundColor: colors.borderLight },
            ]}
          >
            {loadingDescription ? (
              <View style={{ alignItems: 'center', padding: 12 }}>
                <ActivityIndicator size="small" color={colors.clinicalBlue} />
                <Text
                  style={{
                    fontFamily: 'Inter',
                    fontSize: 12,
                    color: colors.neutral,
                    marginTop: 8,
                  }}
                >
                  Obteniendo descripción...
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  fontFamily: 'Inter',
                  fontSize: 13,
                  color: colors.deepSlate,
                  lineHeight: 20,
                }}
              >
                {description}
              </Text>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            testID="capture-another"
            style={[
              styles.secondaryButton,
              { borderColor: colors.clinicalBlue },
            ]}
            onPress={handleRetake}
          >
            <Ionicons name="camera-outline" size={20} color={colors.clinicalBlue} />
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 14,
                color: colors.clinicalBlue,
                marginLeft: 6,
              }}
            >
              Capturar otra
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="view-description"
            style={[
              styles.secondaryButton,
              { borderColor: colors.successTeal },
            ]}
            onPress={handleViewDescription}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.successTeal} />
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 14,
                color: colors.successTeal,
                marginLeft: 6,
              }}
            >
              {description && showDescription ? 'Ocultar descripción' : 'Ver descripción'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="save-diagnosis"
            style={[
              styles.primaryButton,
              { backgroundColor: colors.clinicalBlue },
            ]}
            onPress={handleSaveDiagnosis}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                <Text
                  style={{
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 14,
                    color: '#FFFFFF',
                    marginLeft: 6,
                  }}
                >
                  Guardar diagnóstico
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  resultsPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '55%',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detectionList: {
    maxHeight: 120,
    marginBottom: 12,
  },
  detectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  detectionInfo: {
    flex: 1,
  },
  descriptionBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  actionButtons: {
    gap: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
});

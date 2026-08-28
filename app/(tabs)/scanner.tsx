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
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, createShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/hooks/useAuth';
import { useBadges } from '@/src/hooks/useBadges';
import { getSupabase } from '@/src/lib/supabase';
import type { Database } from '@/src/types/supabase';
import { File } from 'expo-file-system';
import CameraView from '@/components/CameraView';
import DetectionOverlay from '@/components/DetectionOverlay';
import {
  processImage,
  loadModel,
  setWebViewRef,
  handleWebViewMessage,
  type Detection,
} from '@/src/services/yolo';
import { retrieveRelevantChunks, generatePrompt } from '@/src/services/rag';
import { sendMessage } from '@/src/services/groq';

// Blinking AI diagnostic badge helper
function BlinkingPill() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.iaBadge, { opacity: visible ? 1 : 0.6 }]}>
      <View style={styles.iaDot} />
      <Text style={styles.iaText}>IA DIAGNÓSTICO ACTIVA</Text>
    </View>
  );
}

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

  // Forwards messages to the YOLO service and loads the TFLite model once the
  // inference runtime signals it is ready (required before any inference).
  const handleInferenceMessage = useCallback((event: any) => {
    handleWebViewMessage(event);
    try {
      const data = JSON.parse(event.nativeEvent?.data || event.data);
      if (data.type === 'ready') {
        loadModel().catch((err) => console.warn('YOLO load failed:', err?.message));
      }
    } catch {
      // ignore malformed messages
    }
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

  // ── Upload captured image to Supabase Storage ──────────────────────────

  const uploadDiagnosisImage = useCallback(async (uri: string, userId: string): Promise<string | null> => {
    const supabase = getSupabase();
    if (!supabase) return null;
    try {
      const file = new File(uri);
      const bytes = await file.bytes();
      // Upload into the owner's folder to satisfy the storage RLS policy.
      const name = `${userId}/diagnosis-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('diagnosis-images')
        .upload(name, bytes as unknown as ArrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      if (error) throw error;
      return supabase.storage.from('diagnosis-images').getPublicUrl(data.path).data.publicUrl;
    } catch (err) {
      console.warn('Diagnosis image upload failed:', err);
      return null;
    }
  }, []);

  // ── Save diagnosis ─────────────────────────────────────────────────────

  const handleSaveDiagnosis = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    const supabase = getSupabase();

    try {
      // Persist the capture to Storage so the history points to a durable URL.
      const imageUrl = supabase && capturedUri ? await uploadDiagnosisImage(capturedUri, user.id) : null;

      if (supabase) {
        const { error } = await supabase
          .from('diagnosis_sessions')
          .insert({
            profile_id: user.id,
            image_url: imageUrl,
            detected_objects: detections as unknown as Database['public']['Tables']['diagnosis_sessions']['Insert']['detected_objects'],
            clinical_notes: null,
          });
        if (error) throw error;
      }

      // Award badge for first diagnosis
      await checkAndAwardBadge('diagnosis', 1);
      setSaving(false);
    } catch (error) {
      console.warn('Failed to save diagnosis:', error);
      setSaving(false);
      Alert.alert('Error', 'No se pudo guardar el diagnóstico. Intenta de nuevo.');
    }
  }, [user, capturedUri, detections, checkAndAwardBadge, uploadDiagnosisImage]);

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
      onMessage={handleInferenceMessage}
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

        {/* Floating Top HUD */}
        <SafeAreaView style={styles.hudOverlay} edges={['top']}>
          <View style={styles.hudRow}>
            <View style={styles.hudPill}>
              <MaterialCommunityIcons name="shield-check" size={12} color="#0077B6" />
              <Text style={styles.hudPillText}>PROTOCOLO DENTY-VISION</Text>
            </View>
            <View style={styles.hudPill}>
              <MaterialCommunityIcons name="speedometer" size={12} color="#006B5F" />
              <Text style={styles.hudPillText}>LATENCIA: 12ms</Text>
            </View>
          </View>
          <BlinkingPill />
        </SafeAreaView>

        {/* Neon target frames for clinical alignment */}
        <View style={styles.targetContainer} pointerEvents="none">
          <View style={styles.targetCornerTopLeft} />
          <View style={styles.targetCornerTopRight} />
          <View style={styles.targetCornerBottomLeft} />
          <View style={styles.targetCornerBottomRight} />
          <View style={styles.targetHintBadge}>
            <Text style={styles.targetHintText}>Alinea la dentadura dentro del recuadro</Text>
          </View>
        </View>

        {/* Title display overlay */}
        <View style={{ position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }}>
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 20, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 }}>
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
          <>
            <Image
              source={{ uri: capturedUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <View style={StyleSheet.absoluteFill}>
              <DetectionOverlay
                detections={detections}
                imageWidth={640}
                imageHeight={640}
                previewWidth={screenWidth}
                previewHeight={screenHeight * 0.55}
              />
            </View>
          </>
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
            detections.map((detection, index) => {
              const isSevere = detection.className.toLowerCase().includes('caries') || 
                               detection.className.toLowerCase().includes('cálculo');
              const barColor = isSevere ? '#C0392B' : colors.clinicalBlue;
              return (
                <View
                  key={`result-${detection.classId}-${index}`}
                  style={[
                    styles.detectionItem,
                    {
                      backgroundColor: colors.surface,
                      borderLeftColor: barColor,
                      borderLeftWidth: 4,
                      borderColor: colors.borderLight,
                      borderWidth: 1,
                      borderBottomWidth: 3,
                    },
                  ]}
                >
                  <View style={styles.detectionInfo}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text
                        style={{
                          fontFamily: 'Manrope-Bold',
                          fontSize: 13,
                          color: colors.deepSlate,
                        }}
                      >
                        {detection.className}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Inter-Bold',
                          fontSize: 11,
                          color: barColor,
                        }}
                      >
                        {(detection.confidence * 100).toFixed(0)}% confianza
                      </Text>
                    </View>
                    
                    {/* Confidence progress bar */}
                    <View style={[styles.confidenceTrack, { backgroundColor: colors.borderLight }]}>
                      <View
                        style={[
                          styles.confidenceFill,
                          {
                            width: `${detection.confidence * 100}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Description section */}
        {showDescription && (
          <View
            style={[
              styles.descriptionBox,
              { 
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.borderLight,
                borderLeftWidth: 4,
                borderLeftColor: colors.successTeal,
                borderBottomWidth: 3,
              },
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
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              testID="capture-another"
              style={[
                styles.secondaryButton,
                { 
                  borderColor: colors.borderLight,
                  backgroundColor: colors.surface,
                  borderBottomWidth: 4,
                  flex: 1,
                },
              ]}
              onPress={handleRetake}
            >
              <Ionicons name="camera-outline" size={18} color={colors.clinicalBlue} />
              <Text
                style={{
                  fontFamily: 'Inter-Bold',
                  fontSize: 13,
                  color: colors.clinicalBlue,
                  marginLeft: 6,
                }}
              >
                Cámara
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="view-description"
              style={[
                styles.secondaryButton,
                { 
                  borderColor: colors.borderLight,
                  backgroundColor: colors.surface,
                  borderBottomWidth: 4,
                  flex: 1.2,
                },
              ]}
              onPress={handleViewDescription}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.successTeal} />
              <Text
                style={{
                  fontFamily: 'Inter-Bold',
                  fontSize: 13,
                  color: colors.successTeal,
                  marginLeft: 6,
                }}
              >
                {description && showDescription ? 'Ocultar Info' : 'Ver Info RAG'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="save-diagnosis"
            style={[
              styles.primaryButton,
              { 
                backgroundColor: colors.clinicalBlue,
                borderColor: '#005C8A',
                borderWidth: 1,
                borderBottomWidth: 5,
              },
            ]}
            onPress={handleSaveDiagnosis}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontSize: 14,
                    color: '#FFFFFF',
                    marginLeft: 6,
                  }}
                >
                  Guardar en Historial Clínico
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
  hudOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
    alignItems: 'center',
    gap: 8,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  hudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 28, 30, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hudPillText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: '#FFFFFF',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  iaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 57, 43, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  iaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  iaText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  targetContainer: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    width: '80%',
    height: '40%',
    zIndex: 5,
  },
  targetCornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#0077B6',
  },
  targetCornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#0077B6',
  },
  targetCornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#0077B6',
  },
  targetCornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#0077B6',
  },
  targetHintBadge: {
    position: 'absolute',
    bottom: -32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  targetHintText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
    backgroundColor: 'rgba(25, 28, 30, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultsPanel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '55%',
    ...createShadow(4, -12, '#000000', 0.08),
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
    maxHeight: 180,
    marginBottom: 16,
  },
  detectionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  detectionInfo: {
    flex: 1,
  },
  confidenceTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  descriptionBox: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
});

/**
 * ScannerScreen — Escáner de diagnóstico (boceto dentify.pen).
 *
 * Cámara enmarcada con overlay de alineación, disparador externo, tarjeta de
 * resultado con confianza y descripción educativa (RAG), y guardado en
 * Supabase. Sin datos falsos de latencia: se muestra el estado real del modelo.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import CameraView, { type CameraViewHandle } from '@/components/CameraView';
import DetectionOverlay from '@/components/DetectionOverlay';
import { Colors, createShadow } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useBadges } from '@/src/hooks/useBadges';
import { getSupabase } from '@/src/lib/supabase';
import type { Database } from '@/src/types/supabase';
import { File } from 'expo-file-system';
import {
  processImage,
  loadModel,
  setWebViewRef,
  handleWebViewMessage,
  type Detection,
} from '@/src/services/yolo';
import { retrieveRelevantChunks, generatePrompt } from '@/src/services/rag';
import { sendMessage } from '@/src/services/groq';

type ScannerState = 'idle' | 'capturing' | 'processing' | 'results';

export default function ScannerScreen() {
  const { user } = useAuth();
  const { checkAndAwardBadge } = useBadges();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const cameraRef = useRef<CameraViewHandle>(null);
  const inferenceWebViewRef = useRef<WebView | null>(null);

  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [detections, setDetections] = useState<Detection[]>([]);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState<string | null>(null);
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  const cameraHeight = Math.min(460, Math.max(300, height * 0.45));

  const handleInferenceWebViewRef = useCallback((ref: WebView | null) => {
    inferenceWebViewRef.current = ref;
    setWebViewRef(ref);
  }, []);

  const handleInferenceMessage = useCallback((event: any) => {
    handleWebViewMessage(event);
    try {
      const data = JSON.parse(event.nativeEvent?.data || event.data);
      if (data.type === 'ready') {
        loadModel()
          .then(() => setModelReady(true))
          .catch((err) => console.warn('YOLO load failed:', err?.message));
      }
    } catch {
      // ignore malformed messages
    }
  }, []);

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

  const handleShutter = useCallback(async () => {
    const uri = await cameraRef.current?.capture();
    if (uri) void handleCapture(uri);
  }, [handleCapture]);

  const handleRetake = useCallback(() => {
    setDetections([]);
    setCapturedUri(null);
    setDescription(null);
    setShowDescription(false);
    setScannerState('idle');
  }, []);

  const uploadDiagnosisImage = useCallback(
    async (uri: string, userId: string): Promise<string | null> => {
      const supabase = getSupabase();
      if (!supabase) return null;
      try {
        const file = new File(uri);
        const bytes = await file.bytes();
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
    },
    []
  );

  const handleSaveDiagnosis = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const supabase = getSupabase();
    try {
      const imageUrl =
        supabase && capturedUri ? await uploadDiagnosisImage(capturedUri, user.id) : null;

      if (supabase) {
        const { error } = await supabase.from('diagnosis_sessions').insert({
          profile_id: user.id,
          image_url: imageUrl,
          detected_objects:
            detections as unknown as Database['public']['Tables']['diagnosis_sessions']['Insert']['detected_objects'],
          clinical_notes: null,
        });
        if (error) throw error;
      }

      await checkAndAwardBadge('diagnosis', 1);
      setSaving(false);
      Alert.alert('Guardado', 'Diagnóstico guardado en tu historial.');
    } catch (error) {
      console.warn('Failed to save diagnosis:', error);
      setSaving(false);
      Alert.alert('Error', 'No se pudo guardar el diagnóstico. Intenta de nuevo.');
    }
  }, [user, capturedUri, detections, checkAndAwardBadge, uploadDiagnosisImage]);

  const handleViewDescription = useCallback(async () => {
    if (description) {
      setShowDescription((prev) => !prev);
      return;
    }
    setLoadingDescription(true);
    setShowDescription(true);
    try {
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

  const targetOverlay = (
    <View style={styles.targetOverlay} pointerEvents="none">
      <View style={styles.targetCornerTL} />
      <View style={styles.targetCornerTR} />
      <View style={styles.targetCornerBL} />
      <View style={styles.targetCornerBR} />
      <View style={styles.targetHintBadge}>
        <Text style={styles.targetHintText}>Alinea la dentadura dentro del recuadro</Text>
      </View>
    </View>
  );

  // Estados idle / capturing / processing: cámara + disparador.
  if (scannerState !== 'results') {
    return (
      <ScreenContainer style={styles.flex} edges={['top']}>
        <AppHeader variant="title" title="Escáner" />
        {inferenceWebView}

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollCenter}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.scrollContent, styles.scrollWrap]}>
          <Text style={styles.caption}>DIAGNÓSTICO POR VISIÓN</Text>

          <View style={[styles.cameraCard, { height: cameraHeight }]}>
            <CameraView
              ref={cameraRef}
              onCapture={handleCapture}
              isProcessing={scannerState === 'processing'}
              framed
            />
            {targetOverlay}
            {scannerState === 'processing' && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.processingText}>Analizando imagen...</Text>
              </View>
            )}
          </View>

          <View style={styles.modelStatusRow}>
            <View style={[styles.statusDot, { backgroundColor: modelReady ? Colors.successTeal : Colors.neutral }]} />
            <Text style={styles.modelStatusText}>
              {modelReady ? 'Modelo YOLO cargado en el dispositivo' : 'Cargando modelo YOLO...'}
            </Text>
          </View>

          <View style={styles.shutter}>
            <TouchableOpacity
              testID="capture-button"
              onPress={handleShutter}
              disabled={scannerState === 'processing'}
              style={[styles.shutterBtn, { opacity: scannerState === 'processing' ? 0.6 : 1 }]}
              accessibilityLabel="Capturar diagnóstico"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="camera" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.shutterText}>Capturar diagnóstico</Text>
          </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Estado results: imagen + tarjeta de resultado + acciones.
  return (
    <ScreenContainer style={styles.flex} edges={['top']}>
      <AppHeader variant="title" title="Escáner" />
      {inferenceWebView}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollCenter}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.scrollContent, styles.scrollWrap]}>
        <Text style={styles.caption}>DIAGNÓSTICO POR VISIÓN</Text>

        <View style={[styles.previewCard, { height: cameraHeight }]}>
          {capturedUri && (
            <>
              <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={StyleSheet.absoluteFill}>
                <DetectionOverlay
                  detections={detections}
                  imageWidth={640}
                  imageHeight={640}
                  previewWidth={width - 48}
                  previewHeight={cameraHeight}
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultTag}>DETECCIÓN</Text>

          {detections.length === 0 ? (
            <Text style={styles.resultEmpty}>
              No se detectaron condiciones dentales en la imagen.
            </Text>
          ) : (
            detections.map((detection, index) => {
              const isSevere =
                detection.className.toLowerCase().includes('caries') ||
                detection.className.toLowerCase().includes('cálculo');
              const barColor = isSevere ? '#C0392B' : Colors.clinicalBlue;
              return (
                <View key={`result-${detection.classId}-${index}`} style={styles.detectionRow}>
                  <View style={styles.detectionTop}>
                    <Text style={styles.detectionName}>{detection.className}</Text>
                    <View style={[styles.pctBadge, { backgroundColor: barColor + '18' }]}>
                      <Text style={[styles.pctText, { color: barColor }]}>
                        {(detection.confidence * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.confidenceTrack, { backgroundColor: Colors.borderLight }]}>
                    <View
                      style={[
                        styles.confidenceFill,
                        { width: `${detection.confidence * 100}%`, backgroundColor: barColor },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}

          {showDescription && (
            <View style={styles.descriptionBox}>
              {loadingDescription ? (
                <View style={styles.descriptionLoading}>
                  <ActivityIndicator size="small" color={Colors.clinicalBlue} />
                  <Text style={styles.descriptionLoadingText}>Obteniendo descripción...</Text>
                </View>
              ) : (
                <Text style={styles.descriptionText}>{description}</Text>
              )}
            </View>
          )}

          <View style={styles.sourceRow}>
            <MaterialCommunityIcons name="book-open-variant" size={13} color={Colors.neutral} />
            <Text style={styles.sourceText} numberOfLines={1}>
              Manuales clínicos UNERG · RAG
            </Text>
          </View>

          <View style={styles.actions}>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                testID="capture-another"
                onPress={handleRetake}
                style={styles.secondaryButton}
              >
                <MaterialCommunityIcons name="camera-outline" size={18} color={Colors.clinicalBlue} />
                <Text style={[styles.secondaryText, { color: Colors.clinicalBlue }]}>Cámara</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="view-description"
                onPress={handleViewDescription}
                style={styles.secondaryButton}
              >
                <MaterialCommunityIcons name="information-outline" size={18} color={Colors.successTeal} />
                <Text style={[styles.secondaryText, { color: Colors.successTeal }]}>
                  {description && showDescription ? 'Ocultar Info' : 'Ver Info RAG'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="save-diagnosis"
              onPress={handleSaveDiagnosis}
              disabled={saving || detections.length === 0}
              style={[styles.primaryButton, { opacity: saving || detections.length === 0 ? 0.6 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryText}>Guardar en Historial Clínico</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  scrollCenter: {
    alignItems: 'center',
  },
  scrollWrap: {
    width: '100%',
  },
  caption: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.neutral,
    textTransform: 'uppercase',
  },
  cameraCard: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: Colors.deepSlate,
    ...createShadow(2, 12, '#000000', 0.1),
    elevation: 4,
  },
  targetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  targetCornerTL: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 26,
    height: 26,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FFFFFF',
  },
  targetCornerTR: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 26,
    height: 26,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFFFFF',
  },
  targetCornerBL: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 26,
    height: 26,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FFFFFF',
  },
  targetCornerBR: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 26,
    height: 26,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFFFFF',
  },
  targetHintBadge: {
    position: 'absolute',
    bottom: -12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  targetHintText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
    backgroundColor: 'rgba(25,28,30,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 6,
  },
  processingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  modelStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modelStatusText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: Colors.neutral,
  },
  shutter: {
    alignItems: 'center',
    gap: 6,
  },
  shutterBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.clinicalBlue,
    alignItems: 'center',
    justifyContent: 'center',
    ...createShadow(0, 4, Colors.clinicalBlue, 0.4),
    elevation: 5,
  },
  shutterText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: Colors.neutral,
  },
  previewCard: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#000',
    ...createShadow(2, 12, '#000000', 0.1),
    elevation: 4,
  },
  resultCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    gap: 12,
    ...createShadow(1, 8, '#000000', 0.04),
    elevation: 1,
  },
  resultTag: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.clinicalBlue,
    textTransform: 'uppercase',
  },
  resultEmpty: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: Colors.neutral,
  },
  detectionRow: {
    gap: 6,
  },
  detectionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detectionName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: Colors.deepSlate,
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pctText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
  },
  confidenceTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  descriptionBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.successTeal,
    borderRadius: 16,
    padding: 14,
  },
  descriptionLoading: {
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  descriptionLoadingText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: Colors.neutral,
  },
  descriptionText: {
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.deepSlate,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.sourceFill,
    paddingHorizontal: 10,
  },
  sourceText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: Colors.neutral,
    flexShrink: 1,
  },
  actions: {
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  secondaryText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.clinicalBlue,
  },
  primaryText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});

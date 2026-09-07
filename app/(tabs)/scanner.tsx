/**
 * ScannerScreen — Diagnostic scanner.
 *
 * Framed camera with alignment overlay, external shutter, result card
 * with confidence and an educational description (RAG), saved to
 * Supabase. No fake latency data: the real model state is shown.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import CameraView, { type CameraViewHandle } from '@/components/CameraView';
import DetectionOverlay from '@/components/DetectionOverlay';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
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
import { sendAgentMessage } from '@/src/services/agent';

type ScannerState = 'idle' | 'capturing' | 'processing' | 'results';

export default function ScannerScreen() {
  const { user } = useAuth();
  const { checkAndAwardBadge } = useBadges();
  const { toast } = useFeedback();
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
  const [modelError, setModelError] = useState(false);
  const [inferenceError, setInferenceError] = useState(false);

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
          .then(() => {
            setModelReady(true);
            setModelError(false);
          })
          .catch((err) => {
            console.warn('YOLO load failed:', err?.message);
            setModelError(true);
          });
      }
    } catch {
      // ignore malformed messages
    }
  }, []);

  const retryModel = useCallback(() => {
    setModelError(false);
    setModelReady(false);
    loadModel()
      .then(() => {
        setModelReady(true);
        setModelError(false);
      })
      .catch((err) => {
        console.warn('YOLO load retry failed:', err?.message);
        setModelError(true);
      });
  }, []);

  const handleCapture = useCallback(async (uri: string) => {
    setCapturedUri(uri);
    setScannerState('processing');
    setInferenceError(false);
    try {
      const results = await processImage(uri);
      setDetections(results);
      setScannerState('results');
    } catch (error) {
      console.warn('YOLO inference failed:', error);
      setDetections([]);
      setInferenceError(true);
      setScannerState('results');
    }
  }, []);

  const handleShutter = useCallback(async () => {
    try {
      const uri = await cameraRef.current?.capture();
      if (uri) void handleCapture(uri);
      else toast('La cámara no está lista. Intenta de nuevo.', 'info');
    } catch {
      toast(
        'No se pudo acceder a la cámara. Revisa que el permiso esté concedido en los ajustes del dispositivo.',
        'error'
      );
    }
  }, [handleCapture, toast]);

  const handleRetake = useCallback(() => {
    setDetections([]);
    setCapturedUri(null);
    setDescription(null);
    setShowDescription(false);
    setInferenceError(false);
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
          .upload(name, bytes, {
            contentType: 'image/jpeg',
            upsert: false,
          });
        if (error) throw error;
        // The bucket is private; store the object path (signed URLs are issued
        // when an image actually needs to be displayed).
        return data.path;
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
        });
        if (error) throw error;
      }

      await checkAndAwardBadge('diagnosis', 1);
      setSaving(false);
      toast('Diagnóstico guardado en tu historial.', 'success');
    } catch (error) {
      console.warn('Failed to save diagnosis:', error);
      setSaving(false);
      toast('No se pudo guardar el diagnóstico. Intenta de nuevo.', 'error');
    }
  }, [user, capturedUri, detections, checkAndAwardBadge, uploadDiagnosisImage, toast]);

  const handleViewDescription = useCallback(async () => {
    if (description) {
      setShowDescription((prev) => !prev);
      return;
    }
    setLoadingDescription(true);
    setShowDescription(true);
    try {
      const uniqueConditions = [...new Set(detections.map((d) => d.className))];
      const query = `Describe las siguientes condiciones dentales detectadas: ${uniqueConditions.join(', ')}. Proporciona información clínica relevante sobre cada una, fundamentada en los manuales clínicos.`;
      const response = await sendAgentMessage([{ role: 'user', content: query }]);
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
    <View className="absolute inset-0 z-[5]" style={{ pointerEvents: 'none' }}>
      <View style={{ position: 'absolute', top: 20, left: 20, width: 26, height: 26, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#FFFFFF' }} />
      <View style={{ position: 'absolute', top: 20, right: 20, width: 26, height: 26, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#FFFFFF' }} />
      <View style={{ position: 'absolute', bottom: 20, left: 20, width: 26, height: 26, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#FFFFFF' }} />
      <View style={{ position: 'absolute', bottom: 20, right: 20, width: 26, height: 26, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#FFFFFF' }} />
      <View className="absolute inset-x-0 -bottom-3 items-center">
        <Text className="overflow-hidden rounded-[12px] bg-deep-slate/60 px-3 py-1 font-inter-semibold text-[10px] text-white">
          Alinea la dentadura dentro del recuadro
        </Text>
      </View>
    </View>
  );

  // idle / capturing / processing states: camera + shutter.
  if (scannerState !== 'results') {
    return (
      <ScreenContainer edges={['top']}>
        <AppHeader variant="title" title="Escáner" />
        {inferenceWebView}

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ alignItems: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full gap-4 px-6 pt-3 pb-8">
            <Text className="font-inter-semibold text-[11px] uppercase tracking-[1.2px] text-neutral">
              DIAGNÓSTICO POR VISIÓN
            </Text>

            <View
              className="w-full overflow-hidden rounded-3xl bg-deep-slate"
              style={{ height: cameraHeight, ...createShadow(2, 12, '#000000', 0.1), elevation: 4 }}
            >
              <CameraView
                ref={cameraRef}
                onCapture={handleCapture}
                isProcessing={scannerState === 'processing'}
                framed
              />
              {targetOverlay}
              {scannerState === 'processing' && (
                <View
                  className="absolute inset-0 z-[6] items-center justify-center gap-2.5"
                  style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                >
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text className="font-inter-semibold text-[15px] text-white">
                    Analizando imagen...
                  </Text>
                </View>
              )}
            </View>

            {modelError ? (
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#C0392B" />
                <Text className="flex-1 font-sans text-xs text-error">
                  No se pudo cargar el modelo de visión.
                </Text>
                <TouchableOpacity
                  testID="retry-model"
                  onPress={retryModel}
                  className="flex-row items-center gap-1 rounded-[12px] bg-source-fill px-2.5 py-1.5"
                >
                  <MaterialCommunityIcons name="refresh" size={14} color={Colors.clinicalBlue} />
                  <Text className="font-inter-semibold text-xs text-clinical-blue">Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center gap-1.5">
                <View
                  className={`h-2 w-2 rounded-full ${modelReady ? 'bg-success-teal' : 'bg-neutral'}`}
                />
                <Text className="font-sans text-xs text-neutral">
                  {modelReady ? 'Modelo YOLO cargado en el dispositivo' : 'Cargando modelo YOLO...'}
                </Text>
              </View>
            )}

            <View className="items-center gap-1.5">
              <TouchableOpacity
                testID="capture-button"
                onPress={handleShutter}
                disabled={scannerState === 'processing'}
                className="h-16 w-16 items-center justify-center rounded-full bg-clinical-blue"
                style={{
                  opacity: scannerState === 'processing' ? 0.6 : 1,
                  ...createShadow(0, 4, Colors.clinicalBlue, 0.4),
                  elevation: 5,
                }}
                accessibilityLabel="Capturar diagnóstico"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="camera" size={26} color="#FFFFFF" />
              </TouchableOpacity>
              <Text className="font-sans text-xs text-neutral">Capturar diagnóstico</Text>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // results state: image + result card + actions.
  return (
    <ScreenContainer edges={['top']}>
      <AppHeader variant="title" title="Escáner" />
      {inferenceWebView}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full gap-4 px-6 pt-3 pb-8">
          <Text className="font-inter-semibold text-[11px] uppercase tracking-[1.2px] text-neutral">
            DIAGNÓSTICO POR VISIÓN
          </Text>

          <View
            className="w-full overflow-hidden rounded-3xl bg-black"
            style={{ height: cameraHeight, ...createShadow(2, 12, '#000000', 0.1), elevation: 4 }}
          >
            {capturedUri && (
              <>
                <Image
                  source={{ uri: capturedUri }}
                  className="absolute inset-0"
                  resizeMode="cover"
                />
                <View className="absolute inset-0">
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

          <View
            className="w-full gap-3 rounded-2xl bg-surface p-4"
            style={{ ...createShadow(1, 8, '#000000', 0.04), elevation: 1 }}
          >
            <Text className="font-inter-semibold text-[11px] uppercase tracking-[1.2px] text-clinical-blue">
              DETECCIÓN
            </Text>

            {detections.length === 0 ? (
              inferenceError ? (
                <View className="flex-row flex-wrap items-center gap-2.5 rounded-[12px] border border-error-tint-border bg-error-tint p-3">
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#C0392B" />
                  <Text className="flex-1 font-sans text-[13px] leading-[19px] text-deep-slate">
                    No se pudo analizar la imagen. Revisa que esté bien enfocada e iluminada.
                  </Text>
                  <TouchableOpacity
                    onPress={handleRetake}
                    className="flex-row items-center gap-1 rounded-[12px] bg-source-fill px-2.5 py-1.5"
                  >
                    <MaterialCommunityIcons name="camera-outline" size={14} color={Colors.clinicalBlue} />
                    <Text className="font-inter-semibold text-xs text-clinical-blue">
                      Intentar de nuevo
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text className="font-sans text-sm text-neutral">
                  No se detectaron condiciones dentales en la imagen.
                </Text>
              )
            ) : (
              detections.map((detection, index) => {
                const isSevere =
                  detection.className.toLowerCase().includes('caries') ||
                  detection.className.toLowerCase().includes('cálculo');
                const barColor = isSevere ? '#C0392B' : Colors.clinicalBlue;
                return (
                  <View key={`result-${detection.classId}-${index}`} className="gap-1.5">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-heading-bold text-sm text-deep-slate">
                        {detection.className}
                      </Text>
                      <View
                        className="rounded-[12px] px-2.5 py-[3px]"
                        style={{ backgroundColor: barColor + '18' }}
                      >
                        <Text className="font-inter-bold text-[11px]" style={{ color: barColor }}>
                          {(detection.confidence * 100).toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                    <View className="h-1.5 overflow-hidden rounded-[3px] bg-border-light">
                      <View
                        className="h-full rounded-[3px]"
                        style={{ width: `${detection.confidence * 100}%`, backgroundColor: barColor }}
                      />
                    </View>
                  </View>
                );
              })
            )}

            {showDescription && (
              <View
                className="rounded-[16px] border border-border-light bg-surface p-3.5"
                style={{ borderLeftWidth: 4, borderLeftColor: Colors.successTeal }}
              >
                {loadingDescription ? (
                  <View className="items-center gap-2 p-2">
                    <ActivityIndicator size="small" color={Colors.clinicalBlue} />
                    <Text className="font-sans text-xs text-neutral">
                      Obteniendo descripción...
                    </Text>
                  </View>
                ) : (
                  <Text className="font-sans text-[13px] leading-[20px] text-deep-slate">
                    {description}
                  </Text>
                )}
              </View>
            )}

            <View className="h-7 flex-row items-center gap-1.5 rounded-[14px] bg-source-fill px-2.5">
              <MaterialCommunityIcons name="book-open-variant" size={13} color={Colors.neutral} />
              <Text className="shrink font-sans text-[11px] text-neutral" numberOfLines={1}>
                Manuales clínicos UNERG · RAG
              </Text>
            </View>

            <View className="gap-3">
              <View className="flex-row gap-2.5">
                <TouchableOpacity
                  testID="capture-another"
                  onPress={handleRetake}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-border-light bg-surface py-3"
                >
                  <MaterialCommunityIcons name="camera-outline" size={18} color={Colors.clinicalBlue} />
                  <Text className="font-inter-bold text-[13px] text-clinical-blue">Cámara</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="view-description"
                  onPress={handleViewDescription}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-border-light bg-surface py-3"
                >
                  <MaterialCommunityIcons name="information-outline" size={18} color={Colors.successTeal} />
                  <Text className="font-inter-bold text-[13px] text-success-teal">
                    {description && showDescription ? 'Ocultar Info' : 'Ver Info RAG'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                testID="save-diagnosis"
                onPress={handleSaveDiagnosis}
                disabled={saving || detections.length === 0}
                className="flex-row items-center justify-center gap-2 rounded-[14px] bg-clinical-blue py-3.5"
                style={{ opacity: saving || detections.length === 0 ? 0.6 : 1 }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFFFFF" />
                    <Text className="font-inter-bold text-sm text-white">
                      Guardar en Historial Clínico
                    </Text>
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

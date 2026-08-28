/**
 * SimulatorScreen — 3D Dental Model Simulator
 *
 * Resolves the GLB asset module to a local URI via resolveModelUri()
 * before mounting ModelViewer, ensuring models load on physical devices.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ModelViewer, { type ModelViewerHandle } from '@/components/ModelViewer';
import ModelControls from '@/components/ModelControls';
import ToothSelector from '@/components/ToothSelector';
import { DENTAL_MODELS, FDI_TEETH, getModelModule } from '@/assets/models';
import { Colors, createShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveModelUri } from '@/src/services/modelResolver';
import { isModelCached, cacheModel } from '@/src/services/modelCache';

interface InteractiveSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  colors: any;
}

function InteractiveSlider({ label, value, onChange, colors }: InteractiveSliderProps) {
  const [trackWidth, setTrackWidth] = useState(1);
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderLabelRow}>
        <Text style={[styles.sliderLabelText, { color: colors.neutral }]}>{label}</Text>
        <Text style={[styles.sliderValText, { color: colors.clinicalBlue }]}>{Math.round(value * 100)}%</Text>
      </View>
      <TouchableOpacity
        activeOpacity={1}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width || 1)}
        onPress={(e) => {
          const x = e.nativeEvent.locationX;
          const pct = Math.max(0, Math.min(1, x / trackWidth));
          onChange(Math.round(pct * 20) / 20); // Snap to nearest 5%
        }}
        style={styles.sliderTrackContainer}
      >
        <View style={[styles.sliderTrack, { backgroundColor: colors.borderLight }]}>
          <View style={[styles.sliderFill, { width: `${value * 100}%`, backgroundColor: colors.clinicalBlue }]} />
        </View>
        <View style={[styles.sliderHandle, { left: `${value * 100}%`, backgroundColor: colors.clinicalBlue }]} />
      </TouchableOpacity>
    </View>
  );
}

export default function SimulatorScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [selectedTooth, setSelectedTooth] = useState<number>(11);
  const [autoRotate, setAutoRotate] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const modelViewerRef = useRef<ModelViewerHandle>(null);

  // States for 3D layers visibility and exploded view separation
  const [esmalteOpacity, setEsmalteOpacity] = useState(0.85);
  const [dentinaOpacity, setDentinaOpacity] = useState(1.0);
  const [pulpaOpacity, setPulpaOpacity] = useState(1.0);
  const [exploded, setExploded] = useState(false);

  // Resolved URI for the current tooth model
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [uriLoading, setUriLoading] = useState(true);

  // Anatomical information panel for selected tooth
  const currentModel = DENTAL_MODELS[selectedTooth];

  // Check cache status on mount
  useEffect(() => {
    checkCacheStatus();
  }, []);

  const checkCacheStatus = useCallback(async () => {
    const cached = new Set<string>();
    for (const model of Object.values(DENTAL_MODELS)) {
      const isCached = await isModelCached(model.file);
      if (isCached) cached.add(model.file);
    }
    setCachedModels(cached);
  }, []);

  // Resolve URI whenever selected tooth changes
  useEffect(() => {
    let cancelled = false;
    setModelUri(null);
    setUriLoading(true);
    setSelectedStructure(null);

    // Reset layers state on tooth change
    setEsmalteOpacity(0.85);
    setDentinaOpacity(1.0);
    setPulpaOpacity(1.0);
    setExploded(false);

    const moduleId = getModelModule(selectedTooth);
    if (moduleId === null) {
      setUriLoading(false);
      return;
    }

    resolveModelUri(moduleId)
      .then((uri) => {
        if (!cancelled) {
          setModelUri(uri);
          setUriLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Failed to resolve model URI:', err);
          setUriLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTooth]);

  const handleSelectTooth = useCallback((num: number) => {
    setSelectedTooth(num);
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    modelViewerRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    modelViewerRef.current?.zoomOut();
  }, []);

  const handleReset = useCallback(() => {
    setSelectedStructure(null);
    modelViewerRef.current?.reset();
  }, []);

  const handleStructureSelect = useCallback((name: string | null) => {
    setSelectedStructure(name);
  }, []);

  const handleDownloadAll = useCallback(async () => {
    setIsDownloading(true);
    try {
      const modelFiles = [...new Set(Object.values(DENTAL_MODELS).map((m) => m.file))];
      for (let i = 0; i < modelFiles.length; i++) {
        setDownloadProgress(`Descargando ${i + 1}/${modelFiles.length}...`);
        await cacheModel(modelFiles[i]);
      }
      await checkCacheStatus();
      Alert.alert('Listo', 'Todos los modelos están disponibles sin conexión.');
    } catch {
      Alert.alert('Error', 'No se pudieron descargar todos los modelos.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }, [checkCacheStatus]);

  const isCached = cachedModels.has(currentModel?.file ?? '');

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.skyLight }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.deepSlate }]}>Simulador 3D</Text>
            <Text style={[styles.headerSubtitle, { color: colors.clinicalBlue }]} numberOfLines={1}>
              {currentModel?.name ?? 'Selecciona un diente'}
            </Text>
          </View>

          {/* Offline download button */}
          <TouchableOpacity
            testID="download-all"
            onPress={handleDownloadAll}
            disabled={isDownloading}
            style={[
              styles.downloadButton,
              { backgroundColor: isDownloading ? colors.borderLight : colors.clinicalBlue },
            ]}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.neutral} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="cloud-download-outline"
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.downloadButtonText}>Offline</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {downloadProgress && (
          <Text style={[styles.downloadProgress, { color: colors.clinicalBlue }]}>
            {downloadProgress}
          </Text>
        )}
      </View>

      {/* Cache badge */}
      {isCached && (
        <View style={[styles.cacheBadge, { backgroundColor: '#E8F5F3' }]}>
          <MaterialCommunityIcons name="check-circle-outline" size={13} color="#006B5F" />
          <Text style={[styles.cacheBadgeText, { color: '#006B5F' }]}>Disponible sin conexión</Text>
        </View>
      )}

      {/* Structure label */}
      {selectedStructure && (
        <View style={[styles.structureLabel, { backgroundColor: colors.clinicalBlue }]}>
          <MaterialCommunityIcons name="tooth-outline" size={14} color="#FFFFFF" />
          <Text style={styles.structureLabelText}>{selectedStructure}</Text>
        </View>
      )}

      {/* 3D Viewer */}
      <View style={styles.viewerContainer}>
        {uriLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.clinicalBlue} />
            <Text style={[styles.loadingText, { color: colors.neutral }]}>
              Preparando modelo 3D...
            </Text>
          </View>
        ) : modelUri ? (
          <ModelViewer
            ref={modelViewerRef}
            modelUri={modelUri}
            autoRotate={autoRotate}
            onStructureSelect={handleStructureSelect}
            selectedStructure={selectedStructure}
            esmalteOpacity={esmalteOpacity}
            dentinaOpacity={dentinaOpacity}
            pulpaOpacity={pulpaOpacity}
            exploded={exploded}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.neutral} />
            <Text style={[styles.loadingText, { color: colors.neutral }]}>
              No se pudo cargar el modelo
            </Text>
          </View>
        )}

        {/* Floating Capas Anatómicas card overlay */}
        {!uriLoading && modelUri && (
          <View style={[styles.layersCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(26,29,33,0.94)' : 'rgba(255,255,255,0.88)' }]}>
            <View style={styles.layersHeader}>
              <View style={styles.layersTitleRow}>
                <MaterialCommunityIcons name="layers" size={16} color={colors.clinicalBlue} style={{ marginRight: 6 }} />
                <Text style={[styles.layersTitle, { color: colors.deepSlate }]}>Capas Anatómicas</Text>
              </View>
              <View style={[styles.layersBadge, { backgroundColor: colors.clinicalBlue + '20' }]}>
                <Text style={[styles.layersBadgeText, { color: colors.clinicalBlue }]}>VISUALIZACIÓN</Text>
              </View>
            </View>

            <InteractiveSlider
              label="ESMALTE"
              value={esmalteOpacity}
              onChange={setEsmalteOpacity}
              colors={colors}
            />
            <InteractiveSlider
              label="DENTINA"
              value={dentinaOpacity}
              onChange={setDentinaOpacity}
              colors={colors}
            />
            <InteractiveSlider
              label="PULPA"
              value={pulpaOpacity}
              onChange={setPulpaOpacity}
              colors={colors}
            />

            <TouchableOpacity
              onPress={() => setExploded(!exploded)}
              activeOpacity={0.8}
              style={[
                styles.explodeButton,
                {
                  backgroundColor: exploded ? colors.successTeal : colors.clinicalBlue,
                  borderColor: exploded ? '#004D44' : '#005C8A',
                },
              ]}
            >
              <MaterialCommunityIcons name="arrow-expand-vertical" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.explodeButtonText}>
                {exploded ? 'Contraer Vista' : 'Vista de Explosión'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ModelControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          onToggleAutoRotate={handleToggleAutoRotate}
          autoRotate={autoRotate}
        />
      </View>

      {/* Tooth selector chips */}
      <View style={styles.selectorSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorScroll}
          testID="model-selector"
        >
          {FDI_TEETH.map((num) => {
            const info = DENTAL_MODELS[num];
            const isSelected = selectedTooth === num;
            const cached = cachedModels.has(info.file);
            return (
              <TouchableOpacity
                key={num}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.clinicalBlue : colors.surface,
                    borderColor: cached ? '#006B5F' : isSelected ? colors.clinicalBlue : colors.borderLight,
                  },
                ]}
                onPress={() => handleSelectTooth(num)}
                accessibilityLabel={`Seleccionar ${info.name}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                {cached && !isSelected && (
                  <MaterialCommunityIcons name="check-circle" size={11} color="#006B5F" />
                )}
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#FFFFFF' : colors.deepSlate },
                  ]}
                  numberOfLines={1}
                >
                  {num} — {info.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Odontogram / Tooth grid selector */}
      <View style={styles.toothGrid}>
        <ToothSelector onSelectTooth={handleSelectTooth} selectedTooth={selectedTooth} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 22,
  },
  headerSubtitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    marginTop: 2,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    justifyContent: 'center',
  },
  downloadButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  downloadProgress: {
    fontFamily: 'Inter',
    fontSize: 11,
    marginTop: 4,
  },
  cacheBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 24,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  cacheBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },
  structureLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 24,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
  },
  structureLabelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  viewerContainer: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F7F9FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  selectorSection: {
    paddingVertical: 8,
  },
  selectorScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Inter',
    fontSize: 12,
  },
  toothGrid: {
    paddingBottom: 8,
  },
  layersCard: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(242, 244, 246, 0.4)',
    ...createShadow(4, 12, '#000000', 0.06),
    elevation: 5,
    zIndex: 10,
  },
  layersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  layersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  layersTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
  },
  layersBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  layersBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  explodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderBottomWidth: 4,
    marginTop: 4,
    ...createShadow(2, 6, '#000000', 0.05),
    elevation: 3,
  },
  explodeButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  sliderRow: {
    marginBottom: 6,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sliderLabelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  sliderValText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },
  sliderTrackContainer: {
    height: 18,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  sliderFill: {
    height: '100%',
  },
  sliderHandle: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    top: 2,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...createShadow(1, 4, '#000000', 0.15),
    elevation: 2,
  },
});

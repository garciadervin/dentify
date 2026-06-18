/**
 * SimulatorScreen — 3D Dental Model Simulator
 *
 * Displays a 3D model viewer with tooth selection, model controls,
 * structure selection labels, and offline model caching.
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import ModelViewer from '@/components/ModelViewer';
import ModelControls from '@/components/ModelControls';
import ToothSelector from '@/components/ToothSelector';
import { DENTAL_MODELS, FDI_TEETH, getModelModule } from '@/assets/models';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isModelCached, cacheModel, getCacheStats } from '@/src/services/modelCache';

export default function SimulatorScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);

  // Check cache status on mount
  useEffect(() => {
    checkCacheStatus();
  }, []);

  const checkCacheStatus = useCallback(async () => {
    const cached: Set<string> = new Set();
    for (const [, model] of Object.entries(DENTAL_MODELS)) {
      const isCached = await isModelCached(model.file);
      if (isCached) cached.add(model.file);
    }
    setCachedModels(cached);
  }, []);

  const currentModel = selectedTooth ? DENTAL_MODELS[selectedTooth] : null;
  const [modelId, setModelId] = useState<number | null>(null);

  // Set initial model ID after mount
  useEffect(() => {
    const toothNum = currentModel ? selectedTooth! : 11;
    const id = getModelModule(toothNum);
    setModelId(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update model ID when tooth selection changes
  useEffect(() => {
    const toothNum = currentModel ? selectedTooth! : 11;
    const id = getModelModule(toothNum);
    if (id !== null) setModelId(id);
  }, [selectedTooth, currentModel]);

  const handleSelectTooth = useCallback((num: number) => {
    setSelectedTooth(num);
    setSelectedStructure(null);
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.2, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.2, 0.3));
  }, []);

  const handleReset = useCallback(() => {
    setSelectedStructure(null);
  }, []);

  const handleStructureSelect = useCallback((name: string | null) => {
    setSelectedStructure(name);
  }, []);

  /**
   * Download all models for offline use.
   */
  const handleDownloadAll = useCallback(async () => {
    setIsDownloading(true);
    try {
      const modelFiles = Object.values(DENTAL_MODELS).map((m) => m.file);
      const uniqueFiles = [...new Set(modelFiles)];

      for (let i = 0; i < uniqueFiles.length; i++) {
        const file = uniqueFiles[i];
        setDownloadProgress(`Descargando ${i + 1}/${uniqueFiles.length}...`);
        await cacheModel(file);
      }

      await checkCacheStatus();
      Alert.alert('Completado', 'Todos los modelos están disponibles offline.');
    } catch {
      Alert.alert('Error', 'No se pudieron descargar todos los modelos.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }, [checkCacheStatus]);

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.skyLight }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.deepSlate }]}>Simulador 3D</Text>
            {currentModel ? (
              <Text style={[styles.headerSubtitle, { color: colors.clinicalBlue }]}>
                {currentModel.name}
              </Text>
            ) : (
              <Text style={[styles.headerSubtitle, { color: colors.neutral }]}>
                Selecciona un diente
              </Text>
            )}
          </View>
          {/* Download all button */}
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
              <Text style={[styles.downloadButtonText, { color: isDownloading ? colors.neutral : '#FFFFFF' }]}>
                Offline
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {downloadProgress && (
          <Text style={[styles.downloadProgress, { color: colors.clinicalBlue }]}>
            {downloadProgress}
          </Text>
        )}
      </View>

      {/* Selected structure label */}
      {selectedStructure && (
        <View style={[styles.structureLabel, { backgroundColor: colors.clinicalBlue }]}>
          <Text style={styles.structureLabelText}>{selectedStructure}</Text>
        </View>
      )}

      {/* 3D Viewer area */}
      <View style={styles.viewerContainer}>
        {modelId !== null ? (
          <ModelViewer
            modelId={modelId}
            autoRotate={autoRotate}
            zoom={zoom}
            onStructureSelect={handleStructureSelect}
            selectedStructure={selectedStructure}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.clinicalBlue} />
            <Text style={[styles.loadingText, { color: colors.neutral }]}>Cargando modelo 3D...</Text>
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

      {/* Model selector — horizontal scroll of tooth names */}
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
            const isCached = cachedModels.has(info.file);
            return (
              <TouchableOpacity
                key={num}
                style={[
                  styles.selectorChip,
                  isSelected && styles.selectorChipSelected,
                  { borderColor: isCached ? colors.successTeal : colors.borderLight },
                ]}
                onPress={() => handleSelectTooth(num)}
                accessibilityLabel={`Seleccionar ${info.name}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {isCached && <Ionicons name="download-outline" size={12} color={colors.successTeal} />}
                  <Text
                    style={[
                      styles.selectorChipText,
                      isSelected && styles.selectorChipTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {num} — {info.name}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tooth selector grid */}
      <View style={styles.toothSelectorContainer}>
        <ToothSelector onSelectTooth={handleSelectTooth} selectedTooth={selectedTooth} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  downloadButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  downloadProgress: {
    fontFamily: 'Inter',
    fontSize: 11,
    marginTop: 4,
  },
  structureLabel: {
    marginHorizontal: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  structureLabelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  viewerContainer: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F7F9FB',
  },
  selectorSection: {
    paddingVertical: 8,
  },
  selectorScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  selectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F2F4F6',
  },
  selectorChipSelected: {
    backgroundColor: '#0077B6',
    borderColor: '#0077B6',
  },
  selectorChipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#191C1E',
  },
  selectorChipTextSelected: {
    color: '#FFFFFF',
  },
  toothSelectorContainer: {
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter',
    fontSize: 14,
    marginTop: 12,
  },
});

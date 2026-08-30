/**
 * SimulatorScreen — 3D Simulator.
 *
 * 3D viewer with structure selection via raycast or chips (Crown, Neck,
 * Root, Pulp) and an educational info card. Selector for the 16 models
 * (odontogram) and offline download with a mobile-data gate.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import ModelViewer, { type ModelViewerHandle } from '@/components/ModelViewer';
import ModelControls from '@/components/ModelControls';
import ToothSelector from '@/components/ToothSelector';
import { DENTAL_MODELS, MODEL_LIST, getModelModule } from '@/assets/models';
import { TOOTH_STRUCTURES, findStructure } from '@/src/data/structures';
import { Colors, createShadow } from '@/constants/theme';
import { useSettings } from '@/src/hooks/useSettings';
import { resolveModelUri } from '@/src/services/modelResolver';
import { isModelCached, cacheModel } from '@/src/services/modelCache';

async function isCellularConnection(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.type === Network.NetworkStateType.CELLULAR;
  } catch {
    return false;
  }
}

export default function SimulatorScreen() {
  const colors = Colors;
  const { width } = useWindowDimensions();
  const { settings } = useSettings();

  const [selectedTooth, setSelectedTooth] = useState<number>(11);
  const [autoRotate, setAutoRotate] = useState(settings.autoRotate);
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const modelViewerRef = useRef<ModelViewerHandle>(null);

  const [modelUri, setModelUri] = useState<string | null>(null);
  const [uriLoading, setUriLoading] = useState(true);

  const currentModel = DENTAL_MODELS[selectedTooth];
  const viewerHeight = Math.min(430, Math.max(320, width - 48));

  // Sync auto-rotate with the setting on load.
  useEffect(() => {
    setAutoRotate(settings.autoRotate);
  }, [settings.autoRotate]);

  // Verify model cache on mount.
  useEffect(() => {
    checkCacheStatus();
  }, []);

  const checkCacheStatus = useCallback(async () => {
    const cached = new Set<string>();
    for (const model of MODEL_LIST) {
      const isCached = await isModelCached(model.file);
      if (isCached) cached.add(model.file);
    }
    setCachedModels(cached);
  }, []);

  // Resolve the model URI when the tooth changes.
  useEffect(() => {
    let cancelled = false;
    setModelUri(null);
    setUriLoading(true);
    setSelectedStructure(null);

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

  const doDownloadAll = useCallback(async () => {
    setIsDownloading(true);
    try {
      const modelFiles = MODEL_LIST.map((m) => m.file);
      for (let i = 0; i < modelFiles.length; i++) {
        setDownloadProgress(`Descargando ${i + 1}/${modelFiles.length}...`);
        await cacheModel(modelFiles[i]);
      }
      await checkCacheStatus();
      Alert.alert('Listo', 'Los 16 modelos están disponibles sin conexión.');
    } catch {
      Alert.alert('Error', 'No se pudieron descargar todos los modelos.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }, [checkCacheStatus]);

  const handleDownloadAll = useCallback(async () => {
    if ((await isCellularConnection()) && !settings.cellularDownloads) {
      Alert.alert(
        'Datos móviles',
        'Estás usando datos móviles. ¿Descargar los 16 modelos de todos modos?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Descargar', onPress: () => doDownloadAll() },
        ]
      );
      return;
    }
    doDownloadAll();
  }, [doDownloadAll, settings.cellularDownloads]);

  const isCached = cachedModels.has(currentModel?.file ?? '');
  const info = selectedStructure
    ? (findStructure(selectedStructure) ?? {
        name: selectedStructure,
        description:
          'Parte anatómica del diente seleccionada en el modelo 3D. Toca otra zona para explorar más estructuras.',
      })
    : null;

  return (
    <ScreenContainer scroll edges={['top']}>
      <AppHeader
        variant="title"
        title="Simulador 3D"
        subtitle={isCached ? 'Disponible sin conexión' : undefined}
        right={
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
                <MaterialCommunityIcons name="cloud-download-outline" size={14} color="#FFFFFF" />
                <Text style={styles.downloadButtonText}>Offline</Text>
              </>
            )}
          </TouchableOpacity>
        }
      />

      {downloadProgress && (
        <Text style={styles.downloadProgress}>{downloadProgress}</Text>
      )}

      <View style={styles.content}>
        {/* Tooth caption */}
        <Text style={styles.caption}>
          {(currentModel?.name ?? 'Selecciona un diente').toUpperCase()} ·{' '}
          {(currentModel?.arch === 'superior' ? 'ARCADA SUPERIOR' : 'ARCADA INFERIOR').toUpperCase()}
        </Text>

        {/* Viewer 3D */}
        <View style={[styles.viewer, { height: viewerHeight }]}>
          {uriLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.clinicalBlue} />
              <Text style={styles.loadingText}>Preparando modelo 3D...</Text>
            </View>
          ) : modelUri ? (
            <ModelViewer
              ref={modelViewerRef}
              modelUri={modelUri}
              autoRotate={autoRotate}
              onStructureSelect={handleStructureSelect}
              selectedStructure={selectedStructure}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.neutral} />
              <Text style={styles.loadingText}>No se pudo cargar el modelo</Text>
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

        {/* Chips de estructura */}
        <View style={styles.chipsRow}>
          {TOOTH_STRUCTURES.map((structure) => {
            const isActive =
              !!selectedStructure && selectedStructure.toLowerCase() === structure.name.toLowerCase();
            return (
              <TouchableOpacity
                key={structure.id}
                testID={`structure-chip-${structure.id}`}
                onPress={() => handleStructureSelect(isActive ? null : structure.name)}
                style={[
                  styles.chip,
                  isActive
                    ? { backgroundColor: colors.clinicalBlue, borderColor: colors.clinicalBlue }
                    : { backgroundColor: colors.surface, borderColor: colors.borderLight },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isActive ? '#FFFFFF' : colors.deepSlate },
                  ]}
                >
                  {structure.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* InfoCard de estructura */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTag}>
            {info ? 'ESTRUCTURA SELECCIONADA' : 'CÓMO EXPLORAR'}
          </Text>
          <Text style={styles.infoTitle}>{info?.name ?? 'Selecciona una estructura'}</Text>
          <Text style={styles.infoDesc}>
            {info?.description ??
              'Toca el modelo 3D o elige un chip de estructura para ver su descripción anatómica.'}
          </Text>
        </View>

        {/* Hint de gestos */}
        <View style={styles.controls}>
          <MaterialCommunityIcons name="rotate-3d" size={15} color={colors.neutral} />
          <Text style={styles.controlsText}>
            Arrastra para rotar · Pellizca para acercar · Toca para seleccionar
          </Text>
        </View>

        {/* Selector de modelo (16 dientes) */}
        <Text style={styles.sectionLabel}>ELEGIR PIEZA DENTAL</Text>
        <ToothSelector onSelectTooth={handleSelectTooth} selectedTooth={selectedTooth} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 16,
  },
  downloadProgress: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: Colors.clinicalBlue,
    paddingHorizontal: 24,
    marginTop: -6,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 72,
    justifyContent: 'center',
  },
  downloadButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  caption: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.neutral,
    textTransform: 'uppercase',
  },
  viewer: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: Colors.skyLight,
    position: 'relative',
    ...createShadow(2, 12, '#000000', 0.06),
    elevation: 3,
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
    color: Colors.neutral,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  infoCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    gap: 6,
    ...createShadow(1, 8, '#000000', 0.04),
    elevation: 1,
  },
  infoTag: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.clinicalBlue,
    textTransform: 'uppercase',
  },
  infoTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: Colors.deepSlate,
  },
  infoDesc: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.neutral,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  controlsText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: Colors.neutral,
  },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.neutral,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});

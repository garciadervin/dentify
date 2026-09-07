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
import { useFeedback } from '@/components/feedback/FeedbackProvider';

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
  const { toast, confirm } = useFeedback();

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

  const checkCacheStatus = useCallback(async () => {
    const cached = new Set<string>();
    for (const model of MODEL_LIST) {
      const isCached = await isModelCached(model.file);
      if (isCached) cached.add(model.file);
    }
    setCachedModels(cached);
  }, []);

  // Verify model cache on mount.
  useEffect(() => {
    checkCacheStatus();
  }, [checkCacheStatus]);

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
      toast('Los 16 modelos están disponibles sin conexión.', 'success');
    } catch {
      toast('No se pudieron descargar todos los modelos.', 'error');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }, [checkCacheStatus, toast]);

  const handleDownloadAll = useCallback(async () => {
    if ((await isCellularConnection()) && !settings.cellularDownloads) {
      const ok = await confirm({
        title: 'Datos móviles',
        message: 'Estás usando datos móviles. ¿Descargar los 16 modelos de todos modos?',
        confirmLabel: 'Descargar',
        cancelLabel: 'Cancelar',
      });
      if (!ok) return;
    }
    doDownloadAll();
  }, [doDownloadAll, settings.cellularDownloads, confirm]);

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
            className={`min-w-[72px] flex-row items-center justify-center gap-1 rounded-[20px] px-3 py-2 ${
              isDownloading ? 'bg-border-light' : 'bg-clinical-blue'
            }`}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.neutral} />
            ) : (
              <>
                <MaterialCommunityIcons name="cloud-download-outline" size={14} color="#FFFFFF" />
                <Text className="font-inter-semibold text-xs text-white">Offline</Text>
              </>
            )}
          </TouchableOpacity>
        }
      />

      {downloadProgress && (
        <Text className="-mt-1.5 px-6 font-sans text-[11px] text-clinical-blue">
          {downloadProgress}
        </Text>
      )}

      <View className="gap-4 px-6 pt-3">
        {/* Tooth caption */}
        <Text className="font-inter-semibold text-[11px] uppercase tracking-[1.2px] text-neutral">
          {(currentModel?.name ?? 'Selecciona un diente').toUpperCase()} ·{' '}
          {(currentModel?.arch === 'superior' ? 'ARCADA SUPERIOR' : 'ARCADA INFERIOR').toUpperCase()}
        </Text>

        {/* Viewer 3D */}
        <View
          className="relative overflow-hidden rounded-3xl bg-sky-light"
          style={{ height: viewerHeight, ...createShadow(2, 12, '#000000', 0.06), elevation: 3 }}
        >
          {uriLoading ? (
            <View className="flex-1 items-center justify-center gap-3">
              <ActivityIndicator size="large" color={colors.clinicalBlue} />
              <Text className="font-sans text-sm text-neutral">Preparando modelo 3D...</Text>
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
            <View className="flex-1 items-center justify-center gap-3">
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.neutral} />
              <Text className="font-sans text-sm text-neutral">No se pudo cargar el modelo</Text>
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
        <View className="flex-row flex-wrap gap-2">
          {TOOTH_STRUCTURES.map((structure) => {
            const isActive =
              !!selectedStructure && selectedStructure.toLowerCase() === structure.name.toLowerCase();
            return (
              <TouchableOpacity
                key={structure.id}
                testID={`structure-chip-${structure.id}`}
                onPress={() => handleStructureSelect(isActive ? null : structure.name)}
                className={`h-9 items-center justify-center rounded-[18px] border px-4 ${
                  isActive ? 'border-clinical-blue bg-clinical-blue' : 'border-border-light bg-surface'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  className={`font-inter-semibold text-[13px] ${
                    isActive ? 'text-white' : 'text-deep-slate'
                  }`}
                >
                  {structure.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* InfoCard de estructura */}
        <View
          className="w-full gap-1.5 rounded-2xl bg-surface p-4"
          style={{ ...createShadow(1, 8, '#000000', 0.04), elevation: 1 }}
        >
          <Text className="font-inter-semibold text-[11px] uppercase tracking-[1.2px] text-clinical-blue">
            {info ? 'ESTRUCTURA SELECCIONADA' : 'CÓMO EXPLORAR'}
          </Text>
          <Text className="font-heading-bold text-lg text-deep-slate">
            {info?.name ?? 'Selecciona una estructura'}
          </Text>
          <Text className="font-sans text-sm leading-[21px] text-neutral">
            {info?.description ??
              'Toca el modelo 3D o elige un chip de estructura para ver su descripción anatómica.'}
          </Text>
        </View>

        {/* Hint de gestos */}
        <View className="flex-row items-center justify-center gap-2">
          <MaterialCommunityIcons name="rotate-3d" size={15} color={colors.neutral} />
          <Text className="font-sans text-xs text-neutral">
            Arrastra para rotar · Pellizca para acercar · Toca para seleccionar
          </Text>
        </View>

        {/* Selector de modelo (16 dientes) */}
        <Text className="mt-1 font-inter-semibold text-[11px] uppercase tracking-[1.2px] text-neutral">
          ELEGIR PIEZA DENTAL
        </Text>
        <ToothSelector onSelectTooth={handleSelectTooth} selectedTooth={selectedTooth} />
      </View>
    </ScreenContainer>
  );
}

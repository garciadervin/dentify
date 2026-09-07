import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { DENTAL_MODELS, FDI_TEETH } from '@/assets/models';

interface ToothSelectorProps {
  onSelectTooth: (toothNumber: number) => void;
  selectedTooth: number | null;
}

/**
 * FDI tooth selector — grid of numbered buttons arranged in dental arch layout.
 * Maxillary teeth (11–28) on top row, mandibular (31–48) on bottom.
 */
export default function ToothSelector({ onSelectTooth, selectedTooth }: ToothSelectorProps) {
  const maxillary = FDI_TEETH.filter((n) => n >= 11 && n <= 28);
  const mandibular = FDI_TEETH.filter((n) => n >= 31 && n <= 48);

  const selectedInfo = selectedTooth ? DENTAL_MODELS[selectedTooth] : null;

  return (
    <View className="px-1 py-2" testID="tooth-selector">
      {/* Selected tooth name */}
      {selectedInfo ? (
        <Text testID="selected-tooth-name" className="mb-2 text-center font-inter-semibold text-sm text-clinical-blue">
          {selectedInfo.name}
        </Text>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View testID="tooth-selector-grid" className="px-2">
          {/* Maxillary row label */}
          <Text className="mb-1 ml-1 font-inter-semibold text-[11px] uppercase tracking-[0.5px] text-neutral">
            Superiores
          </Text>
          <View className="flex-row gap-1">
            {maxillary.map((num) => (
              <TouchableOpacity
                key={num}
                testID={`tooth-${num}`}
                className={`h-9 w-9 items-center justify-center rounded-[8px] border bg-surface ${
                  selectedTooth === num
                    ? 'border-clinical-blue bg-clinical-blue'
                    : 'border-border-light'
                }`}
                onPress={() => onSelectTooth(num)}
                accessibilityLabel={`Diente ${num} — ${DENTAL_MODELS[num]?.name ?? ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedTooth === num }}
              >
                <Text
                  className={`font-inter-semibold text-xs ${
                    selectedTooth === num ? 'text-white' : 'text-deep-slate'
                  }`}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mandibular row label */}
          <Text className="mb-1 ml-1 mt-2 font-inter-semibold text-[11px] uppercase tracking-[0.5px] text-neutral">
            Inferiores
          </Text>
          <View className="flex-row gap-1">
            {mandibular.map((num) => (
              <TouchableOpacity
                key={num}
                testID={`tooth-${num}`}
                className={`h-9 w-9 items-center justify-center rounded-[8px] border bg-surface ${
                  selectedTooth === num
                    ? 'border-clinical-blue bg-clinical-blue'
                    : 'border-border-light'
                }`}
                onPress={() => onSelectTooth(num)}
                accessibilityLabel={`Diente ${num} — ${DENTAL_MODELS[num]?.name ?? ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedTooth === num }}
              >
                <Text
                  className={`font-inter-semibold text-xs ${
                    selectedTooth === num ? 'text-white' : 'text-deep-slate'
                  }`}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

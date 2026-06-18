import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
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
    <View style={styles.wrapper} testID="tooth-selector">
      {/* Selected tooth name */}
      {selectedInfo ? (
        <Text testID="selected-tooth-name" style={styles.selectedName}>
          {selectedInfo.name}
        </Text>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View testID="tooth-selector-grid" style={styles.grid}>
          {/* Maxillary row label */}
          <Text style={styles.archLabel}>Superiores</Text>
          <View style={styles.row}>
            {maxillary.map((num) => (
              <TouchableOpacity
                key={num}
                testID={`tooth-${num}`}
                style={[styles.tooth, selectedTooth === num && styles.toothSelected]}
                onPress={() => onSelectTooth(num)}
                accessibilityLabel={`Diente ${num} — ${DENTAL_MODELS[num]?.name ?? ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedTooth === num }}
              >
                <Text style={[styles.toothText, selectedTooth === num && styles.toothTextSelected]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mandibular row label */}
          <Text style={[styles.archLabel, styles.archLabelBottom]}>Inferiores</Text>
          <View style={styles.row}>
            {mandibular.map((num) => (
              <TouchableOpacity
                key={num}
                testID={`tooth-${num}`}
                style={[styles.tooth, selectedTooth === num && styles.toothSelected]}
                onPress={() => onSelectTooth(num)}
                accessibilityLabel={`Diente ${num} — ${DENTAL_MODELS[num]?.name ?? ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedTooth === num }}
              >
                <Text style={[styles.toothText, selectedTooth === num && styles.toothTextSelected]}>
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

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  selectedName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#0077B6',
    textAlign: 'center',
    marginBottom: 8,
  },
  grid: {
    paddingHorizontal: 8,
  },
  archLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#70787D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginLeft: 4,
  },
  archLabelBottom: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  tooth: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F2F4F6',
  },
  toothSelected: {
    backgroundColor: '#0077B6',
    borderColor: '#0077B6',
  },
  toothText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#191C1E',
  },
  toothTextSelected: {
    color: '#FFFFFF',
  },
});

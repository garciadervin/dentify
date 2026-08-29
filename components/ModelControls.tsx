import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, createShadow } from '@/constants/theme';

interface ModelControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  onToggleAutoRotate?: () => void;
  autoRotate?: boolean;
}

/**
 * Controles flotantes sobre el viewer 3D.
 * Posicionados abajo-centro del viewer para el pulgar.
 */
export default function ModelControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleAutoRotate,
  autoRotate = false,
}: ModelControlsProps) {
  return (
    <View style={styles.container} testID="model-controls">
      <TouchableOpacity
        testID="zoom-in"
        style={styles.button}
        onPress={onZoomIn}
        accessibilityLabel="Acercar"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="magnify-plus" size={20} color={Colors.deepSlate} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="zoom-out"
        style={styles.button}
        onPress={onZoomOut}
        accessibilityLabel="Alejar"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="magnify-minus" size={20} color={Colors.deepSlate} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="reset-view"
        style={styles.button}
        onPress={onReset}
        accessibilityLabel="Restablecer vista"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="restore" size={20} color={Colors.deepSlate} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="auto-rotate-toggle"
        style={[styles.button, autoRotate && styles.buttonActive]}
        onPress={onToggleAutoRotate}
        accessibilityLabel={autoRotate ? 'Desactivar rotación automática' : 'Activar rotación automática'}
        accessibilityRole="button"
        accessibilityState={{ selected: autoRotate }}
      >
        <MaterialCommunityIcons
          name="rotate-right"
          size={20}
          color={autoRotate ? '#FFFFFF' : Colors.deepSlate}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...createShadow(2, 8, '#000000', 0.08),
    elevation: 5,
  },
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    ...createShadow(1, 3, '#000000', 0.05),
  },
  buttonActive: {
    backgroundColor: Colors.clinicalBlue,
    borderColor: Colors.clinicalBlue,
  },
});

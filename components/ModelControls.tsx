import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createShadow } from '@/constants/theme';

interface ModelControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  onToggleAutoRotate?: () => void;
  autoRotate?: boolean;
}

/**
 * Floating control buttons overlaid on the 3D viewer.
 * Positioned bottom-right for one-handed thumb reach.
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
      {/* Zoom in */}
      <TouchableOpacity
        testID="zoom-in"
        style={styles.button}
        onPress={onZoomIn}
        accessibilityLabel="Acercar"
        accessibilityRole="button"
      >
        <Text style={styles.icon}>+</Text>
      </TouchableOpacity>

      {/* Zoom out */}
      <TouchableOpacity
        testID="zoom-out"
        style={styles.button}
        onPress={onZoomOut}
        accessibilityLabel="Alejar"
        accessibilityRole="button"
      >
        <Text style={styles.icon}>−</Text>
      </TouchableOpacity>

      {/* Reset view */}
      <TouchableOpacity
        testID="reset-view"
        style={styles.button}
        onPress={onReset}
        accessibilityLabel="Restablecer vista"
        accessibilityRole="button"
      >
        <Text style={styles.icon}>⟲</Text>
      </TouchableOpacity>

      {/* Auto-rotate toggle */}
      <TouchableOpacity
        testID="auto-rotate-toggle"
        style={[styles.button, autoRotate && styles.buttonActive]}
        onPress={onToggleAutoRotate}
        accessibilityLabel={autoRotate ? 'Desactivar rotación automática' : 'Activar rotación automática'}
        accessibilityRole="button"
        accessibilityState={{ selected: autoRotate }}
      >
        <Text style={[styles.icon, autoRotate && styles.iconActive]}>↻</Text>
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
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
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
    backgroundColor: '#0077B6',
    borderColor: '#0077B6',
  },
  icon: {
    fontSize: 18,
    color: '#191C1E',
    fontWeight: 'bold',
  },
  iconActive: {
    color: '#FFFFFF',
  },
});

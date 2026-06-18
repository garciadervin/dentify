import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

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
    bottom: 24,
    right: 16,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    padding: 8,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    // border
    borderWidth: 1,
    borderColor: '#F2F4F6',
  },
  buttonActive: {
    backgroundColor: '#0077B6',
    borderColor: '#0077B6',
  },
  icon: {
    fontSize: 22,
    color: '#191C1E',
    lineHeight: 24,
  },
  iconActive: {
    color: '#FFFFFF',
  },
});

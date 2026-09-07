import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, createShadow } from '@/constants/theme';

interface ModelControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  onToggleAutoRotate?: () => void;
  autoRotate?: boolean;
}

// Shadows (cross-platform via createShadow + elevation) can't be expressed in
// Tailwind, so they stay as plain style objects.
const containerShadow = { ...createShadow(2, 8, '#000000', 0.08), elevation: 5 };
const buttonShadow = { ...createShadow(1, 3, '#000000', 0.05) };

/**
 * Floating controls over the 3D viewer.
 * Positioned bottom-center of the viewer for the thumb.
 */
export default function ModelControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleAutoRotate,
  autoRotate = false,
}: ModelControlsProps) {
  return (
    <View
      className="absolute bottom-3 flex-row gap-2.5 self-center rounded-2xl bg-[rgba(255,255,255,0.82)] px-3 py-1.5"
      style={containerShadow}
      testID="model-controls"
    >
      <TouchableOpacity
        testID="zoom-in"
        className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[#E5E5E5] bg-white"
        style={buttonShadow}
        onPress={onZoomIn}
        accessibilityLabel="Acercar"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="magnify-plus" size={20} color={Colors.deepSlate} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="zoom-out"
        className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[#E5E5E5] bg-white"
        style={buttonShadow}
        onPress={onZoomOut}
        accessibilityLabel="Alejar"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="magnify-minus" size={20} color={Colors.deepSlate} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="reset-view"
        className="h-[38px] w-[38px] items-center justify-center rounded-full border border-[#E5E5E5] bg-white"
        style={buttonShadow}
        onPress={onReset}
        accessibilityLabel="Restablecer vista"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="restore" size={20} color={Colors.deepSlate} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="auto-rotate-toggle"
        className={`h-[38px] w-[38px] items-center justify-center rounded-full border ${
          autoRotate
            ? 'border-clinical-blue bg-clinical-blue'
            : 'border-[#E5E5E5] bg-white'
        }`}
        style={buttonShadow}
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

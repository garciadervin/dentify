/**
 * DetectionOverlay — Renders bounding boxes and labels over the camera preview.
 *
 * Uses absolute positioning to map normalized detection coordinates (0–1)
 * to the actual preview dimensions.
 */

import React from 'react';
import { View, Text } from 'react-native';
import type { Detection } from '@/src/services/yolo';

// ── Color map ──────────────────────────────────────────────────────────────

const CLASS_COLORS: Record<string, string> = {
  // Caries classes → red
  'Caries 1': '#EF4444',
  'Caries 2': '#EF4444',
  'Caries 3': '#EF4444',
  'Caries 4': '#EF4444',
  'Caries 5': '#EF4444',
  'Caries 6': '#EF4444',
  // Abrasion → amber
  Abrasion: '#F59E0B',
  // Filling → blue
  Filling: '#3B82F6',
  // Crown → purple
  Crown: '#8B5CF6',
};

function getColor(className: string): string {
  return CLASS_COLORS[className] ?? '#EF4444';
}

// ── Props ──────────────────────────────────────────────────────────────────

export interface DetectionOverlayProps {
  detections: Detection[];
  /** Original image pixel width */
  imageWidth: number;
  /** Original image pixel height */
  imageHeight: number;
  /** Preview viewport width in display points */
  previewWidth: number;
  /** Preview viewport height in display points */
  previewHeight: number;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DetectionOverlay({
  detections,
  imageWidth,
  imageHeight,
  previewWidth,
  previewHeight,
}: DetectionOverlayProps) {
  if (detections.length === 0) {
    return (
      <View
        testID="no-detections"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'Inter-SemiBold',
            fontSize: 16,
            color: '#FFFFFF',
            backgroundColor: 'rgba(0,0,0,0.5)',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          No se detectaron condiciones
        </Text>
      </View>
    );
  }

  // Calculate scale factors to map normalized coords to preview coords
  // The image might be scaled to fit the preview (aspect-fill)
  const imageAspect = imageWidth / imageHeight;
  const previewAspect = previewWidth / previewHeight;

  let scaleX: number;
  let scaleY: number;
  let offsetX = 0;
  let offsetY = 0;

  if (imageAspect > previewAspect) {
    // Image is wider — fit by height
    scaleY = previewHeight;
    scaleX = previewHeight * imageAspect;
    offsetX = (previewWidth - scaleX) / 2;
  } else {
    // Image is taller — fit by width
    scaleX = previewWidth;
    scaleY = previewWidth / imageAspect;
    offsetY = (previewHeight - scaleY) / 2;
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      pointerEvents="none"
    >
      {detections.map((detection, index) => {
        const [nx, ny, nw, nh] = detection.bbox;

        // Map normalized coords to preview coords
        const x = nx * scaleX + offsetX - (nw * scaleX) / 2;
        const y = ny * scaleY + offsetY - (nh * scaleY) / 2;
        const w = nw * scaleX;
        const h = nh * scaleY;

        const color = getColor(detection.className);
        const label = `${detection.className} ${(detection.confidence * 100).toFixed(0)}%`;

        return (
          <View
            key={`detection-${detection.classId}-${index}`}
            testID={`detection-label-${detection.classId}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              height: h,
              borderWidth: 2,
              borderColor: color,
              borderRadius: 4,
            }}
          >
            {/* Label background */}
            <View
              style={{
                position: 'absolute',
                top: -24,
                left: 0,
                backgroundColor: color,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                borderBottomLeftRadius: 0,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 11,
                  color: '#FFFFFF',
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

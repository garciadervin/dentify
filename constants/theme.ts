/**
 * Dentify — Clinical Clarity Design System (light-only)
 * Based on DESIGN.md tokens and the dentify.pen sketch.
 *
 * `Colors.light` es la única paleta: el modo oscuro fue eliminado.
 */

import { Platform } from 'react-native';

/**
 * Paleta única (light). Se expone plana (`Colors.clinicalBlue`) y también como
 * `Colors.light` para que `Colors[colorScheme]` siga funcionando en el código
 * existente. El modo oscuro fue eliminado.
 */
const light = {
  /** Clinical Blue — primary action color */
  clinicalBlue: '#0077B6',
  /** Clinical Cyan — secondary accent */
  clinicalCyan: '#00B4D8',
  /** Sky Light — main page background */
  skyLight: '#F7F9FB',
  /** Deep Slate — headings, primary text */
  deepSlate: '#191C1E',
  /** Success Teal — progress nodes, checkmarks */
  successTeal: '#006B5F',
  /** Neutral — inactive icons, secondary text */
  neutral: '#70787D',
  /** Muted text — placeholder / disabled */
  muted: '#9AA1A7',
  /** Surface — card backgrounds */
  surface: '#FFFFFF',
  /** Border Light — thin separators */
  borderLight: '#F2F4F6',
  /** Pill border — chips, inputs (sketch #E7EBEF) */
  pillBorder: '#E7EBEF',
  /** Source row fill (sketch #F2F6FA) */
  sourceFill: '#F2F6FA',

  // Legacy / compatibility aliases
  text: '#191C1E',
  background: '#F7F9FB',
  tint: '#0077B6',
  icon: '#70787D',
  tabIconDefault: '#70787D',
  tabIconSelected: '#0077B6',
};

export const Colors = { ...light, light } as const;

export const Fonts = {
  families: {
    sans: 'Inter',
    heading: 'Manrope',
  },
  sizes: {
    h1: 28,
    h2: 18,
    bodyLarge: 16,
    bodySmall: 14,
    caption: 11,
  },
  weights: {
    h1: '700' as const,
    h2: '700' as const,
    body: '400' as const,
    caption: '600' as const,
  },
};

export const Spacing = {
  pageMargin: 24,
  baseGrid: 4,
};

export const BorderRadius = {
  large: 32,
  medium: 24,
  small: 16,
};

/**
 * Cross-platform shadow helper.
 * Uses boxShadow (web) or native shadow props based on platform.
 */
export function createShadow(
  offsetY: number = 2,
  blur: number = 8,
  color: string = '#000000',
  opacity: number = 0.1,
): Record<string, any> {
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };
  const { r, g, b } = hexToRgb(color);
  return Platform.select({
    web: { boxShadow: `0 ${offsetY}px ${blur}px rgba(${r},${g},${b},${opacity})` as any },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blur,
    } as any,
  });
}

/**
 * 3D Button Style Generator (light).
 * Returns styles for normal and pressed states of 3D buttons.
 */
export function getButton3DStyles(type: 'primary' | 'success' | 'secondary' | 'error') {
  const c = Colors.light;
  const config = {
    primary: {
      bg: c.clinicalBlue,
      border: '#005C8A',
      text: '#FFFFFF',
    },
    success: {
      bg: c.successTeal,
      border: '#004037',
      text: '#FFFFFF',
    },
    secondary: {
      bg: c.surface,
      border: c.borderLight,
      text: c.deepSlate,
    },
    error: {
      bg: '#E74C3C',
      border: '#C0392B',
      text: '#FFFFFF',
    },
  }[type];

  return {
    normal: {
      backgroundColor: config.bg,
      borderWidth: 1,
      borderColor: config.border,
      borderBottomWidth: 5,
      borderRadius: 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    pressed: {
      backgroundColor: config.bg,
      borderWidth: 1,
      borderColor: config.border,
      borderBottomWidth: 1,
      marginTop: 4,
      marginBottom: -4, // Keep height consistent in layouts
      borderRadius: 16,
    },
    text: {
      color: config.text,
      fontFamily: 'Inter-Bold',
      fontSize: 15,
      textAlign: 'center' as const,
    }
  };
}

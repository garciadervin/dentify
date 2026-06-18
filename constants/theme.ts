/**
 * Dentify — Clinical Clarity Design System
 * Based on DESIGN.md tokens
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** Clinical Blue — primary action color */
    clinicalBlue: '#0077B6',
    /** Sky Light — main page background */
    skyLight: '#F7F9FB',
    /** Deep Slate — headings, primary text */
    deepSlate: '#191C1E',
    /** Success Teal — progress nodes, checkmarks */
    successTeal: '#006B5F',
    /** Neutral — inactive icons, secondary text */
    neutral: '#70787D',
    /** Surface — card backgrounds */
    surface: '#FFFFFF',
    /** Border Light — thin separators */
    borderLight: '#F2F4F6',

    // Legacy / compatibility aliases
    text: '#191C1E',
    background: '#F7F9FB',
    tint: '#0077B6',
    icon: '#70787D',
    tabIconDefault: '#70787D',
    tabIconSelected: '#0077B6',
  },
  dark: {
    clinicalBlue: '#4CC9F0',
    skyLight: '#121416',
    deepSlate: '#F2F4F6',
    successTeal: '#2DD4BF',
    neutral: '#9CA3AF',
    surface: '#1A1D21',
    borderLight: '#2A2D31',

    text: '#F2F4F6',
    background: '#121416',
    tint: '#4CC9F0',
    icon: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#4CC9F0',
  },
};

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

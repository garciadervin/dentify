/**
 * Dentify es light-only (Clinical Clarity).
 * Resuelve colores del tema claro; el prop `dark` se ignora por compatibilidad.
 */

import { Colors } from '@/constants/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light
) {
  return props.light ?? Colors.light[colorName];
}

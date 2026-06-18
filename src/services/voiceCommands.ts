/**
 * Voice Navigation Commands Service
 *
 * Maps spoken phrases to app routes for voice-controlled navigation.
 * Supports accent-insensitive matching via normalization.
 */

export const NAVIGATION_COMMANDS: Record<string, string> = {
  'abrir simulador': '/(tabs)/simulator',
  'abrir simulador 3d': '/(tabs)/simulator',
  'mostrar simulador': '/(tabs)/simulator',
  'abrir escáner': '/(tabs)/scanner',
  'abrir scanner': '/(tabs)/scanner',
  'mostrar escáner': '/(tabs)/scanner',
  'mostrar scanner': '/(tabs)/scanner',
  'diagnóstico': '/(tabs)/scanner',
  'abrir chat': '/(tabs)/chat',
  'asistente': '/(tabs)/chat',
  'denty': '/(tabs)/chat',
  'abrir dashboard': '/(tabs)',
  'inicio': '/(tabs)',
  'dashboard': '/(tabs)',
};

/**
 * Normalize text: lowercase, remove accents, trim.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[¿?!¡,;.:]/g, '')
    .trim();
}

/**
 * Parse a spoken text and return a matching route path, or null if no match.
 */
export function parseNavigationCommand(text: string): string | null {
  const normalized = normalize(text);

  // Try exact match first
  if (NAVIGATION_COMMANDS[normalized]) {
    return NAVIGATION_COMMANDS[normalized];
  }

  // Try partial match — check if any command key is contained in the text
  for (const [command, route] of Object.entries(NAVIGATION_COMMANDS)) {
    if (normalized.includes(command)) {
      return route;
    }
  }

  return null;
}

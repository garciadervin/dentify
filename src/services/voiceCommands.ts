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
 * Keys and input are normalized the same way so accents/uppercase do not
 * prevent a match.
 */
export function parseNavigationCommand(text: string): string | null {
  const normalized = normalize(text);

  // Exact match against normalized keys
  for (const [command, route] of Object.entries(NAVIGATION_COMMANDS)) {
    if (normalized === normalize(command)) {
      return route;
    }
  }

  // Partial match — check if any normalized command key appears as whole words
  // (word boundaries) so short commands like "inicio" do not match inside
  // unrelated words such as "definición".
  for (const [command, route] of Object.entries(NAVIGATION_COMMANDS)) {
    const normalizedCommand = normalize(command);
    if (normalizedCommand && new RegExp(`\\b${escapeRegExp(normalizedCommand)}\\b`).test(normalized)) {
      return route;
    }
  }

  return null;
}

/** Escapes regex special characters in a literal string. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

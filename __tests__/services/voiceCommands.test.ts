import { parseNavigationCommand, NAVIGATION_COMMANDS } from '@/src/services/voiceCommands';

describe('voiceCommands — parseNavigationCommand', () => {
  it('matches an exact command', () => {
    expect(parseNavigationCommand('abrir simulador')).toBe('/(tabs)/simulator');
  });

  it('is case-insensitive', () => {
    expect(parseNavigationCommand('ABRIR ESCÁNER')).toBe('/(tabs)/scanner');
  });

  it('is accent-insensitive', () => {
    expect(parseNavigationCommand('abrir escáner')).toBe('/(tabs)/scanner');
    expect(parseNavigationCommand('mostrar escáner')).toBe('/(tabs)/scanner');
  });

  it('matches a command embedded in a longer phrase', () => {
    expect(parseNavigationCommand('necesito abrir chat ahora')).toBe('/(tabs)/chat');
  });

  it('ignores punctuation', () => {
    expect(parseNavigationCommand('¡abrir simulador 3d!')).toBe('/(tabs)/simulator');
  });

  it('supports the diagnostic alias', () => {
    expect(parseNavigationCommand('quiero hacer un diagnóstico')).toBe('/(tabs)/scanner');
  });

  it('returns null when no command matches', () => {
    expect(parseNavigationCommand('cuál es la definición de caries')).toBeNull();
  });

  it('exposes at least the four main tabs plus dashboard', () => {
    const routes = Object.values(NAVIGATION_COMMANDS);
    for (const tab of ['/(tabs)', '/(tabs)/simulator', '/(tabs)/scanner', '/(tabs)/chat']) {
      expect(routes).toContain(tab);
    }
  });
});

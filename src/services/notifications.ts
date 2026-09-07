/**
 * notifications — daily study reminder (local notification).
 *
 * Mobile only; on web the local notification does not apply and the toggle only
 * persists the preference. expo-notifications is required lazily so the module
 * (which logs a "push token changes not supported on web" warning at import)
 * is never loaded in the browser.
 */

import { Platform } from 'react-native';

export const REMINDER_IDENTIFIER = 'study-reminder';
const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 0;

let handlerConfigured = false;

// Lazy accessor: never loads expo-notifications on web.
function notifications(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'web') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- keep expo-notifications out of the web bundle
  return require('expo-notifications');
}

/** Configures the notification handler (once, native only). */
export function configureNotifications(): void {
  const Notifications = notifications();
  if (!Notifications || handlerConfigured) return;
  handlerConfigured = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // plataforma sin soporte
  }
}

export interface ReminderResult {
  ok: boolean;
  message?: string;
}

/**
 * Schedules (enabled=true) or cancels (enabled=false) the daily study
 * reminder at 19:00 (device local time).
 */
export async function scheduleStudyReminder(enabled: boolean): Promise<ReminderResult> {
  const Notifications = notifications();
  if (!Notifications) {
    return {
      ok: false,
      message: 'Los recordatorios locales están disponibles en la app móvil.',
    };
  }

  try {
    if (!enabled) {
      await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
      return { ok: true };
    }

    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      return {
        ok: false,
        message: 'Para recibir recordatorios, permite las notificaciones en los ajustes del dispositivo.',
      };
    }

    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_IDENTIFIER,
      content: {
        title: 'Momento de estudiar',
        body: 'Tu racha te espera. Dedica unos minutos a tu ruta académica en Dentify.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, message: 'No se pudo programar el recordatorio.' };
  }
}

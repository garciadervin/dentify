/**
 * notifications — daily study reminder (local notification).
 *
 * Mobile only; on web the local notification does not apply and the toggle only
 * persists the preference.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const REMINDER_IDENTIFIER = 'study-reminder';
const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 0;

let handlerConfigured = false;

/** Configures the notification handler (once). */
export function configureNotifications(): void {
  if (Platform.OS === 'web' || handlerConfigured) return;
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
  if (Platform.OS === 'web') {
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

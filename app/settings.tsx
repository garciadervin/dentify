/**
 * SettingsScreen — Settings (functional).
 *
 * Preferences persisted in profiles.settings; each toggle changes
 * real app behavior (3D auto-rotate, haptics, downloads over
 * mobile data, study reminders).
 */

import React, { useCallback, useEffect } from 'react';
import { View, Text, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import { Colors } from '@/constants/theme';
import { useSettings } from '@/src/hooks/useSettings';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { scheduleStudyReminder, configureNotifications } from '@/src/services/notifications';

function SettingRow({
  icon,
  title,
  description,
  value,
  onValueChange,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center gap-3 p-4">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-clinical-blue/10">
        <MaterialCommunityIcons name={icon} size={20} color={Colors.clinicalBlue} />
      </View>
      <View className="flex-1">
        <Text className="font-inter-semibold text-sm text-deep-slate">{title}</Text>
        <Text className="mt-0.5 font-sans text-xs leading-[17px] text-neutral">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.pillBorder, true: '#0077B64D' }}
        thumbColor={value ? Colors.clinicalBlue : '#FFFFFF'}
        accessibilityLabel={title}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, loaded, updateSetting } = useSettings();
  const { toast } = useFeedback();

  // Configure the handler; once the persisted preference finishes loading,
  // (re)schedule the reminder if it was active. Depends on `loaded` so a
  // reminder enabled in the DB is registered even when the screen mounts
  // before settings resolve.
  useEffect(() => {
    configureNotifications();
    if (!loaded) return;
    if (settings.studyReminders) void scheduleStudyReminder(true);
  }, [loaded, settings.studyReminders]);

  const handleRemindersToggle = useCallback(
    async (value: boolean) => {
      updateSetting('studyReminders', value);
      const result = await scheduleStudyReminder(value);
      if (!result.ok) {
        // Revert the toggle if scheduling failed (e.g. permission denied).
        updateSetting('studyReminders', false);
        toast(result.message ?? 'No se pudo programar el recordatorio.', 'error');
      }
    },
    [updateSetting, toast]
  );

  return (
    <ScreenContainer scroll edges={['top']}>
      <AppHeader variant="back" title="Configuración" />

      <View className="px-6 pt-4">
        <Text className="mb-3 font-heading-bold text-[17px] text-deep-slate">Preferencias</Text>
        <View className="overflow-hidden rounded-[20px] bg-surface">
          <SettingRow
            icon="rotate-3d"
            title="Rotación automática 3D"
            description="El modelo dental rota solo al cargar en el simulador."
            value={settings.autoRotate}
            onValueChange={(v) => updateSetting('autoRotate', v)}
          />
          <View className="ml-16 h-px bg-border-light" />
          <SettingRow
            icon="vibrate"
            title="Vibración táctil"
            description="Feedback háptico al tocar la barra de navegación."
            value={settings.haptics}
            onValueChange={(v) => updateSetting('haptics', v)}
          />
          <View className="ml-16 h-px bg-border-light" />
          <SettingRow
            icon="cloud-download-outline"
            title="Descargar con datos móviles"
            description="Permite descargar los 16 modelos 3D sin conexión WiFi."
            value={settings.cellularDownloads}
            onValueChange={(v) => updateSetting('cellularDownloads', v)}
          />
          <View className="ml-16 h-px bg-border-light" />
          <SettingRow
            icon="bell-outline"
            title="Recordatorios de estudio"
            description="Notificación diaria a las 19:00 para no perder tu racha."
            value={settings.studyReminders}
            onValueChange={handleRemindersToggle}
          />
        </View>

        {!loaded && <Text className="mt-3 text-center font-sans text-xs text-neutral">Cargando preferencias...</Text>}
      </View>
    </ScreenContainer>
  );
}

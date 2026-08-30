/**
 * SettingsScreen — Settings (functional).
 *
 * Preferences persisted in profiles.settings; each toggle changes
 * real app behavior (3D auto-rotate, haptics, downloads over
 * mobile data, study reminders).
 */

import React, { useCallback, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import { Colors } from '@/constants/theme';
import { useSettings } from '@/src/hooks/useSettings';
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
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={Colors.clinicalBlue} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
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

  // Configure the handler and re-schedule the reminder if it was active.
  useEffect(() => {
    configureNotifications();
    if (settings.studyReminders) void scheduleStudyReminder(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemindersToggle = useCallback(
    async (value: boolean) => {
      updateSetting('studyReminders', value);
      const result = await scheduleStudyReminder(value);
      if (!result.ok) {
        // Revert the toggle if scheduling failed (e.g. permission denied).
        updateSetting('studyReminders', false);
        Alert.alert(
          'Recordatorios',
          result.message ?? 'No se pudo programar el recordatorio.'
        );
      }
    },
    [updateSetting]
  );

  return (
    <ScreenContainer scroll edges={['top']}>
      <AppHeader variant="back" title="Configuración" />

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        <View style={styles.card}>
          <SettingRow
            icon="rotate-3d"
            title="Rotación automática 3D"
            description="El modelo dental rota solo al cargar en el simulador."
            value={settings.autoRotate}
            onValueChange={(v) => updateSetting('autoRotate', v)}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="vibrate"
            title="Vibración táctil"
            description="Feedback háptico al tocar la barra de navegación."
            value={settings.haptics}
            onValueChange={(v) => updateSetting('haptics', v)}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="cloud-download-outline"
            title="Descargar con datos móviles"
            description="Permite descargar los 16 modelos 3D sin conexión WiFi."
            value={settings.cellularDownloads}
            onValueChange={(v) => updateSetting('cellularDownloads', v)}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="bell-outline"
            title="Recordatorios de estudio"
            description="Notificación diaria a las 19:00 para no perder tu racha."
            value={settings.studyReminders}
            onValueChange={handleRemindersToggle}
          />
        </View>

        {!loaded && <Text style={styles.syncNote}>Cargando preferencias...</Text>}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 17,
    color: Colors.deepSlate,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0077B614',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.deepSlate,
  },
  rowDesc: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    marginLeft: 64,
    backgroundColor: Colors.borderLight,
  },
  syncNote: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 12,
    textAlign: 'center',
  },
});

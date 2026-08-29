/**
 * useSettings — preferencias del usuario persistidas en profiles.settings (jsonb).
 *
 * Devuelve defaults si no hay sesión/BD; cada toggle afecta comportamiento real
 * (auto-rotate 3D, hápticos, descarga con datos móviles, recordatorios).
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/hooks/useAuth';

export interface AppSettings {
  /** Rotación automática del modelo 3D al cargar. */
  autoRotate: boolean;
  /** Vibración táctil al tocar elementos (HapticTab). */
  haptics: boolean;
  /** Permitir descargar los modelos 3D con datos móviles. */
  cellularDownloads: boolean;
  /** Recordatorios de estudio (preferencia persistida). */
  studyReminders: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoRotate: false,
  haptics: true,
  cellularDownloads: false,
  studyReminders: false,
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();
    if (!supabase || !user) {
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (data?.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...(data.settings as Partial<AppSettings>) });
        }
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateSetting = useCallback(
    async (key: keyof AppSettings, value: boolean) => {
      const next = { ...settings, [key]: value };
      setSettings(next);
      const supabase = getSupabase();
      if (!supabase || !user) return;
      try {
        await supabase
          .from('profiles')
          .upsert({ id: user.id, settings: next }, { onConflict: 'id' });
      } catch {
        // Silencioso: el setting local prevalece hasta la próxima sync.
      }
    },
    [settings, user]
  );

  return { settings, loaded, updateSetting };
}

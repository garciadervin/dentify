/**
 * useSettings — user preferences persisted in profiles.settings (jsonb).
 *
 * Returns defaults without a session/DB; each toggle affects real behavior
 * (3D auto-rotate, haptics, mobile-data downloads, reminders).
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/hooks/useAuth';

export interface AppSettings {
  /** Auto-rotate the 3D model on load. */
  autoRotate: boolean;
  /** Haptic feedback when tapping elements (HapticTab). */
  haptics: boolean;
  /** Allow downloading the 3D models over mobile data. */
  cellularDownloads: boolean;
  /** Study reminders (persisted preference). */
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
        // Silent: local setting wins until the next sync.
      }
    },
    [settings, user]
  );

  return { settings, loaded, updateSetting };
}

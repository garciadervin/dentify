/**
 * EditProfileScreen — Edit profile (functional).
 *
 * Updates full_name and avatar_color in profiles and user_metadata so that
 * AppHeader and Profile reflect the change immediately).
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { Colors } from '@/constants/theme';
import { getSupabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/hooks/useAuth';

const AVATAR_COLORS = ['#0077B6', '#006B5F', '#8B5CF6', '#E74C3C', '#F4A261'];

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useFeedback();
  const router = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color ?? AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const name = fullName.trim();
    if (!name) {
      toast('Escribe tu nombre completo.', 'error');
      return;
    }
    const supabase = getSupabase();
    if (!supabase || !user) {
      toast('Supabase no está configurado.', 'error');
      return;
    }
    setSaving(true);
    try {
      // Mirror the name into metadata (guards/avatars) and profiles.
      await supabase.auth.updateUser({ data: { full_name: name } });
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, full_name: name, avatar_color: avatarColor },
          { onConflict: 'id' }
        );
      if (error) throw error;
      await refreshProfile(user.id);
      toast('Perfil actualizado correctamente.', 'success');
      router.back();
    } catch {
      toast('No se pudo guardar el perfil. Intenta de nuevo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const initial = (fullName || profile?.full_name || 'U').charAt(0).toUpperCase();

  return (
    <ScreenContainer edges={['top']}>
      <AppHeader variant="back" title="Editar perfil" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 gap-2.5 px-6 pt-6">
          <View
            className="mb-4 h-[88px] w-[88px] items-center justify-center self-center rounded-full"
            style={{ backgroundColor: avatarColor }}
          >
            <Text className="font-heading-bold text-[36px] text-white">{initial}</Text>
          </View>

          <Text className="mt-2 font-inter-semibold text-[11px] uppercase tracking-[1px] text-neutral">
            NOMBRE COMPLETO
          </Text>
          <TextInput
            testID="edit-name-input"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Dr. Juan Pérez"
            placeholderTextColor={Colors.muted}
            className="rounded-[14px] border border-pill-border bg-surface px-4 py-3.5 font-sans text-[15px] text-deep-slate"
            autoCapitalize="words"
          />

          <Text className="mt-2 font-inter-semibold text-[11px] uppercase tracking-[1px] text-neutral">
            COLOR DEL AVATAR
          </Text>
          <View className="flex-row gap-3">
            {AVATAR_COLORS.map((color) => {
              const selected = color === avatarColor;
              return (
                <TouchableOpacity
                  key={color}
                  onPress={() => setAvatarColor(color)}
                  className={`h-[44px] w-[44px] items-center justify-center rounded-full border-2 ${
                    selected ? 'border-deep-slate' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  accessibilityLabel={`Color ${color}`}
                  accessibilityRole="button"
                >
                  {selected && (
                    <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            testID="save-profile"
            onPress={handleSave}
            disabled={saving}
            className={`mt-7 items-center rounded-[16px] border-b-4 border-b-clinical-dark bg-clinical-blue py-[15px] ${
              saving ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <Text className="font-inter-bold text-[15px] text-white">Guardar cambios</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

/**
 * EditProfileScreen — Edit profile (functional).
 *
 * Updates full_name and avatar_color in profiles and user_metadata so that
 * AppHeader and Profile reflect the change immediately).
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import { Colors } from '@/constants/theme';
import { getSupabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/hooks/useAuth';

const AVATAR_COLORS = ['#0077B6', '#006B5F', '#8B5CF6', '#E74C3C', '#F4A261'];

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color ?? AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const name = fullName.trim();
    if (!name) {
      Alert.alert('Nombre requerido', 'Escribe tu nombre completo.');
      return;
    }
    const supabase = getSupabase();
    if (!supabase || !user) {
      Alert.alert('Error', 'Supabase no está configurado.');
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
      Alert.alert('Guardado', 'Perfil actualizado correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const initial = (fullName || profile?.full_name || 'U').charAt(0).toUpperCase();

  return (
    <ScreenContainer edges={['top']}>
      <AppHeader variant="back" title="Editar perfil" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={[styles.avatarPreview, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>

          <Text style={styles.label}>NOMBRE COMPLETO</Text>
          <TextInput
            testID="edit-name-input"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Dr. Juan Pérez"
            placeholderTextColor={Colors.muted}
            style={styles.input}
            autoCapitalize="words"
          />

          <Text style={styles.label}>COLOR DEL AVATAR</Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((color) => {
              const selected = color === avatarColor;
              return (
                <TouchableOpacity
                  key={color}
                  onPress={() => setAvatarColor(color)}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    selected && styles.swatchSelected,
                  ]}
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
            style={[styles.saveButton, { opacity: saving ? 0.6 : 1 }]}
          >
            <Text style={styles.saveText}>Guardar cambios</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 10,
  },
  avatarPreview: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarInitial: {
    fontFamily: 'Manrope-Bold',
    fontSize: 36,
    color: '#FFFFFF',
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.neutral,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.pillBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter',
    fontSize: 15,
    color: Colors.deepSlate,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: Colors.deepSlate,
  },
  saveButton: {
    marginTop: 28,
    backgroundColor: Colors.clinicalBlue,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#005C8A',
  },
  saveText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});

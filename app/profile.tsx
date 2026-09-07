/**
 * ProfileScreen — Student profile (stacked screen, via avatar).
 *
 * Real data: name from profiles, stats from progress/badges,
 * functional menu (Edit profile, Settings, Sign out).
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, type DimensionValue } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import { Colors, createShadow } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useProgress } from '@/src/hooks/useProgress';
import { useBadges } from '@/src/hooks/useBadges';

function StatItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View
      className="w-[47%] items-center gap-1.5 rounded-[16px] bg-surface p-4"
      style={[createShadow(1, 6, '#000000', 0.04), { elevation: 1 }]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text className="font-heading-bold text-[22px] text-deep-slate">{value}</Text>
      <Text className="text-center font-sans text-[11px] text-neutral">{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const { specialties, getXP } = useProgress();
  const { badges } = useBadges();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'Estudiante';
  const userEmail = user?.email ?? '';
  const userInitial = displayName.charAt(0).toUpperCase();

  const completedCount = specialties.filter((s) => s.status === 'completed').length;
  const activeCount = specialties.filter((s) => s.status === 'active').length;
  const earnedBadges = badges.filter((b) => b.earned).length;
  const xp = useMemo(() => getXP(), [getXP]);

  const roleLabel = profile?.role === 'teacher' ? 'Docente' : 'Estudiante de Odontología';

  const confirmSignOut = useCallback(() => {
    setShowLogoutModal(false);
    signOut();
  }, [signOut]);

  return (
    <ScreenContainer scroll edges={['top']}>
      <AppHeader variant="back" title="Perfil" />

      <View className="px-6 pt-4 pb-6">
        {/* Cabecera */}
        <View className="mb-7 items-center">
          <View
            className="mb-3 h-[84px] w-[84px] items-center justify-center rounded-full"
            style={[
              createShadow(4, 12, Colors.clinicalBlue, 0.2),
              { elevation: 5, backgroundColor: profile?.avatar_color ?? Colors.clinicalBlue },
            ]}
          >
            <Text className="font-heading-bold text-[34px] text-white">{userInitial}</Text>
          </View>
          <Text className="mb-0.5 font-heading-bold text-[22px] text-deep-slate">{displayName}</Text>
          {userEmail ? <Text className="mb-2.5 font-sans text-[13px] text-neutral">{userEmail}</Text> : null}
          <View className="flex-row items-center gap-1.5 rounded-[20px] bg-[#0077B61A] px-3.5 py-1.5">
            <MaterialCommunityIcons name="school-outline" size={14} color={Colors.clinicalBlue} />
            <Text className="font-inter-semibold text-[12px] text-clinical-blue">{roleLabel}</Text>
          </View>
        </View>

        {/* Stats */}
        <Text className="mb-3 font-heading-bold text-[17px] text-deep-slate">Estadísticas</Text>
        <View className="mb-7 flex-row flex-wrap gap-2.5">
          <StatItem icon="fire" label="Activas" value={String(activeCount)} color="#F4A261" />
          <StatItem icon="check-decagram" label="Completadas" value={String(completedCount)} color={Colors.successTeal} />
          <StatItem icon="star-four-points" label="XP total" value={xp.toLocaleString()} color={Colors.clinicalBlue} />
          <StatItem icon="medal" label="Logros" value={`${earnedBadges}/${badges.length}`} color="#9B59B6" />
        </View>

        {/* Progress by specialty */}
        {specialties.length > 0 && (
          <>
            <Text className="mb-3 font-heading-bold text-[17px] text-deep-slate">Progreso por especialidad</Text>
            <View
              className="mb-7 overflow-hidden rounded-[20px] bg-surface"
              style={[createShadow(1, 6, '#000000', 0.04), { elevation: 1 }]}
            >
              {specialties.map((s, i) => (
                <View
                  key={s.id}
                  className={`flex-row items-center gap-3 p-3.5 ${
                    i > 0 ? 'border-t border-t-border-light' : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text className="mb-1.5 font-inter-semibold text-[13px] text-deep-slate">
                      {s.name}
                    </Text>
                    <View className="h-[5px] overflow-hidden rounded-[3px] bg-border-light">
                      <View
                        className={`h-full min-w-[4px] rounded-[3px] ${
                          s.status === 'locked' ? 'bg-muted' : 'bg-clinical-blue'
                        }`}
                        style={{ width: `${s.progress}%` as DimensionValue }}
                      />
                    </View>
                  </View>
                  <Text className="min-w-[36px] text-right font-inter-semibold text-[12px] text-neutral">
                    {s.progress}%
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Logros */}
        {badges.filter((b) => b.earned).length > 0 && (
          <>
            <Text className="mb-3 font-heading-bold text-[17px] text-deep-slate">Logros desbloqueados</Text>
            <View
              className="mb-7 overflow-hidden rounded-[20px] bg-surface"
              style={[createShadow(1, 6, '#000000', 0.04), { elevation: 1 }]}
            >
              {badges
                .filter((b) => b.earned)
                .map((b) => (
                  <View key={b.id} className="flex-row items-center gap-3 p-3.5">
                    <Text className="text-[22px]">{b.icon}</Text>
                    <View className="flex-1">
                      <Text className="font-inter-semibold text-[13px] text-deep-slate">{b.name}</Text>
                      <Text className="mt-0.5 font-sans text-[11px] text-neutral">{b.description}</Text>
                    </View>
                    <MaterialCommunityIcons name="check-circle" size={18} color={Colors.successTeal} />
                  </View>
                ))}
            </View>
          </>
        )}

        {/* Menu */}
        <Text className="mb-3 font-heading-bold text-[17px] text-deep-slate">Cuenta</Text>
        <View
          className="mb-7 overflow-hidden rounded-[20px] bg-surface"
          style={[createShadow(1, 6, '#000000', 0.04), { elevation: 1 }]}
        >
          <TouchableOpacity
            className="flex-row items-center gap-3 p-4"
            onPress={() => router.push('/edit-profile')}
          >
            <MaterialCommunityIcons name="account-edit-outline" size={20} color={Colors.neutral} />
            <Text className="flex-1 font-sans text-[15px] text-deep-slate">Editar perfil</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.neutral} />
          </TouchableOpacity>
          <View className="ml-[52px] h-px bg-border-light" />
          <TouchableOpacity
            className="flex-row items-center gap-3 p-4"
            onPress={() => router.push('/settings')}
          >
            <MaterialCommunityIcons name="cog-outline" size={20} color={Colors.neutral} />
            <Text className="flex-1 font-sans text-[15px] text-deep-slate">Configuración</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.neutral} />
          </TouchableOpacity>
          <View className="ml-[52px] h-px bg-border-light" />
          <TouchableOpacity className="flex-row items-center gap-3 p-4" onPress={() => setShowLogoutModal(true)}>
            <MaterialCommunityIcons name="logout" size={20} color="#C0392B" />
            <Text className="flex-1 font-sans text-[15px] text-error">Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-center font-sans text-[12px] text-neutral">Dentify v1.0.0</Text>
      </View>

      {/* Sign-out confirmation modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View
          className="flex-1 items-center justify-center p-10"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <View className="w-full items-center rounded-[20px] bg-surface p-6">
            <Text className="mb-2 font-heading-bold text-[18px] text-deep-slate">Cerrar sesión</Text>
            <Text className="mb-6 text-center font-sans text-[14px] text-neutral">
              ¿Estás seguro de que quieres cerrar sesión?
            </Text>
            <View className="w-full flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-[12px] bg-border-light py-3"
                onPress={() => setShowLogoutModal(false)}
              >
                <Text className="font-inter-semibold text-[14px] text-deep-slate">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-[12px] bg-error py-3"
                onPress={confirmSignOut}
              >
                <Text className="font-inter-semibold text-[14px] text-white">Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

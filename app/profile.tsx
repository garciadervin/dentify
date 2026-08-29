/**
 * ProfileScreen — Perfil del estudiante (pantalla apilada, vía avatar).
 *
 * Datos reales: nombre desde profiles, estadísticas desde progreso/badges,
 * menú funcional (Editar perfil, Configuración, Cerrar sesión).
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
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
    <View style={styles.statItem}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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

      <View style={styles.content}>
        {/* Cabecera */}
        <View style={styles.profileHeader}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: profile?.avatar_color ?? Colors.clinicalBlue },
            ]}
          >
            <Text style={styles.avatarInitial}>{userInitial}</Text>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          {userEmail ? <Text style={styles.userEmail}>{userEmail}</Text> : null}
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons name="school-outline" size={14} color={Colors.clinicalBlue} />
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>

        {/* Estadísticas */}
        <Text style={styles.sectionTitle}>Estadísticas</Text>
        <View style={styles.statsGrid}>
          <StatItem icon="fire" label="Activas" value={String(activeCount)} color="#F4A261" />
          <StatItem icon="check-decagram" label="Completadas" value={String(completedCount)} color={Colors.successTeal} />
          <StatItem icon="star-four-points" label="XP total" value={xp.toLocaleString()} color={Colors.clinicalBlue} />
          <StatItem icon="medal" label="Logros" value={`${earnedBadges}/${badges.length}`} color="#9B59B6" />
        </View>

        {/* Progreso por especialidad */}
        {specialties.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Progreso por especialidad</Text>
            <View style={styles.card}>
              {specialties.map((s, i) => (
                <View
                  key={s.id}
                  style={[styles.progressRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.borderLight }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.progressName}>{s.name}</Text>
                    <View style={[styles.progressTrack, { backgroundColor: Colors.borderLight }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${s.progress}%` as any,
                            backgroundColor:
                              s.status === 'locked' ? Colors.muted : Colors.clinicalBlue,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.progressPct}>{s.progress}%</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Logros */}
        {badges.filter((b) => b.earned).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Logros desbloqueados</Text>
            <View style={styles.card}>
              {badges
                .filter((b) => b.earned)
                .map((b) => (
                  <View key={b.id} style={styles.badgeRow}>
                    <Text style={styles.badgeIcon}>{b.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.badgeName}>{b.name}</Text>
                      <Text style={styles.badgeDesc}>{b.description}</Text>
                    </View>
                    <MaterialCommunityIcons name="check-circle" size={18} color={Colors.successTeal} />
                  </View>
                ))}
            </View>
          </>
        )}

        {/* Menú */}
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/edit-profile' as any)}
          >
            <MaterialCommunityIcons name="account-edit-outline" size={20} color={Colors.neutral} />
            <Text style={styles.menuItemText}>Editar perfil</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.neutral} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/settings' as any)}
          >
            <MaterialCommunityIcons name="cog-outline" size={20} color={Colors.neutral} />
            <Text style={styles.menuItemText}>Configuración</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.neutral} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowLogoutModal(true)}>
            <MaterialCommunityIcons name="logout" size={20} color="#C0392B" />
            <Text style={[styles.menuItemText, { color: '#C0392B' }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Dentify v1.0.0</Text>
      </View>

      {/* Modal de confirmación de cierre de sesión */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cerrar sesión</Text>
            <Text style={styles.modalMessage}>
              ¿Estás seguro de que quieres cerrar sesión?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: Colors.borderLight }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: Colors.deepSlate }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#C0392B' }]}
                onPress={confirmSignOut}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...createShadow(4, 12, Colors.clinicalBlue, 0.2),
    elevation: 5,
  },
  avatarInitial: {
    fontFamily: 'Manrope-Bold',
    fontSize: 34,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 22,
    color: Colors.deepSlate,
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: Colors.neutral,
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,119,182,0.1)',
  },
  roleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.clinicalBlue,
  },
  sectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 17,
    color: Colors.deepSlate,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  statItem: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    ...createShadow(1, 6, '#000000', 0.04),
    elevation: 1,
  },
  statValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 22,
    color: Colors.deepSlate,
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: Colors.neutral,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginBottom: 28,
    overflow: 'hidden',
    ...createShadow(1, 6, '#000000', 0.04),
    elevation: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  progressName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.deepSlate,
    marginBottom: 6,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
  },
  progressPct: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.neutral,
    minWidth: 36,
    textAlign: 'right',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  badgeIcon: {
    fontSize: 22,
  },
  badgeName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.deepSlate,
  },
  badgeDesc: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: Colors.neutral,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuItemText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: Colors.deepSlate,
    flex: 1,
  },
  divider: {
    height: 1,
    marginLeft: 52,
    backgroundColor: Colors.borderLight,
  },
  version: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: Colors.neutral,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: Colors.deepSlate,
    marginBottom: 8,
  },
  modalMessage: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: Colors.neutral,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
});

/**
 * ProfileScreen — Perfil del Estudiante
 *
 * Muestra datos del usuario, estadísticas reales, logros ganados y opciones de cuenta.
 * Recupera la API key de Groq desde Supabase Secrets via Edge Function cuando sea necesario.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, createShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/hooks/useAuth';
import { useProgress } from '@/src/hooks/useProgress';
import { useBadges } from '@/src/hooks/useBadges';

interface StatItemProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  color: string;
}

function StatItem({ icon, label, value, color }: StatItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={[styles.statValue, { color: colors.deepSlate }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.neutral }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, signOut } = useAuth();
  const { specialties, getProgress } = useProgress();
  const { badges } = useBadges();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const userName =
    user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Estudiante';
  const userEmail = user?.email ?? '';
  const userInitial = userName.charAt(0).toUpperCase();

  const completedCount = specialties.filter((s) => s.status === 'completed').length;
  const activeCount = specialties.filter((s) => s.status === 'active').length;
  const totalXP = completedCount * 250;
  const earnedBadges = badges.filter((b) => b.earned).length;

  const handleSignOut = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  const confirmSignOut = useCallback(() => {
    setShowLogoutModal(false);
    signOut();
  }, [signOut]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.skyLight }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar y nombre */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.clinicalBlue }]}>
            <Text style={styles.avatarInitial}>{userInitial}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.deepSlate }]}>{userName}</Text>
          <Text style={[styles.userEmail, { color: colors.neutral }]}>{userEmail}</Text>

          {/* Rol */}
          <View style={[styles.roleBadge, { backgroundColor: 'rgba(0,119,182,0.1)' }]}>
            <MaterialCommunityIcons name="school-outline" size={14} color={colors.clinicalBlue} />
            <Text style={[styles.roleText, { color: colors.clinicalBlue }]}>
              Estudiante de Odontología
            </Text>
          </View>
        </View>

        {/* Estadísticas */}
        <Text style={[styles.sectionTitle, { color: colors.deepSlate }]}>Estadísticas</Text>
        <View style={styles.statsGrid}>
          <StatItem
            icon="fire"
            label="Especialidades activas"
            value={String(activeCount)}
            color="#F4A261"
          />
          <StatItem
            icon="check-decagram"
            label="Completadas"
            value={String(completedCount)}
            color={colors.successTeal}
          />
          <StatItem
            icon="star-four-points"
            label="XP total"
            value={totalXP > 0 ? `${totalXP}` : '0'}
            color={colors.clinicalBlue}
          />
          <StatItem
            icon="medal"
            label="Logros"
            value={`${earnedBadges}/${badges.length}`}
            color="#9B59B6"
          />
        </View>

        {/* Progreso por especialidad */}
        {specialties.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.deepSlate }]}>
              Progreso por especialidad
            </Text>
            <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
              {specialties.map((s, i) => {
                const pct = getProgress(s.name);
                return (
                  <View key={s.id} style={[styles.progressRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.progressName, { color: colors.deepSlate }]}>{s.name}</Text>
                      <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${pct}%` as any,
                              backgroundColor: s.status === 'locked' ? colors.neutral : colors.clinicalBlue,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.progressPct, { color: colors.neutral }]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Logros */}
        {badges.filter((b) => b.earned).length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.deepSlate }]}>
              Logros desbloqueados
            </Text>
            <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
              {badges
                .filter((b) => b.earned)
                .map((b) => (
                  <View key={b.id} style={styles.badgeRow}>
                    <Text style={styles.badgeIcon}>{b.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.badgeName, { color: colors.deepSlate }]}>{b.name}</Text>
                      <Text style={[styles.badgeDesc, { color: colors.neutral }]}>
                        {b.description}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="check-circle" size={18} color={colors.successTeal} />
                  </View>
                ))}
            </View>
          </>
        )}

        {/* Opciones de cuenta */}
        <Text style={[styles.sectionTitle, { color: colors.deepSlate }]}>Cuenta</Text>
        <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Próximamente', 'Edición de perfil disponible pronto')}
          >
            <MaterialCommunityIcons name="account-edit-outline" size={20} color={colors.neutral} />
            <Text style={[styles.menuItemText, { color: colors.deepSlate }]}>Editar perfil</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.neutral} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Próximamente', 'Configuración disponible pronto')}
          >
            <MaterialCommunityIcons name="cog-outline" size={20} color={colors.neutral} />
            <Text style={[styles.menuItemText, { color: colors.deepSlate }]}>Configuración</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.neutral} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <MaterialCommunityIcons name="logout" size={20} color="#C0392B" />
            <Text style={[styles.menuItemText, { color: '#C0392B' }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Versión */}
        <Text style={[styles.version, { color: colors.neutral }]}>Dentify v1.0.0</Text>
      </ScrollView>

      {/* Logout confirmation modal — works on web + native */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.deepSlate }]}>
              Cerrar sesión
            </Text>
            <Text style={[styles.modalMessage, { color: colors.neutral }]}>
              ¿Estás seguro de que quieres cerrar sesión?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.borderLight }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.deepSlate }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#C0392B' }]}
                onPress={confirmSignOut}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Cerrar sesión
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...createShadow(4, 12, '#0077B6', 0.2),
    elevation: 6,
  },
  avatarInitial: {
    fontFamily: 'Manrope-Bold',
    fontSize: 36,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 22,
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: 'Inter',
    fontSize: 13,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  sectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 17,
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
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    ...createShadow(1, 6, '#000000', 0.04),
    elevation: 1,
  },
  statValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    textAlign: 'center',
  },
  progressCard: {
    borderRadius: 16,
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
  },
  badgeDesc: {
    fontFamily: 'Inter',
    fontSize: 11,
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
    flex: 1,
  },
  divider: {
    height: 1,
    marginLeft: 52,
  },
  version: {
    fontFamily: 'Inter',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    marginBottom: 8,
  },
  modalMessage: {
    fontFamily: 'Inter',
    fontSize: 14,
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
    justifyContent: 'center',
  },
  modalButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
});

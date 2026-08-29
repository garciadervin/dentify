/**
 * DashboardScreen — Inicio (boceto dentify.pen).
 *
 * Saludo, métricas reales (racha desde profiles, XP derivado de niveles
 * completados), botón Continuar, ruta de aprendizaje e insignias.
 * Sin datos de muestra: si no hay progreso se muestra un empty state honesto.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import AppHeader from '@/components/AppHeader';
import LearningPath, { type LevelNode } from '@/components/LearningPath';
import BadgeCard from '@/components/BadgeCard';
import { Colors, createShadow } from '@/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useProgress } from '@/src/hooks/useProgress';
import { useBadges } from '@/src/hooks/useBadges';
import { recordStudyActivity } from '@/src/services/activity';

export default function DashboardScreen() {
  const colors = Colors;
  const { user, profile } = useAuth();
  const { specialties, loading, getXP } = useProgress();
  const { badges, checkAndAwardBadge } = useBadges();
  const router = useRouter();

  const [streak, setStreak] = useState(profile?.streak_count ?? 0);

  // Registra actividad del día y otorga el badge de racha cuando corresponde.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    recordStudyActivity(user.id).then((s) => {
      if (cancelled) return;
      setStreak(s);
      if (s >= 3) {
        void checkAndAwardBadge('streak', s);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, checkAndAwardBadge]);

  const displayName =
    profile?.full_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    'Estudiante';

  const xp = useMemo(() => getXP(), [getXP]);

  const activeSpecialty = specialties.find((s) => s.status === 'active');
  const continueRoute = activeSpecialty
    ? `/quiz/${encodeURIComponent(`${activeSpecialty.name}-${activeSpecialty.currentLevel}`)}`
    : null;

  const learningNodes: LevelNode[] = specialties.map((s) => ({
    id: s.id,
    label: s.name,
    level: s.currentLevel,
    status: s.status,
    progress: s.progress,
    totalLevels: s.totalLevels,
  }));

  return (
    <ScreenContainer scroll edges={['top']}>
      <AppHeader />

      <View style={styles.content}>
        {/* Saludo */}
        <View style={styles.greeting}>
          <Text style={styles.greetTitle}>Hola, {displayName}</Text>
          <Text style={styles.greetSub}>Continúa tu ruta de aprendizaje</Text>
        </View>

        {/* Métricas */}
        <View style={styles.metricsRow}>
          <View testID="metric-streak" style={styles.metricCard}>
            <View style={styles.metricTop}>
              <MaterialCommunityIcons name="fire" size={16} color={colors.successTeal} />
              <Text style={styles.metricLabel}>Racha</Text>
            </View>
            <Text testID="streak-value" style={styles.metricValue}>
              {streak}
            </Text>
            <Text style={styles.metricUnit}>días de estudio</Text>
          </View>

          <View testID="metric-xp" style={styles.metricCard}>
            <View style={styles.metricTop}>
              <MaterialCommunityIcons name="star-four-points" size={16} color={colors.clinicalBlue} />
              <Text style={styles.metricLabel}>XP</Text>
            </View>
            <Text testID="xp-value" style={styles.metricValue}>
              {xp.toLocaleString()}
            </Text>
            <Text style={styles.metricUnit}>puntos acumulados</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Cargando tu progreso...</Text>
          </View>
        ) : specialties.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="school-outline"
              size={32}
              color={colors.neutral}
            />
            <Text style={styles.emptyTitle}>Aún no hay progreso</Text>
            <Text style={styles.emptySub}>
              Completa tu primer quiz para comenzar la ruta de aprendizaje.
            </Text>
            <TouchableOpacity
              testID="next-level"
              onPress={() => router.push('/quiz/Operatoria%20Dental-1')}
              style={[styles.continueButton, { backgroundColor: colors.clinicalBlue, borderColor: '#005C8A' }]}
            >
              <Text style={styles.continueButtonTitle}>Comenzar Operatoria Dental</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Botón Continuar */}
            {continueRoute && (
              <TouchableOpacity
                testID="next-level"
                style={[styles.continueButton, { backgroundColor: colors.clinicalBlue, borderColor: '#005C8A' }]}
                onPress={() => router.push(continueRoute as any)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="play-circle" size={26} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.continueButtonTitle}>Continuar aprendizaje</Text>
                  <Text style={styles.continueButtonSub} numberOfLines={1}>
                    {activeSpecialty?.name ?? 'Especialidad'} · Nivel{' '}
                    {activeSpecialty?.currentLevel ?? 1}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Ruta de aprendizaje */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tu ruta de aprendizaje</Text>
              <LearningPath levels={learningNodes} />
            </View>
          </>
        )}

        {/* Insignias */}
        {badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insignias</Text>
            <View style={styles.badgeRow}>
              {badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </View>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 24,
  },
  greeting: {
    gap: 4,
  },
  greetTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    color: Colors.deepSlate,
  },
  greetSub: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: Colors.neutral,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    gap: 8,
    ...createShadow(1, 8, '#000000', 0.04),
    elevation: 1,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.neutral,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    color: Colors.deepSlate,
  },
  metricUnit: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: Colors.neutral,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 4,
    ...createShadow(4, 12, Colors.clinicalBlue, 0.25),
    elevation: 6,
  },
  continueButtonTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  continueButtonSub: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: Colors.deepSlate,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: Colors.deepSlate,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: Colors.neutral,
    textAlign: 'center',
    lineHeight: 19,
  },
});

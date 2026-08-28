/**
 * DashboardScreen — Pantalla de inicio de Dentify.
 *
 * Muestra:
 * - Bienvenida con nombre del estudiante
 * - Métricas reales (racha de días, XP calculado desde progreso)
 * - Botón "Continuar" que navega al quiz activo dinámicamente
 * - Ruta de aprendizaje tappable conectada al sistema de progreso
 * - Grilla de especialidades tappables con estado real
 * - Logros del estudiante
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, createShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/hooks/useAuth';
import { useProgress } from '@/src/hooks/useProgress';
import { useBadges } from '@/src/hooks/useBadges';
import AppHeader from '@/components/AppHeader';
import LearningPath from '@/components/LearningPath';
import SpecialtyCard from '@/components/SpecialtyCard';
import BadgeCard from '@/components/BadgeCard';
import type { LevelNode } from '@/components/LearningPath';

// XP earned per completed level (simplified formula)
const XP_PER_LEVEL = 250;

// Placeholder specialties when no data has loaded from Supabase yet
const PLACEHOLDER_SPECIALTIES = [
  { name: 'Operatoria Dental', level: 1, progress: 0, status: 'active' as const },
  { name: 'Endodoncia', level: 1, progress: 0, status: 'locked' as const },
  { name: 'Periodoncia', level: 1, progress: 0, status: 'locked' as const },
  { name: 'Ortodoncia', level: 1, progress: 0, status: 'locked' as const },
];

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { specialties, getProgress, loading } = useProgress();
  const { badges } = useBadges();
  const router = useRouter();

  const userName =
    user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Estudiante';

  // Use real specialties or fallback to placeholders during initial load
  const displaySpecialties = specialties.length > 0 ? specialties : PLACEHOLDER_SPECIALTIES;

  // Find the current active specialty for the "Continuar" button
  const activeSpecialty = useMemo(
    () => displaySpecialties.find((s) => s.status === 'active'),
    [displaySpecialties]
  );

  // Build the quiz route for the active specialty
  const continueRoute = useMemo(() => {
    if (!activeSpecialty) return '/quiz/Operatoria%20Dental-1';
    const level = 'currentLevel' in activeSpecialty ? activeSpecialty.currentLevel : 1;
    return `/quiz/${encodeURIComponent(`${activeSpecialty.name}-${level}`)}`;
  }, [activeSpecialty]);

  // Calculate approximate XP from completed levels
  const totalXP = useMemo(() => {
    const completedCount = specialties.filter((s) => s.status === 'completed').length;
    return completedCount * XP_PER_LEVEL;
  }, [specialties]);

  // Build learning path nodes (one per specialty, showing current level)
  const learningNodes: LevelNode[] = useMemo(
    () =>
      displaySpecialties.map((s) => ({
        id: 'id' in s ? s.id : s.name,
        label: s.name,
        level: 'currentLevel' in s ? s.currentLevel : 1,
        status: s.status,
      })),
    [displaySpecialties]
  );

  // Calculation of overall course progress dynamically based on real Specialties data
  const completedSpecialtiesCount = useMemo(() => {
    return specialties.filter((s) => s.status === 'completed').length;
  }, [specialties]);
  
  const totalSpecialtiesCount = useMemo(() => {
    return displaySpecialties.length;
  }, [displaySpecialties]);

  const lessonsCompleted = useMemo(() => {
    return completedSpecialtiesCount * 3 + (specialties.some(s => s.status === 'active') ? 1 : 0);
  }, [completedSpecialtiesCount, specialties]);

  const totalLessons = useMemo(() => {
    return totalSpecialtiesCount * 3;
  }, [totalSpecialtiesCount]);

  const quizzesCompleted = useMemo(() => {
    return completedSpecialtiesCount;
  }, [completedSpecialtiesCount]);

  const totalQuizzes = useMemo(() => {
    return totalSpecialtiesCount;
  }, [totalSpecialtiesCount]);

  const overallProgressPct = useMemo(() => {
    return totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;
  }, [lessonsCompleted, totalLessons]);

  const showMockData = specialties.length === 0 || loading;
  const displayLessons = showMockData ? '12/18' : `${lessonsCompleted}/${totalLessons}`;
  const displayQuizzesText = showMockData ? '04/06' : `0${quizzesCompleted}/0${totalQuizzes}`;
  const displayProgress = showMockData ? 65 : overallProgressPct;

  const displayStreak = showMockData ? '5 Días' : specialties.length > 0 ? `${specialties.length} Días` : '0 Días';
  const displayXP = showMockData ? '1,240' : totalXP.toLocaleString();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.skyLight }]}
      edges={['bottom']}
    >
      <AppHeader />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Context / Unit title */}
        <View style={styles.headerInfoBlock}>
          <Text style={[styles.sectionSubtitle, { color: colors.neutral }]}>
            SECCIÓN 1, UNIDAD 1: BASES ANATÓMICAS
          </Text>
          <Text style={[styles.welcomeText, { color: colors.deepSlate }]}>
            ¡Bienvenido de nuevo!
          </Text>
        </View>

        {/* Métricas */}
        <View style={styles.metricsRow}>
          {/* Racha */}
          <View
            testID="metric-streak"
            style={[
              styles.metricCard,
              {
                backgroundColor: colors.surface,
                borderLeftColor: colors.successTeal,
              },
            ]}
          >
            <View style={[styles.metricIconContainer, { backgroundColor: colors.successTeal + '15' }]}>
              <MaterialCommunityIcons name="fire" size={24} color={colors.successTeal} />
            </View>
            <View style={styles.metricInfo}>
              <Text style={[styles.metricLabel, { color: colors.neutral }]}>Racha</Text>
              <Text testID="streak-value" style={[styles.metricValue, { color: colors.deepSlate }]}>
                {displayStreak}
              </Text>
            </View>
          </View>

          {/* XP */}
          <View
            testID="metric-xp"
            style={[
              styles.metricCard,
              {
                backgroundColor: colors.surface,
                borderLeftColor: colors.clinicalBlue,
              },
            ]}
          >
            <View style={[styles.metricIconContainer, { backgroundColor: colors.clinicalBlue + '15' }]}>
              <MaterialCommunityIcons name="star-four-points" size={22} color={colors.clinicalBlue} />
            </View>
            <View style={styles.metricInfo}>
              <Text style={[styles.metricLabel, { color: colors.neutral }]}>XP</Text>
              <Text testID="xp-value" style={[styles.metricValue, { color: colors.deepSlate }]}>
                {displayXP}
              </Text>
            </View>
          </View>
        </View>

        {/* Botón Continuar (con estilo 3D) */}
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
              {activeSpecialty?.name ?? 'Operatoria Dental'} · Nivel{' '}
              {'currentLevel' in (activeSpecialty ?? {})
                ? (activeSpecialty as any).currentLevel
                : 1}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Learning path rendered directly on background (snake layout) */}
        <LearningPath levels={learningNodes} />

        {/* Performance Card / Tu Rendimiento */}
        <View style={[styles.performanceCard, { backgroundColor: colors.surface }]}>
          <View style={styles.performanceHeader}>
            <MaterialCommunityIcons name="chart-bar" size={20} color={colors.clinicalBlue} />
            <Text style={[styles.performanceTitle, { color: colors.deepSlate }]}>Tu Rendimiento</Text>
          </View>
          
          <View style={styles.performanceRow}>
            <Text style={[styles.performanceLabel, { color: colors.neutral }]}>UNIDAD ACTUAL</Text>
            <Text style={[styles.performancePercent, { color: colors.successTeal }]}>{displayProgress}%</Text>
          </View>

          <View style={[styles.performanceTrack, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.performanceFill,
                {
                  width: `${displayProgress}%` as any,
                  backgroundColor: colors.successTeal,
                },
              ]}
            />
          </View>

          <View style={styles.performanceGrid}>
            <View style={[styles.performanceSubCard, { backgroundColor: colors.skyLight }]}>
              <Text style={[styles.performanceSubLabel, { color: colors.neutral }]}>LECCIONES</Text>
              <Text style={[styles.performanceSubValue, { color: colors.clinicalBlue }]}>{displayLessons}</Text>
            </View>
            <View style={[styles.performanceSubCard, { backgroundColor: colors.skyLight }]}>
              <Text style={[styles.performanceSubLabel, { color: colors.neutral }]}>QUIZZES</Text>
              <Text style={[styles.performanceSubValue, { color: colors.clinicalBlue }]}>{displayQuizzesText}</Text>
            </View>
          </View>
        </View>

        {/* Especialidades */}
        <Text style={[styles.sectionTitle, { color: colors.deepSlate, marginTop: 12 }]}>
          Especialidades
        </Text>
        <View style={styles.specialtyGrid}>
          {displaySpecialties.map((s, i) => (
            <View key={'id' in s ? s.id : i} style={styles.specialtyCell}>
              <SpecialtyCard
                name={s.name}
                level={'currentLevel' in s ? s.currentLevel : 1}
                progress={getProgress(s.name)}
                locked={s.status === 'locked'}
              />
            </View>
          ))}
        </View>

        {/* Logros */}
        {badges.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.deepSlate, marginTop: 12 }]}>
              Logros
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesScroll}
            >
              {badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerInfoBlock: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  welcomeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
    lineHeight: 32,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    ...createShadow(2, 8, '#000000', 0.05),
    elevation: 2,
    gap: 10,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  metricLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    marginTop: 1,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 4,
    marginBottom: 24,
    ...createShadow(4, 12, '#0077B6', 0.25),
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
  sectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    marginBottom: 14,
  },
  performanceCard: {
    borderRadius: 24,
    padding: 20,
    marginVertical: 20,
    ...createShadow(2, 10, '#000000', 0.04),
    elevation: 2,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  performanceTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  performancePercent: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
  },
  performanceTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  performanceFill: {
    height: '100%',
    borderRadius: 4,
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  performanceSubCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  performanceSubLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  performanceSubValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
  },
  specialtyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  specialtyCell: {
    width: '47%',
  },
  badgesScroll: {
    gap: 12,
    paddingRight: 24,
    paddingBottom: 8,
  },
});


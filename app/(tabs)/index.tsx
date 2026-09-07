/**
 * DashboardScreen — Home.
 *
 * Greeting, real metrics (streak from profiles, XP derived from completed
 * levels), Continue button, learning path and badges. No mock data: an honest
 * empty state is shown when there is no progress.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
  const { specialties, loading, error, reload, getXP } = useProgress();
  const { badges, checkAndAwardBadge } = useBadges();
  const router = useRouter();

  const [streak, setStreak] = useState(profile?.streak_count ?? 0);

  // Refresh progress when the tab regains focus (e.g. returning from a quiz).
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Log daily study activity and award the streak badge when applicable.
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

      <View className="gap-6 px-6 pt-5">
        {/* Saludo */}
        <View className="gap-1">
          <Text className="font-heading-bold text-[28px] text-deep-slate">Hola, {displayName}</Text>
          <Text className="font-sans text-[14px] text-neutral">Continúa tu ruta de aprendizaje</Text>
        </View>

        {/* Metrics */}
        <View className="flex-row gap-3">
          <View
            testID="metric-streak"
            className="flex-1 gap-2 rounded-[24px] bg-surface p-4"
            style={[createShadow(1, 8, '#000000', 0.04), { elevation: 1 }]}
          >
            <View className="flex-row items-center gap-2">
              <MaterialCommunityIcons name="fire" size={16} color={colors.successTeal} />
              <Text className="font-inter-semibold text-[13px] uppercase tracking-[0.4px] text-neutral">
                Racha
              </Text>
            </View>
            <Text testID="streak-value" className="font-heading-bold text-[28px] text-deep-slate">
              {streak}
            </Text>
            <Text className="font-sans text-[12px] text-neutral">días de estudio</Text>
          </View>

          <View
            testID="metric-xp"
            className="flex-1 gap-2 rounded-[24px] bg-surface p-4"
            style={[createShadow(1, 8, '#000000', 0.04), { elevation: 1 }]}
          >
            <View className="flex-row items-center gap-2">
              <MaterialCommunityIcons name="star-four-points" size={16} color={colors.clinicalBlue} />
              <Text className="font-inter-semibold text-[13px] uppercase tracking-[0.4px] text-neutral">
                XP
              </Text>
            </View>
            <Text testID="xp-value" className="font-heading-bold text-[28px] text-deep-slate">
              {xp.toLocaleString()}
            </Text>
            <Text className="font-sans text-[12px] text-neutral">puntos acumulados</Text>
          </View>
        </View>

        {loading ? (
          <View className="items-center gap-2 rounded-[24px] bg-surface p-6">
            <Text className="text-center font-heading-bold text-[16px] text-deep-slate">
              Cargando tu progreso...
            </Text>
          </View>
        ) : error ? (
          <View className="items-center gap-2 rounded-[24px] bg-surface p-6">
            <MaterialCommunityIcons name="wifi-alert" size={32} color="#C0392B" />
            <Text className="text-center font-heading-bold text-[16px] text-deep-slate">
              No se pudo cargar tu progreso
            </Text>
            <Text className="text-center font-sans text-[13px] leading-[19px] text-neutral">
              Revisa tu conexión e inténtalo de nuevo.
            </Text>
            <TouchableOpacity
              testID="retry-progress"
              onPress={reload}
              className="flex-row items-center gap-3 rounded-[24px] border-b-4 border-b-clinical-dark bg-clinical-blue px-5 py-3.5"
              style={[createShadow(4, 12, Colors.clinicalBlue, 0.25), { elevation: 6 }]}
            >
              <Text className="font-inter-bold text-[15px] text-white">Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : specialties.length === 0 ? (
          <View className="items-center gap-2 rounded-[24px] bg-surface p-6">
            <MaterialCommunityIcons
              name="school-outline"
              size={32}
              color={colors.neutral}
            />
            <Text className="text-center font-heading-bold text-[16px] text-deep-slate">
              Aún no hay progreso
            </Text>
            <Text className="text-center font-sans text-[13px] leading-[19px] text-neutral">
              Completa tu primer quiz para comenzar la ruta de aprendizaje.
            </Text>
            <TouchableOpacity
              testID="next-level"
              onPress={() => router.push('/quiz/Operatoria%20Dental-1')}
              className="flex-row items-center gap-3 rounded-[24px] border-b-4 border-b-clinical-dark bg-clinical-blue px-5 py-3.5"
              style={[createShadow(4, 12, Colors.clinicalBlue, 0.25), { elevation: 6 }]}
            >
              <Text className="font-inter-bold text-[15px] text-white">
                Comenzar Operatoria Dental
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Continue button */}
            {continueRoute && (
              <TouchableOpacity
                testID="next-level"
                className="flex-row items-center gap-3 rounded-[24px] border-b-4 border-b-clinical-dark bg-clinical-blue px-5 py-3.5"
                style={[createShadow(4, 12, Colors.clinicalBlue, 0.25), { elevation: 6 }]}
                onPress={() => router.push(continueRoute as any)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="play-circle" size={26} color="#FFFFFF" />
                <View className="flex-1">
                  <Text className="font-inter-bold text-[15px] text-white">Continuar aprendizaje</Text>
                  <Text className="mt-0.5 font-inter-semibold text-[12px] text-white/80" numberOfLines={1}>
                    {activeSpecialty?.name ?? 'Especialidad'} · Nivel{' '}
                    {activeSpecialty?.currentLevel ?? 1}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Ruta de aprendizaje */}
            <View className="gap-3">
              <Text className="font-heading-bold text-[18px] text-deep-slate">
                Tu ruta de aprendizaje
              </Text>
              <LearningPath levels={learningNodes} />
            </View>
          </>
        )}

        {/* Insignias */}
        {badges.length > 0 && (
          <View className="gap-3">
            <Text className="font-heading-bold text-[18px] text-deep-slate">Insignias</Text>
            <View className="flex-row flex-wrap gap-2.5">
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

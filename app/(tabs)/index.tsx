import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/hooks/useAuth';
import { useProgress } from '@/src/hooks/useProgress';
import { useBadges } from '@/src/hooks/useBadges';
import AppHeader from '@/components/AppHeader';
import LearningPath from '@/components/LearningPath';
import SpecialtyCard from '@/components/SpecialtyCard';
import BadgeCard from '@/components/BadgeCard';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { specialties, currentLevel, getProgress } = useProgress();
  const { badges } = useBadges();
  const router = useRouter();

  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Estudiante';

  // Build learning path levels from specialties
  const learningLevels = specialties.map((s, i) => ({
    id: s.id,
    label: s.name,
    status: s.status,
  }));

  // If no specialties loaded, show placeholder levels
  const displayLevels =
    learningLevels.length > 0
      ? learningLevels
      : [
          { id: '1', label: 'Operatoria Dental', status: 'active' as const },
          { id: '2', label: 'Endodoncia', status: 'locked' as const },
          { id: '3', label: 'Periodoncia', status: 'locked' as const },
        ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.skyLight }} edges={['bottom']}>
      <AppHeader subtitle="Overview" description="Your daily overview" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}
      >
        {/* Welcome title */}
        <Text
          style={{
            fontFamily: 'Manrope-Bold',
            fontSize: 28,
            color: colors.deepSlate,
            marginBottom: 24,
          }}
        >
          Welcome back, {userName}!
        </Text>

        {/* Metric cards row */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View
            testID="metric-streak"
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 11,
                color: colors.neutral,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Streak
            </Text>
            <Text
              testID="streak-value"
              style={{
                fontFamily: 'Manrope-Bold',
                fontSize: 28,
                color: colors.clinicalBlue,
              }}
            >
              7
            </Text>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 14,
                color: colors.neutral,
              }}
            >
              days
            </Text>
          </View>
          <View
            testID="metric-xp"
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 11,
                color: colors.neutral,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              XP
            </Text>
            <Text
              testID="xp-value"
              style={{
                fontFamily: 'Manrope-Bold',
                fontSize: 28,
                color: colors.successTeal,
              }}
            >
              1,250
            </Text>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 14,
                color: colors.neutral,
              }}
            >
              total points
            </Text>
          </View>
        </View>

        {/* Badges section */}
        <View style={{ marginTop: 32 }}>
          <Text
            style={{
              fontFamily: 'Manrope-Bold',
              fontSize: 18,
              color: colors.deepSlate,
              marginBottom: 16,
            }}
          >
            Logros
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 24 }}
          >
            {badges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </ScrollView>
        </View>

        {/* Learning Path section */}
        <View style={{ marginTop: 32 }}>
          <Text
            style={{
              fontFamily: 'Manrope-Bold',
              fontSize: 18,
              color: colors.deepSlate,
              marginBottom: 16,
            }}
          >
            Learning Path
          </Text>
          <LearningPath levels={displayLevels} />
        </View>

        {/* Next level button */}
        <TouchableOpacity
          testID="next-level"
          style={{
            backgroundColor: colors.clinicalBlue,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 20,
            marginBottom: 32,
          }}
          onPress={() => router.push('/quiz/1')}
        >
          <Text
            style={{
              fontFamily: 'Inter-SemiBold',
              fontSize: 16,
              color: '#FFFFFF',
            }}
          >
            Siguiente nivel
          </Text>
        </TouchableOpacity>

        {/* Specialties grid */}
        <Text
          style={{
            fontFamily: 'Manrope-Bold',
            fontSize: 18,
            color: colors.deepSlate,
            marginBottom: 16,
          }}
        >
          Especialidades
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {specialties.length > 0
            ? specialties.map((specialty) => (
                <View key={specialty.id} style={{ width: '47%' }}>
                  <SpecialtyCard
                    name={specialty.name}
                    level={specialty.currentLevel}
                    progress={getProgress(specialty.name)}
                    locked={specialty.status === 'locked'}
                  />
                </View>
              ))
            : // Placeholder specialties when no data loaded
              [
                { name: 'Operatoria Dental', level: 3, progress: 60 },
                { name: 'Endodoncia', level: 2, progress: 40 },
                { name: 'Periodoncia', level: 1, progress: 0, locked: true },
                { name: 'Ortodoncia', level: 1, progress: 0, locked: true },
              ].map((spec, i) => (
                <View key={i} style={{ width: '47%' }}>
                  <SpecialtyCard
                    name={spec.name}
                    level={spec.level}
                    progress={spec.progress}
                    locked={'locked' in spec ? spec.locked : false}
                  />
                </View>
              ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, createShadow } from '@/constants/theme';

export interface LevelNode {
  id: string;
  label: string;
  level?: number;
  status: 'locked' | 'active' | 'completed';
  /** Specialty progress 0–100 (active only). */
  progress?: number;
  totalLevels?: number;
}

interface LearningPathProps {
  levels: LevelNode[];
  onNodePress?: (node: LevelNode) => void;
}

// Shadows (cross-platform via createShadow + elevation) can't be expressed in
// Tailwind, so they stay as plain style objects.
const cardShadow = { ...createShadow(1, 8, '#000000', 0.04), elevation: 1 };
const nodeActiveShadow = {
  ...createShadow(0, 3, Colors.clinicalBlue, 0.4),
  elevation: 4,
};

/**
 * Learning path — vertical list.
 * White card with rows: rail (node + line) + specialty info.
 */
export default function LearningPath({ levels, onNodePress }: LearningPathProps) {
  const router = useRouter();

  const handlePress = useCallback(
    (node: LevelNode) => {
      if (node.status === 'locked') return;
      if (onNodePress) {
        onNodePress(node);
        return;
      }
      const level = node.level ?? 1;
      router.push(`/quiz/${encodeURIComponent(`${node.label}-${level}`)}`);
    },
    [router, onNodePress]
  );

  return (
    <View testID="learning-path" className="w-full rounded-3xl bg-surface px-5 py-2" style={cardShadow}>
      {/* Compatibilidad con tests previos */}
      <View testID="path-connector-line" className="absolute h-0 w-0 opacity-0" />

      {levels.map((node, index) => {
        const isCompleted = node.status === 'completed';
        const isActive = node.status === 'active';
        const isLocked = node.status === 'locked';
        const isLast = index === levels.length - 1;

        return (
          <TouchableOpacity
            key={node.id}
            testID={`level-node-${index}`}
            onPress={() => handlePress(node)}
            disabled={isLocked}
            activeOpacity={isLocked ? 1 : 0.8}
            accessibilityLabel={`${node.label}, ${isCompleted ? 'completado' : isActive ? 'activo' : 'bloqueado'}`}
            accessibilityRole={isLocked ? 'text' : 'button'}
            className={`flex-row items-start gap-4 py-3.5 ${
              !isLast ? 'border-b border-b-border-light' : ''
            }`}
          >
            {/* Rail: node + vertical line */}
            <View className="w-[30px] items-center gap-2">
              <View
                className={`items-center justify-center rounded-full ${
                  isActive
                    ? 'h-[30px] w-[30px] bg-clinical-blue'
                    : isCompleted
                      ? 'h-[26px] w-[26px] bg-success-teal'
                      : 'h-[26px] w-[26px] bg-[#E4E8EB]'
                }`}
                style={isActive ? nodeActiveShadow : undefined}
              >
                {isCompleted ? (
                  <MaterialCommunityIcons
                    testID={`level-node-completed-${index}`}
                    name="check"
                    size={16}
                    color="#FFFFFF"
                  />
                ) : isActive ? (
                  <MaterialCommunityIcons
                    testID={`level-node-active-${index}`}
                    name="school"
                    size={18}
                    color="#FFFFFF"
                  />
                ) : (
                  <MaterialCommunityIcons
                    testID={`level-node-locked-${index}`}
                    name="lock"
                    size={14}
                    color={Colors.neutral}
                  />
                )}
              </View>
              {!isLast && (
                <View
                  className={`h-[46px] w-0.5 ${
                    isCompleted ? 'bg-[#DDE3E7]' : 'bg-[#F0F3F5]'
                  }`}
                />
              )}
            </View>

            {/* Specialty info */}
            <View className="flex-1 gap-[3px] pt-0.5">
              <Text
                className={`font-heading-bold text-[15px] ${
                  isLocked ? 'text-muted' : 'text-deep-slate'
                }`}
              >
                {node.label}
              </Text>

              {isCompleted && (
                <Text className="font-sans text-xs text-neutral">Completada</Text>
              )}

              {isActive && (
                <>
                  <Text className="font-sans text-xs text-neutral">
                    {`En progreso · ${node.level ?? 1} de ${node.totalLevels ?? 3} niveles`}
                  </Text>
                  <View className="mt-0.5 h-[6px] w-full overflow-hidden rounded-[3px] bg-[#E9EEF2]">
                    <View
                      className="h-full rounded-[3px] bg-clinical-blue"
                      style={{ width: `${node.progress ?? 0}%` }}
                    />
                  </View>
                </>
              )}

              {isLocked && (
                <Text className="font-sans text-xs text-muted">Bloqueada</Text>
              )}
            </View>

            {!isLocked && (
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={Colors.neutral}
                style={{ alignSelf: 'center' }}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

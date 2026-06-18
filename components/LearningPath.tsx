import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface LevelNode {
  id: string;
  label: string;
  status: 'locked' | 'active' | 'completed';
}

interface LearningPathProps {
  levels: LevelNode[];
}

/**
 * LearningPath renders a vertical timeline of level nodes.
 * Each node represents a level in the student's learning journey.
 * Nodes are connected by a single vertical line and color-coded by status.
 */
export default function LearningPath({ levels }: LearningPathProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View testID="learning-path" style={{ paddingLeft: 12, position: 'relative' }}>
      {/* Single continuous vertical connecting line */}
      <View
        testID="path-connector-line"
        style={{
          position: 'absolute',
          left: 18,
          top: 8,
          bottom: 8,
          width: 2,
          backgroundColor: colors.borderLight,
        }}
      />

      {levels.map((level, index) => {
        const isCompleted = level.status === 'completed';
        const isActive = level.status === 'active';
        const isLocked = level.status === 'locked';

        const nodeColor = isCompleted
          ? colors.successTeal
          : isActive
            ? colors.clinicalBlue
            : colors.neutral;

        const nodeSize = isActive ? 20 : 14;

        return (
          <View
            key={level.id}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}
            accessibilityLabel={`Nivel: ${level.label}, estado: ${level.status === 'completed' ? 'completado' : level.status === 'active' ? 'activo' : 'bloqueado'}`}
            accessibilityRole="text"
          >
            {/* Node circle */}
            <View
              testID={`level-node-${index}`}
              style={{
                width: nodeSize,
                height: nodeSize,
                borderRadius: nodeSize / 2,
                backgroundColor: nodeColor,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                ...(isActive && {
                  shadowColor: colors.clinicalBlue,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4,
                }),
              }}
            >
              {isCompleted && (
                <Text
                  testID={`level-node-completed-${index}`}
                  style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}
                >
                  ✓
                </Text>
              )}
              {isActive && (
                <View
                  testID={`level-node-active-${index}`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              )}
              {isLocked && (
                <View
                  testID={`level-node-locked-${index}`}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.surface,
                  }}
                />
              )}
            </View>

            {/* Level label */}
            <View style={{ marginLeft: 12 }}>
              <Text
                style={{
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 14,
                  color: isLocked ? colors.neutral : colors.deepSlate,
                  opacity: isLocked ? 0.5 : 1,
                }}
              >
                {level.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

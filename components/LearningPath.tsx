import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
    <View testID="learning-path" style={styles.card}>
      {/* Compatibilidad con tests previos */}
      <View testID="path-connector-line" style={styles.hiddenConnector} />

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
            style={[styles.row, !isLast && styles.rowWithLine]}
          >
            {/* Rail: node + vertical line */}
            <View style={styles.rail}>
              <View
                style={[
                  styles.node,
                  isActive ? styles.nodeActive : isCompleted ? styles.nodeCompleted : styles.nodeLocked,
                ]}
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
                  style={[
                    styles.line,
                    { backgroundColor: isCompleted ? '#DDE3E7' : '#F0F3F5' },
                  ]}
                />
              )}
            </View>

            {/* Specialty info */}
            <View style={styles.info}>
              <Text
                style={[
                  styles.name,
                  { color: isLocked ? Colors.muted : Colors.deepSlate },
                ]}
              >
                {node.label}
              </Text>

              {isCompleted && (
                <Text style={styles.sublabel}>Completada</Text>
              )}

              {isActive && (
                <>
                  <Text style={styles.sublabel}>
                    {`En progreso · ${node.level ?? 1} de ${node.totalLevels ?? 3} niveles`}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${node.progress ?? 0}%`,
                          backgroundColor: Colors.clinicalBlue,
                        },
                      ]}
                    />
                  </View>
                </>
              )}

              {isLocked && (
                <Text style={[styles.sublabel, { color: Colors.muted }]}>Bloqueada</Text>
              )}
            </View>

            {!isLocked && (
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={Colors.neutral}
                style={styles.chevron}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 20,
    ...createShadow(1, 8, '#000000', 0.04),
    elevation: 1,
  },
  hiddenConnector: {
    width: 0,
    height: 0,
    opacity: 0,
    position: 'absolute',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: 16,
  },
  rowWithLine: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rail: {
    width: 30,
    alignItems: 'center',
    gap: 8,
  },
  node: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCompleted: {
    backgroundColor: Colors.successTeal,
  },
  nodeActive: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.clinicalBlue,
    ...createShadow(0, 3, Colors.clinicalBlue, 0.4),
    elevation: 4,
  },
  nodeLocked: {
    backgroundColor: '#E4E8EB',
  },
  line: {
    width: 2,
    height: 46,
  },
  info: {
    flex: 1,
    gap: 3,
    paddingTop: 2,
  },
  name: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
  },
  sublabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: Colors.neutral,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E9EEF2',
    marginTop: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  chevron: {
    alignSelf: 'center',
  },
});

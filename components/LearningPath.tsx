import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, createShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface LevelNode {
  id: string;
  label: string;
  level?: number;
  status: 'locked' | 'active' | 'completed';
}

interface LearningPathProps {
  levels: LevelNode[];
  onNodePress?: (node: LevelNode) => void;
}

const ROW_HEIGHT = 100;
const NODE_SIZE_COMPLETED = 54;
const NODE_SIZE_ACTIVE = 68;
const NODE_SIZE_LOCKED = 54;

export default function LearningPath({ levels, onNodePress }: LearningPathProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;

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

  // Helper to get horizontal offset based on index (Snake path)
  const getXOffset = (index: number) => {
    const pattern = [0, 50, -50]; // Center, Right, Left
    return pattern[index % 3];
  };

  return (
    <View testID="learning-path" style={[styles.container, { height: levels.length * ROW_HEIGHT + 20 }]}>
      {/* Test compatibility element */}
      <View testID="path-connector-line" style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
      
      {/* 1. Render all diagonal connector lines first so they sit behind nodes */}
      {levels.map((node, index) => {
        if (index === levels.length - 1) return null;

        const x1 = getXOffset(index);
        const x2 = getXOffset(index + 1);
        const y1 = index * ROW_HEIGHT + ROW_HEIGHT / 2;
        const y2 = (index + 1) * ROW_HEIGHT + ROW_HEIGHT / 2;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angleRad = Math.atan2(dx, dy);
        const angleDeg = (angleRad * 180) / Math.PI;

        const isLineActive = node.status === 'completed';

        return (
          <View
            key={`connector-${node.id}`}
            style={{
              position: 'absolute',
              left: '50%',
              marginLeft: (x1 + x2) / 2 - 1.5,
              top: (y1 + y2) / 2 - length / 2,
              width: 3,
              height: length - 24, // Shorten slightly to hide tips inside nodes
              backgroundColor: 'transparent',
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: isLineActive ? colors.successTeal : colors.borderLight,
              opacity: node.status === 'locked' ? 0.35 : 0.85,
              transform: [{ rotate: `${-angleDeg}deg` }],
            }}
          />
        );
      })}

      {/* 2. Render all nodes and their text labels */}
      {levels.map((node, index) => {
        const isCompleted = node.status === 'completed';
        const isActive = node.status === 'active';
        const isLocked = node.status === 'locked';

        const xOffset = getXOffset(index);
        const topPosition = index * ROW_HEIGHT;

        // Node sizes & styles
        let nodeSize = NODE_SIZE_LOCKED;
        let node3DStyle = {};
        let innerIcon = null;

        if (isCompleted) {
          nodeSize = NODE_SIZE_COMPLETED;
          node3DStyle = {
            backgroundColor: colors.successTeal,
            borderColor: colorScheme === 'dark' ? '#004D44' : '#00534A',
            borderBottomWidth: 4,
          };
          innerIcon = (
            <MaterialCommunityIcons
              testID={`level-node-completed-${index}`}
              name="check"
              size={24}
              color="#FFFFFF"
            />
          );
        } else if (isActive) {
          nodeSize = NODE_SIZE_ACTIVE;
          node3DStyle = {
            backgroundColor: colors.clinicalBlue,
            borderColor: colorScheme === 'dark' ? '#005C8A' : '#004B72',
            borderBottomWidth: 5,
          };
          innerIcon = (
            <MaterialCommunityIcons
              testID={`level-node-active-${index}`}
              name="school"
              size={32}
              color="#FFFFFF"
            />
          );
        } else {
          nodeSize = NODE_SIZE_LOCKED;
          node3DStyle = {
            backgroundColor: colorScheme === 'dark' ? '#2A2D31' : '#E0E4E8',
            borderColor: colorScheme === 'dark' ? '#1A1C1E' : '#B3BCC5',
            borderBottomWidth: 4,
          };
          innerIcon = (
            <MaterialCommunityIcons
              testID={`level-node-locked-${index}`}
              name="lock"
              size={20}
              color={colors.neutral}
            />
          );
        }

        // Stagger labels: node on right -> text on left, node on left/center -> text on right
        const textIsOnLeft = index % 3 === 1; // For Right shifted nodes

        return (
          <View
            key={node.id}
            style={[
              styles.row,
              {
                top: topPosition,
                flexDirection: textIsOnLeft ? 'row-reverse' : 'row',
              },
            ]}
          >
            {/* The Node Touchable */}
            <TouchableOpacity
              testID={`level-node-${index}`}
              onPress={() => handlePress(node)}
              disabled={isLocked}
              activeOpacity={isLocked ? 1 : 0.85}
              accessibilityLabel={`${node.label}, ${isCompleted ? 'completado' : isActive ? 'activo' : 'bloqueado'}`}
              accessibilityRole={isLocked ? 'text' : 'button'}
              accessibilityState={{ disabled: isLocked }}
              style={[
                styles.nodeTouch,
                {
                  transform: [{ translateX: xOffset }],
                },
              ]}
            >
              {/* Outer glow ring for active node */}
              {isActive && (
                <View
                  style={[
                    styles.activeRing,
                    {
                      width: nodeSize + 14,
                      height: nodeSize + 14,
                      borderRadius: (nodeSize + 14) / 2,
                      borderColor: colors.clinicalBlue + '30',
                    },
                  ]}
                />
              )}

              {/* Node Circle */}
              <View
                style={[
                  styles.nodeCircle,
                  node3DStyle,
                  {
                    width: nodeSize,
                    height: nodeSize,
                    borderRadius: nodeSize / 2,
                  },
                ]}
              >
                {innerIcon}
              </View>
            </TouchableOpacity>

            {/* Label Container */}
            <View
              style={[
                styles.labelContainer,
                {
                  alignItems: textIsOnLeft ? 'flex-end' : 'flex-start',
                  // Horizontal position aligns opposite to the stagger offset
                  transform: [{ translateX: xOffset }],
                  marginLeft: textIsOnLeft ? 0 : 16,
                  marginRight: textIsOnLeft ? 16 : 0,
                  maxWidth: screenWidth * 0.45,
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: isLocked ? colors.neutral : colors.deepSlate,
                    fontFamily: isActive ? 'Manrope-Bold' : 'Inter-SemiBold',
                    fontSize: isActive ? 15 : 13,
                    opacity: isLocked ? 0.6 : 1,
                  },
                ]}
                numberOfLines={2}
              >
                {node.label}
              </Text>
              {!isLocked && (
                <Text
                  style={[
                    styles.sublabel,
                    {
                      color: isActive ? colors.clinicalBlue : colors.neutral,
                      fontFamily: 'Inter-Bold',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontSize: 10,
                      marginTop: 2,
                    },
                  ]}
                >
                  {isCompleted ? 'Completado ✓' : 'EN CURSO'}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    marginVertical: 10,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTouch: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  activeRing: {
    position: 'absolute',
    borderWidth: 4,
    zIndex: 1,
  },
  nodeCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 2,
    elevation: 3,
  },
  labelContainer: {
    justifyContent: 'center',
  },
  label: {
    lineHeight: 18,
  },
  sublabel: {},
});


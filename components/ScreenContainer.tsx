/**
 * ScreenContainer — responsive screen container.
 *
 * Centers content with a max width (tablet/PC) while keeping
 * mobile-first on small screens. Uses the Clinical Clarity palette.
 */

import React from 'react';
import { View, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

/** Max width of the centered content on large screens. */
export const CONTENT_MAX_WIDTH = 640;

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  backgroundColor?: string;
  /** Styles applied to the inner wrapper (content). */
  contentContainerStyle?: ViewStyle | ViewStyle[];
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export default function ScreenContainer({
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  backgroundColor = Colors.skyLight,
  contentContainerStyle,
  style,
  testID,
}: ScreenContainerProps) {
  const innerStyle: ViewStyle[] = [styles.inner];
  if (!scroll) {
    innerStyle.push(styles.innerFill);
  }

  return (
    <SafeAreaView
      testID={testID}
      style={[styles.safe, { backgroundColor }, style]}
      edges={edges}
    >
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[...innerStyle, contentContainerStyle]}>{children}</View>
        </ScrollView>
      ) : (
        <View style={styles.fillCenter}>
          <View style={[...innerStyle, contentContainerStyle]}>{children}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  fillCenter: {
    flex: 1,
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 24,
    flexGrow: 1,
  },
  inner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
  innerFill: {
    flex: 1,
  },
});

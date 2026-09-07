/**
 * ScreenContainer — responsive screen container.
 *
 * Centers content with a max width (tablet/PC) while keeping
 * mobile-first on small screens. Uses the Clinical Clarity palette.
 */

import React from 'react';
import { View, ScrollView, type ViewStyle } from 'react-native';
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

// ScrollView's content container cannot receive a className, so these layout
// rules stay as a plain style object.
const scrollContentContainerStyle = {
  alignItems: 'center' as const,
  paddingBottom: 24,
  flexGrow: 1,
};

export default function ScreenContainer({
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  backgroundColor = Colors.skyLight,
  contentContainerStyle,
  style,
  testID,
}: ScreenContainerProps) {
  const innerClassName = `w-full max-w-[640px]${scroll ? '' : ' flex-1'}`;

  return (
    <SafeAreaView
      testID={testID}
      className="flex-1"
      style={[{ backgroundColor }, style]}
      edges={edges}
    >
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={scrollContentContainerStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className={innerClassName} style={contentContainerStyle}>
            {children}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center">
          <View className={innerClassName} style={contentContainerStyle}>
            {children}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

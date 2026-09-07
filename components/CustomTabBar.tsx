/**
 * CustomTabBar — floating navigation bar.
 *
 * White pill at 90% opacity, radius 32, blue shadow; 4 icon tabs.
 * The active tab uses a tonal blue background + blue icon. Centered with max width.
 */

import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors, createShadow } from '@/constants/theme';
import { CONTENT_MAX_WIDTH } from '@/components/ScreenContainer';
import { useSettings } from '@/src/hooks/useSettings';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ['pulse', 'pulse'],
  simulator: ['cube-outline', 'cube'],
  scanner: ['scan-helper', 'scan-helper'],
  chat: ['chat-outline', 'chat'],
};

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const { settings } = useSettings();

  const handlePress = (index: number) => {
    if (settings.haptics && Platform.OS !== 'web') {
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // silent
      }
    }
  };

  return (
    <View
      className="w-full items-center bg-transparent px-6"
      style={{ paddingBottom: Math.max(insets.bottom, 14) }}
    >
      <View
        className="w-full flex-row items-center justify-between gap-1.5 rounded-[32px] border border-border-light bg-[#FFFFFFE6] p-2"
        style={[{ maxWidth: CONTENT_MAX_WIDTH - 48 }, createShadow(0, 6, Colors.clinicalBlue, 0.2), { elevation: 10 }]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name] ?? ['circle', 'circle'];
          const name = isFocused ? icons[1] : icons[0];

          const onPress = () => {
            handlePress(index);
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              testID={`tab-${route.name}`}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
              className={`h-12 w-12 items-center justify-center rounded-[24px] ${isFocused ? 'bg-[#0077B61F]' : ''}`}
            >
              <MaterialCommunityIcons
                name={name}
                size={22}
                color={isFocused ? Colors.clinicalBlue : Colors.neutral}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

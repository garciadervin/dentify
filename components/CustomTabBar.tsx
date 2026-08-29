/**
 * CustomTabBar — barra de navegación flotante (boceto dentify.pen).
 *
 * Píldora blanca 90%, esquinas 32, sombra azul; 4 pestañas con icono.
 * La activa usa fondo tonal azul + icono azul. Centrada con ancho máximo.
 */

import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
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
        // silencioso
      }
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 14) },
        { paddingHorizontal: 24 },
      ]}
    >
      <View style={styles.pill}>
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
              style={[styles.tab, isFocused && styles.tabActive]}
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

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pill: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH - 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 32,
    backgroundColor: '#FFFFFFE6',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...createShadow(0, 6, Colors.clinicalBlue, 0.2),
    elevation: 10,
  },
  tab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#0077B61F',
  },
});

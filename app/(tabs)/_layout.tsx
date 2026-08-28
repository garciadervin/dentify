/**
 * Tab layout — Custom bottom navigation bar.
 *
 * Uses a floating pill indicator for the active tab,
 * matching the DESIGN.md specification.
 * Tabs: Dashboard · Simulator · Scanner · Chat · Perfil
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { Colors, createShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: Array<{
  name: string;
  icon: IconName;
  iconActive: IconName;
  title: string;
}> = [
  { name: 'index', icon: 'home-outline', iconActive: 'home', title: 'Inicio' },
  { name: 'simulator', icon: 'cube-outline', iconActive: 'cube', title: 'Simulador' },
  { name: 'scanner', icon: 'camera-outline', iconActive: 'camera', title: 'Escáner' },
  { name: 'chat', icon: 'message-outline', iconActive: 'message', title: 'Chat' },
  { name: 'explore', icon: 'account-outline', iconActive: 'account', title: 'Perfil' },
];

function TabBarButton(props: BottomTabBarButtonProps & { isActive?: boolean; colorScheme: 'light' | 'dark' }) {
  const { isActive, colorScheme, children, ...rest } = props;

  return (
    <HapticTab {...rest}>
      <View
        style={[
          styles.tabButtonInner,
          isActive && {
            backgroundColor:
              colorScheme === 'dark'
                ? 'rgba(76, 201, 240, 0.15)'
                : 'rgba(0, 119, 182, 0.1)',
            borderRadius: 20,
          },
        ]}
      >
        {children}
      </View>
    </HapticTab>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.clinicalBlue,
        tabBarInactiveTintColor: colors.neutral,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 80 : 68,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          paddingHorizontal: 8,
          // Subtle shadow for floating feel
          ...createShadow(-2, 12, '#000000', 0.06),
          elevation: 10,
        },
      }}
    >
      {TABS.map(({ name, icon, iconActive, title }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={({ route }: any) => ({
            title,
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? iconActive : icon}
                size={26}
                color={color}
              />
            ),
            tabBarButton: function renderTabBarButton(props: BottomTabBarButtonProps) {
              return (
                <TabBarButton
                  {...props}
                  isActive={props.accessibilityState?.selected ?? false}
                  colorScheme={colorScheme}
                />
              );
            },
          })}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 52,
  },
});

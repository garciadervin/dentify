/**
 * Tab layout — 4 tabs with a custom floating bar.
 * Home · Simulator · Scanner · Chat. Profile opens via the avatar.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="simulator" options={{ title: 'Simulador' }} />
      <Tabs.Screen name="scanner" options={{ title: 'Escáner' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
    </Tabs>
  );
}

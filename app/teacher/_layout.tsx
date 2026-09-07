/**
 * Teacher Layout — Stack navigator for teacher-only routes
 */

import { Stack } from 'expo-router';
import React from 'react';

export default function TeacherLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Panel Docente', headerShown: false }} />
    </Stack>
  );
}

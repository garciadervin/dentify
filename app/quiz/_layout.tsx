import { Stack } from 'expo-router';

/**
 * Layout for quiz routes.
 * Hides the default header so each quiz screen can use its own header.
 */
export default function QuizLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

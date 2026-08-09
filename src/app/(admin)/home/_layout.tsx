import { Stack } from 'expo-router';

export default function AdminHomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="knowledge-base" />
      <Stack.Screen name="appointments" />
      <Stack.Screen name="users" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="message-reports" />
      <Stack.Screen name="reviews" />
      <Stack.Screen name="logs" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="livestock-categories" />
      <Stack.Screen name="roles" />
    </Stack>
  );
}

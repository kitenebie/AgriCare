import { Stack } from 'expo-router';

export default function MessagesLayout() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}

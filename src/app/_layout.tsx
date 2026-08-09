import { Colors } from "@/constants/theme";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Alert, Platform, StatusBar, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import messaging from "@react-native-firebase/messaging";
import { playNewChatSound, playNotificationSound } from "@/services/soundService";

// ─── Background message handler (MUST be outside component, top-level) ───
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("[FCM] Background message:", remoteMessage.notification?.title);
});

export default function RootLayout() {

  useEffect(() => {
    // Foreground notification listener — play appropriate sound + show alert
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log("[FCM] Foreground message:", remoteMessage.notification?.title);
      const messageType = remoteMessage.data?.type as string || '';

      // Play appropriate sound based on notification type
      if (messageType === 'new_chat_message') {
        await playNewChatSound();
      } else {
        await playNotificationSound();
      }

      // Show in-app alert for foreground messages
      Alert.alert(
        remoteMessage.notification?.title || "AgriCare",
        remoteMessage.notification?.body || "",
      );
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        edges={["top"]}
        style={{ backgroundColor: Colors.primary, flex: 1 }}
      >
        <GestureHandlerRootView style={styles.container}>
          <StatusBar
            backgroundColor={Colors.primary}
            barStyle="light-content"
            translucent={false}
        />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(farmer)" />
          <Stack.Screen name="(technician)" />
          <Stack.Screen name="application-review" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        </Stack>
      </GestureHandlerRootView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

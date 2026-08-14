import { Colors } from "@/constants/theme";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform, StatusBar, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import messaging from "@react-native-firebase/messaging";
import VersionGuard from "@/components/VersionGuard";
import { ModalAlertProvider } from "@/components/ui/ModalAlert";
import { ToastNotificationProvider, showChatToast } from "@/components/ui/ToastNotification";
import { playNewChatSound, playNotificationSound } from "@/services/soundService";
import { modalAlert } from "@/components/ui/ModalAlert";
import { handleNotificationNavigation } from "@/services/notificationNavigator";

export default function RootLayout() {

  useEffect(() => {
    // ─── Foreground notification listener — play sound + show toast/modal ───
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log("[FCM] Foreground message:", remoteMessage.notification?.title);
      const messageType = remoteMessage.data?.type as string || '';

      // Play appropriate sound based on notification type
      if (messageType === 'new_chat_message') {
        await playNewChatSound();

        // Show top-toast for incoming chat messages
        const senderName = remoteMessage.data?.senderName as string
          || remoteMessage.notification?.title?.replace('💬 ', '') || 'Someone';
        const messageBody = remoteMessage.notification?.body || '';

        showChatToast({
          senderName,
          message: messageBody,
          onPress: () => {
            // Navigate to the chat when toast is tapped
            handleNotificationNavigation(remoteMessage.data as Record<string, string>);
          },
        });
      } else {
        await playNotificationSound();

        // Show modal alert for non-chat notifications
        modalAlert(
          remoteMessage.notification?.title || "AgriCare",
          remoteMessage.notification?.body || "",
        );
      }
    });

    // ─── Background/Quit: user taps notification in status bar ───
    // When app is in background and user taps notification
    const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log("[FCM] Notification opened app:", remoteMessage.data?.type);
      if (remoteMessage.data) {
        // Small delay to let the navigation tree mount
        setTimeout(() => {
          handleNotificationNavigation(remoteMessage.data as Record<string, string>);
        }, 500);
      }
    });

    // When app was killed and user taps notification to open it
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage?.data) {
        console.log("[FCM] Initial notification:", remoteMessage.data?.type);
        // Longer delay — app is cold-starting, navigation tree needs time
        setTimeout(() => {
          handleNotificationNavigation(remoteMessage.data as Record<string, string>);
        }, 1500);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeOpened();
    };
  }, []);

  return (
    <VersionGuard>
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
          <ModalAlertProvider>
            <ToastNotificationProvider>
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
            </ToastNotificationProvider>
          </ModalAlertProvider>
        </GestureHandlerRootView>
      </SafeAreaView>
    </SafeAreaProvider>
    </VersionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

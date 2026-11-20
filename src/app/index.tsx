import { Colors } from "@/constants/theme";
import { getRouteForRole, getSession, isBiometricsEnabled, authenticateWithBiometrics } from "@/services/sessionService";
import { requestAllPermissions } from "@/services/permissionService";
import { registerDeviceToken } from "@/services/notificationService";
import firestore from '@react-native-firebase/firestore';
import { Collections } from '@/services/firebase';
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function LoginScreen() {
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check for existing session — auto-redirect if logged in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        // Check account status from Firestore
        try {
          const userDoc = await firestore().collection(Collections.USERS).doc(session.uid).get();
          const profile = userDoc.data();
          const status = profile?.status;
          if (profile?.role === 'technician' && status === 'pending') {
            router.replace('/(auth)/pending-verification' as any);
            return;
          }
          if (profile?.role === 'technician' && status === 'rejected') {
            const reason = profile.rejectionReason || 'Your documents did not meet our verification requirements.';
            router.replace({ pathname: '/(auth)/rejected', params: { reason } } as any);
            return;
          }
          if (status === 'banned' || status === 'deactivated') {
            router.replace('/(auth)/login' as any);
            return;
          }
        } catch (e) {
          // If Firestore check fails, fall through to show buttons
        }

        // If biometrics is enabled, require authentication before auto-login
        const bioEnabled = await isBiometricsEnabled();
        if (bioEnabled) {
          const authenticated = await authenticateWithBiometrics('Verify to access AgriCare');
          if (!authenticated) {
            router.replace('/(auth)/login' as any);
            return;
          }
        }

        // Request all permissions (Calendar, Notifications) on app start
        await requestAllPermissions();
        // Register/refresh FCM token
        await registerDeviceToken(session.uid);
        const route = getRouteForRole(session.role);
        router.replace(route as any);
        return;
      }
      router.replace('/(auth)/login' as any);
    };
    checkSession();
  }, []);

  return (
    <View style={styles.container}>
      {checkingSession && <ActivityIndicator size="large" color={Colors.primary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.mintLight },
});

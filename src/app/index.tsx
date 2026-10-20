import { Button } from "@/components/ui";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { getRouteForRole, getSession, isBiometricsEnabled, authenticateWithBiometrics } from "@/services/sessionService";
import { requestAllPermissions } from "@/services/permissionService";
import { registerDeviceToken } from "@/services/notificationService";
import firestore from '@react-native-firebase/firestore';
import { Collections } from '@/services/firebase';
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Dimensions, Pressable, StyleSheet, View
} from "react-native";
import { AppText as Text } from '@/components/ui/FontScale';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [checkingSession, setCheckingSession] = useState(true);

  // Image fade in
  const imageOpacity = useSharedValue(0);
  const imageScale = useSharedValue(1.05);

  // Buttons fade in up
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(30);

  useEffect(() => {
    // Check for existing session — auto-redirect if logged in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        // Check account status from Firestore
        try {
          const userDoc = await firestore().collection(Collections.USERS).doc(session.uid).get();
          const status = userDoc.data()?.status;
          if (status === 'pending') {
            router.replace('/(auth)/pending-verification' as any);
            return;
          }
          if (status === 'rejected') {
            const reason = userDoc.data()?.rejectionReason || 'Your documents did not meet our verification requirements.';
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
            // Biometric failed — show login/register buttons instead
            setCheckingSession(false);
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
      setCheckingSession(false);
    };
    checkSession();

    // Image fades in first
    imageOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    imageScale.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });

    // Buttons fade in last
    buttonsOpacity.value = withDelay(700, withTiming(1, { duration: 600 }));
    buttonsTranslateY.value = withDelay(
      700,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ scale: imageScale.value }],
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Full-width background image with fade in */}
      <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
        <Image
          source={require("../../assets/app/login-background-image.png")}
          style={styles.backgroundImage}
          contentFit="cover"
        />
      </Animated.View>

      {/* Buttons */}
      <Animated.View
        style={[
          styles.bottomSection,
          buttonsAnimatedStyle,
          { paddingBottom: insets.bottom + 90 },
        ]}
      >
        {checkingSession ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              accessibilityRole="button"
              accessibilityLabel="Log In"
              style={styles.loginButton}
            >
              <Image source={require("../../assets/images/login/login.png")} style={styles.loginButtonImage} contentFit="contain" />
            </Pressable>
            <Button
              title="Create Account"
              onPress={() => router.push("/(auth)/register")}
              variant="secondary"
              size="lg"
              style={styles.createButton}
              textStyle={styles.createButtonText}
            />
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mintLight,
    width: "100%",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.55,
    alignSelf: "center",
    overflow: "hidden",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  bottomSection: {
    paddingHorizontal: Spacing.xxxl,
    paddingTop: Spacing.xxl,
    marginTop: "auto",
    paddingBottom: Spacing.xxxl,
  },
  loginButton: {
    width: "100%",
    aspectRatio: 516 / 91,
    marginBottom: Spacing.lg,
  },
  loginButtonImage: {
    width: "100%",
    height: "100%",
  },
  createButton: {
    width: "100%",
    marginBottom: Spacing.lg,
    height: 58,
    borderRadius: BorderRadius.full,
    borderColor: Colors.mint,
    borderWidth: 1.5,
    backgroundColor: Colors.white,
  },
  createButtonText: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { AppTextInput as TextInput, AppText as Text } from '@/components/ui/FontScale';
import { modalAlert } from '@/components/ui/ModalAlert';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { signIn, getUser, sendResetEmail } from '@/services/authService';
import { saveSession, getRouteForRole, hasBiometricsBeenAsked } from '@/services/sessionService';
import { requestAllPermissions } from '@/services/permissionService';
import { registerDeviceToken } from '@/services/notificationService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      modalAlert('Email Required', 'Enter your email address to reset your password.');
      return;
    }

    setResettingPassword(true);
    try {
      await sendResetEmail(normalizedEmail);
      modalAlert('Check Your Email', 'If an account exists for this email, you will receive a password reset link.');
    } catch (error: any) {
      const message = error.code === 'auth/invalid-email'
        ? 'Enter a valid email address.'
        : error.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Unable to send a reset link. Please try again.';
      modalAlert('Password Reset Failed', message);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      modalAlert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Login attempt:', { email: email.trim(), passLength: password.length });
      console.log('🔐 Calling signIn...');
      
      const user = await signIn(email.trim(), password);

      console.log('🔐 signIn success! UID:', user.uid);
      
      // Get user role from Firestore to route to correct module
      const profile = await getUser(user.uid);
      console.log('🔐 User profile:', JSON.stringify(profile));

      // ─── Check if user account is pending verification ───
      if (profile?.status === 'pending') {
        router.replace('/(auth)/pending-verification');
        setLoading(false);
        return;
      }

      // ─── Check if user account was rejected ───
      if (profile?.status === 'rejected') {
        const reason = profile?.rejectionReason || 'Your documents did not meet our verification requirements.';
        router.replace({ pathname: '/(auth)/rejected', params: { reason } });
        setLoading(false);
        return;
      }

      // ─── Check if user is banned or deactivated ───
      if (profile?.status === 'deactivated') {
        modalAlert(
          '🚫 Account Deactivated',
          'Your account has been permanently deactivated due to violation of community guidelines. Contact support for appeal.',
        );
        setLoading(false);
        return;
      }

      if (profile?.status === 'banned' && profile?.banUntil) {
        const banUntilDate = profile.banUntil.toDate ? profile.banUntil.toDate() : new Date(profile.banUntil);
        if (banUntilDate > new Date()) {
          const formattedDate = banUntilDate.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
          modalAlert(
            '⛔ Account Suspended',
            `Your account is suspended until ${formattedDate} due to violation of community guidelines.`,
          );
          setLoading(false);
          return;
        }
        // Ban expired — allow login (optionally reset status)
      }

      const role = profile?.role || 'farmer';
      console.log('🔐 Role detected:', role);

      // Request permissions (Calendar, Notifications) + register FCM token
      await requestAllPermissions();
      await registerDeviceToken(user.uid);

      // Check if biometrics setup has been shown
      const biometricsAsked = await hasBiometricsBeenAsked();
      if (!biometricsAsked) {
        // First time — redirect to biometric setup page
        router.replace('/(auth)/biometric-setup' as any);
      } else {
        // Already asked — go directly to home
        const route = getRouteForRole(role);
        router.replace(route as any);
      }
    } catch (error: any) {
      console.error('🔐 Login error:', error.code, error.message);
      let message = 'Login failed. Please try again.';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.';
      }
      modalAlert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Image
        source={require('../../../assets/images/login/background image.png')}
        style={styles.backgroundImage}
        contentFit="cover"
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={{ height: SCREEN_HEIGHT * 0.29 }} />

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to your account</Text>

          <View style={styles.inputContainer}>
            <Icon name="profile" size={22} color={Colors.primaryDark} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock" size={22} color={Colors.primaryDark} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPassword ? 'close-eye' : 'eye'} size={22} color={Colors.primaryDark} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword} disabled={resettingPassword}>
            {resettingPassword ? <ActivityIndicator size="small" color={Colors.primary} /> : (
              <Text style={styles.forgotText}>Forgot Password?</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Log In"
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Image
                source={require('../../../assets/images/login/login.png')}
                style={styles.loginButtonImage}
                contentFit="fill"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => router.push("/(auth)/register")}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.createAccountButtonText}>Create New Account</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  content: {
    flexGrow: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  formCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 30,
    backgroundColor: Colors.white,
    ...Shadow.medium,
  },
  formTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  inputContainer: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FCF9',
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#D8EEE0',
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  forgotText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    height: 58,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    marginBottom: Spacing.lg,
    elevation: 4,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonImage: {
    width: '100%',
    height: '100%',
  },
  loginButtonDisabled: {
    opacity: 0.65,
  },
  createAccountButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 18,
    backgroundColor: Colors.white,
    marginBottom: Spacing.lg,
  },
  createAccountButtonText: {
    color: Colors.primaryDark,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});

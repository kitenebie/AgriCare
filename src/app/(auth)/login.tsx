import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { signIn, getUser } from '@/services/authService';
import { saveSession, getRouteForRole, hasBiometricsBeenAsked } from '@/services/sessionService';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
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
        Alert.alert(
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
          Alert.alert(
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
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/images/agri-care-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.appName}>AgriCare</Text>
          <Text style={styles.tagline}>Livestock Support & Service Management</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to your account</Text>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Icon name="profile" size={20} color={Colors.textSecondary} />
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

          {/* Password */}
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon name={showPassword ? 'close' : 'search'} size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotButton}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logo: {
    width: 100,
    height: 100,
  },
  appName: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: Spacing.md,
  },
  tagline: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {
    marginBottom: Spacing.xxl,
  },
  formTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.primaryLight,
  },
  loginButtonText: {
    fontSize: FontSize.md,
    color: Colors.white,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
});

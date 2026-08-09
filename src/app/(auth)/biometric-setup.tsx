import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon } from '@/components/ui';
import {
  setBiometricsEnabled,
  markBiometricsAsked,
  getSession,
  getRouteForRole,
} from '@/services/sessionService';

export default function BiometricSetupScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const handleEnableBiometrics = async () => {
    setLoading(true);
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert('Not Supported', 'This device does not support biometric authentication.');
        setLoading(false);
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Not Set Up', 'No biometrics enrolled on this device. Please set up fingerprint or face in your device settings.');
        setLoading(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify to enable biometrics',
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        await setBiometricsEnabled(true);
        await markBiometricsAsked(true);
        await navigateToHome();
      } else {
        Alert.alert('Failed', 'Biometric authentication failed. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await setBiometricsEnabled(false);
    await markBiometricsAsked(true);
    await navigateToHome();
  };

  const navigateToHome = async () => {
    const session = await getSession();
    if (session) {
      const route = getRouteForRole(session.role);
      router.replace(route as any);
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
      {/* Icon */}
      <View style={s.iconContainer}>
        <Image
          source={require('../../../assets/app/biometric-icon.png')}
          style={s.biometricIcon}
        />
      </View>

      {/* Title */}
      <Text style={s.title}>Secure Your Account</Text>

      {/* Description */}
      <Text style={s.description}>
        Enable biometric authentication to quickly and securely access your AgriCare account using fingerprint or face recognition.
      </Text>

      {/* Benefits Card */}
      <View style={s.benefitsCard}>
        <View style={s.benefitRow}>
          <View style={s.benefitIcon}>
            <Icon name="check" size={14} color={Colors.white} />
          </View>
          <Text style={s.benefitText}>Faster login — no need to type your password</Text>
        </View>
        <View style={s.benefitRow}>
          <View style={s.benefitIcon}>
            <Icon name="check" size={14} color={Colors.white} />
          </View>
          <Text style={s.benefitText}>More secure — only your biometrics can unlock</Text>
        </View>
        <View style={s.benefitRow}>
          <View style={s.benefitIcon}>
            <Icon name="check" size={14} color={Colors.white} />
          </View>
          <Text style={s.benefitText}>You can change this later in Settings</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={s.buttonsContainer}>
        <TouchableOpacity
          style={s.enableBtn}
          onPress={handleEnableBiometrics}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Icon name="lock" size={18} color={Colors.white} />
              <Text style={s.enableBtnText}>Enable Biometrics</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={handleSkip} activeOpacity={0.8}>
          <Text style={s.skipBtnText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  biometricIcon: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  benefitsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
  },
  buttonsContainer: {
    gap: 12,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
  },
  enableBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
  skipBtn: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});

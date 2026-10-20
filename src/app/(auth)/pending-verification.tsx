import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { clearSession } from '@/services/sessionService';

export default function PendingVerificationScreen() {
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await clearSession();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[s.container, { paddingTop: 20, paddingBottom: insets.bottom + 20 }]}>
      {/* Illustration */}
      <View style={s.iconContainer}>
        <View style={s.iconCircle}>
          <Icon name="clock" size={56} color={Colors.primary} />
        </View>
      </View>

      {/* Title */}
      <Text style={s.title}>Account Pending Verification</Text>

      {/* Description */}
      <Text style={s.description}>
        Your registration has been submitted successfully! An AgriCare administrator will review and verify your account.
      </Text>

      {/* Steps */}
      <View style={s.stepsContainer}>
        <View style={s.step}>
          <View style={[s.stepDot, s.stepDone]}>
            <Icon name="check" size={14} color={Colors.white} />
          </View>
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Registration Submitted</Text>
            <Text style={s.stepSubtitle}>Profile photo and ID uploaded</Text>
          </View>
        </View>

        <View style={s.stepLine} />

        <View style={s.step}>
          <View style={[s.stepDot, s.stepActive]}>
            <Icon name="clock" size={14} color={Colors.white} />
          </View>
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Admin Review</Text>
            <Text style={s.stepSubtitle}>Verifying your identity and documents</Text>
          </View>
        </View>

        <View style={s.stepLine} />

        <View style={s.step}>
          <View style={s.stepDot}>
            <Icon name="check-circle" size={14} color={Colors.textLight} />
          </View>
          <View style={s.stepContent}>
            <Text style={[s.stepTitle, { color: Colors.textLight }]}>Account Approved</Text>
            <Text style={s.stepSubtitle}>You'll receive a notification</Text>
          </View>
        </View>
      </View>

      {/* Info Box */}
      <View style={s.infoBox}>
        <Icon name="bell" size={18} color="#D97706" />
        <Text style={s.infoText}>
          You will receive a push notification once your account has been verified. This usually takes 1–24 hours.
        </Text>
      </View>

      {/* Back to Login */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={s.logoutText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, justifyContent: 'center' },
  iconContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  iconCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.primary,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: Spacing.md },
  description: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  stepsContainer: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xl },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDone: { backgroundColor: '#4CAF50' },
  stepActive: { backgroundColor: '#F59E0B' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  stepSubtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  stepLine: { width: 2, height: 20, backgroundColor: Colors.border, marginLeft: 15, marginVertical: 4 },
  infoBox: {
    flexDirection: 'row', gap: Spacing.sm, backgroundColor: '#FEF3C7',
    borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.xl,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: FontSize.sm, color: '#6D4C00', lineHeight: 18 },
  logoutBtn: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  logoutText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
});

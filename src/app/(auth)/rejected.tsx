import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import { Collections } from '@/services/firebase';
import { getSession } from '@/services/sessionService';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { clearSession } from '@/services/sessionService';

export default function RejectedScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ reason?: string }>();
  const reason = params.reason || 'Your documents did not meet our verification requirements.';

  const handleLogout = async () => {
    await clearSession();
    router.replace('/(auth)/login');
  };

  const handleReRegister = async () => {
    try {
      const session = await getSession();
      let userData: any = {};
      if (session?.uid) {
        const doc = await firestore().collection(Collections.USERS).doc(session.uid).get();
        const data = doc.data();
        if (data) {
          userData = {
            displayName: data.displayName || '',
            email: data.email || '',
            phoneNumber: data.phoneNumber || '',
            location: data.location || '',
            role: data.role || 'farmer',
            fromRejected: 'true',
          };
        }
      }
      await clearSession();
      router.replace({ pathname: '/(auth)/register', params: userData } as any);
    } catch (e) {
      await clearSession();
      router.replace('/(auth)/register');
    }
  };

  // Parse reason lines for display
  const reasonLines = reason.split('\n').filter(Boolean);

  return (
    <View style={[s.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View style={s.iconContainer}>
          <View style={s.iconCircle}>
            <Icon name="close" size={56} color="#EF4444" />
          </View>
        </View>

        {/* Title */}
        <Text style={s.title}>Registration Not Approved</Text>

        {/* Description */}
        <Text style={s.description}>
          Unfortunately, your AgriCare account registration was not approved by our administrator.
        </Text>

        {/* Reason Card */}
        <View style={s.reasonCard}>
          <View style={s.reasonHeader}>
            <Icon name="info" size={18} color="#DC2626" />
            <Text style={s.reasonHeaderText}>Reason for Rejection</Text>
          </View>
          <View style={s.reasonBody}>
            {reasonLines.map((line, idx) => (
              <View key={idx} style={s.reasonItem}>
                <View style={s.bulletDot} />
                <Text style={s.reasonText}>{line.replace(/^[•\-]\s*/, '')}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* What to do next */}
        <View style={s.nextStepsCard}>
          <Text style={s.nextStepsTitle}>What can you do?</Text>

          <View style={s.stepItem}>
            <View style={s.stepNumber}>
              <Text style={s.stepNumberText}>1</Text>
            </View>
            <View style={s.stepContent}>
              <Text style={s.stepItemTitle}>Review the reason above</Text>
              <Text style={s.stepItemDesc}>Understand what went wrong with your submission.</Text>
            </View>
          </View>

          <View style={s.stepItem}>
            <View style={s.stepNumber}>
              <Text style={s.stepNumberText}>2</Text>
            </View>
            <View style={s.stepContent}>
              <Text style={s.stepItemTitle}>Prepare valid documents</Text>
              <Text style={s.stepItemDesc}>Make sure your ID is clear, valid, and matches your name.</Text>
            </View>
          </View>

          <View style={s.stepItem}>
            <View style={s.stepNumber}>
              <Text style={s.stepNumberText}>3</Text>
            </View>
            <View style={s.stepContent}>
              <Text style={s.stepItemTitle}>Re-register your account</Text>
              <Text style={s.stepItemDesc}>Create a new account with the correct information.</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={s.reRegisterBtn} onPress={handleReRegister} activeOpacity={0.8}>
          <Icon name="refresh" size={18} color={Colors.white} />
          <Text style={s.reRegisterText}>Re-Register Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.backBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={s.backBtnText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#EF4444',
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
  // Reason Card
  reasonCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  reasonHeaderText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#DC2626',
  },
  reasonBody: {
    padding: Spacing.lg,
    gap: 10,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginTop: 7,
  },
  reasonText: {
    fontSize: FontSize.sm,
    color: '#7F1D1D',
    flex: 1,
    lineHeight: 20,
  },
  // Next Steps
  nextStepsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nextStepsTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  stepContent: {
    flex: 1,
  },
  stepItemTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  stepItemDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  // Buttons
  reRegisterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  reRegisterText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
  backBtn: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});

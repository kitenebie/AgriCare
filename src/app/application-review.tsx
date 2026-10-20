import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { clearSession } from '@/services/sessionService';
import auth from '@react-native-firebase/auth';
import { useEffect } from 'react';

export default function ApplicationReviewScreen() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, true);
    opacity.value = withDelay(100, withTiming(1, { duration: 800 }));
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const handleLogout = async () => {
    try {
      await clearSession();
      await auth().signOut();
    } catch (e) {}
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      {/* Background Decoration */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View style={[styles.content, fadeStyle]}>
        {/* Animated Icon */}
        <Animated.View style={[styles.iconWrapper, pulseStyle]}>
          <View style={styles.iconCircle}>
            <Icon name="clock" size={48} color={Colors.primary} />
          </View>
        </Animated.View>

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Under Review</Text>
        </View>

        {/* Main Message */}
        <Text style={styles.title}>Application Submitted</Text>
        <Text style={styles.subtitle}>
          Your account is currently being reviewed by our admin team. This process usually takes 24-48 hours.
        </Text>

        {/* Info Cards */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: '#E8F5E9' }]}>
              <Icon name="check" size={16} color="#4CAF50" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Registration Complete</Text>
              <Text style={styles.infoDesc}>Your details have been submitted</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: '#FFF3E0' }]}>
              <Icon name="clock" size={16} color="#FF9800" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Admin Verification</Text>
              <Text style={styles.infoDesc}>Waiting for admin approval</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: '#F3E5F5' }]}>
              <Icon name="bell" size={16} color="#9C27B0" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Get Notified</Text>
              <Text style={styles.infoDesc}>You'll be notified once approved</Text>
            </View>
          </View>
        </View>

        {/* Help Text */}
        <Text style={styles.helpText}>
          If you have any questions, please contact our support team or visit the AgriCare office.
        </Text>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="logout" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  bgCircle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.primary + '10',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary + '08',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary + '30',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9800',
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#E65100',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  infoCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  infoDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  infoDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: Spacing.sm, marginLeft: 52 },
  helpText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.error + '30',
    backgroundColor: Colors.error + '08',
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.error,
  },
});

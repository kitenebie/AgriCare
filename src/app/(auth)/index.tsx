import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon } from '@/components/ui';

/**
 * Auth Index — Routes to Login or Register
 * Also provides dev role-switcher for quick testing.
 */
export default function AuthIndexScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.main}>
        <Text style={styles.title}>Welcome to AgriCare</Text>
        <Text style={styles.subtitle}>Choose how to proceed</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>

      {/* Dev Quick Access */}
      <View style={styles.devSection}>
        <Text style={styles.devTitle}>Dev Quick Access</Text>
        <View style={styles.devButtons}>
          <TouchableOpacity
            style={[styles.devButton, { borderColor: '#2196F3' }]}
            onPress={() => router.replace('/(admin)/home')}
          >
            <Icon name="services" size={18} color="#2196F3" />
            <Text style={[styles.devButtonText, { color: '#2196F3' }]}>Admin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.devButton, { borderColor: Colors.primary }]}
            onPress={() => router.replace('/(farmer)/home')}
          >
            <Icon name="paw" size={18} color={Colors.primary} />
            <Text style={[styles.devButtonText, { color: Colors.primary }]}>Farmer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.devButton, { borderColor: '#FF9800' }]}
            onPress={() => router.replace('/(technician)/dashboard')}
          >
            <Icon name="health-check" size={18} color="#FF9800" />
            <Text style={[styles.devButtonText, { color: '#FF9800' }]}>Tech</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xxl,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg + 2,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg + 2,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  devSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.lg,
  },
  devTitle: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  devButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  devButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  devButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});

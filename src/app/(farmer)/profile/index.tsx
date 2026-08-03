import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, IconName } from '@/components/ui';
import { useFadeInUp, useScaleIn, useFadeIn } from '@/hooks/useAnimatedEntry';
import { seedAll } from '@/services/seedDatabase';

export default function ProfileScreen() {
  const [seeding, setSeeding] = useState(false);
  const avatarAnim = useScaleIn(200);
  const infoAnim = useFadeInUp(300);
  const menuAnim = useFadeInUp(500);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.avatarContainer, avatarAnim]}>
          <Image
            source={require('../../../../assets/app/man.png')}
            style={styles.avatar}
            contentFit="cover"
          />
          <TouchableOpacity style={styles.editBadge}>
            <Icon name="edit" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.profileInfo, infoAnim]}>
          <Text style={styles.name}>Juan Dela Cruz</Text>
          <Text style={styles.role}>Farmer</Text>
          <View style={styles.locationRow}>
            <Icon name="location" size={14} color={Colors.white} />
            <Text style={styles.location}>San Miguel, Bulacan</Text>
          </View>
        </Animated.View>
      </View>

      {/* Stats */}
      <Animated.View style={[styles.statsContainer, infoAnim]}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Animals</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>8</Text>
          <Text style={styles.statLabel}>Appointments</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Technicians</Text>
        </View>
      </Animated.View>

      {/* Menu Items */}
      <Animated.View style={[styles.menuContainer, menuAnim]}>
        <MenuItem iconName="paw" label="My Animals" subtitle="Manage your livestock" />
        <MenuItem iconName="clipboard" label="Health Records" subtitle="View animal health history" />
        <MenuItem iconName="calendar" label="Appointment History" subtitle="Past and upcoming visits" />
        <MenuItem iconName="star" label="Favorite Technicians" subtitle="Quick access to your experts" />
        <MenuItem iconName="bell" label="Notification Settings" subtitle="Manage alerts" />
        <MenuItem iconName="lock" label="Privacy & Security" subtitle="Account settings" />
        <MenuItem iconName="help" label="Help & Support" subtitle="FAQs and contact us" />
        <MenuItem iconName="logout" label="Log Out" subtitle="" isDestructive />
      </Animated.View>

      {/* Dev: Seed Database Button */}
      <TouchableOpacity
        style={[styles.seedButton, seeding && styles.seedButtonDisabled]}
        disabled={seeding}
        onPress={async () => {
          setSeeding(true);
          try {
            await seedAll();
            Alert.alert('Success', 'Mock data seeded to Firebase!');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Seeding failed');
          } finally {
            setSeeding(false);
          }
        }}
      >
        <Text style={styles.seedButtonText}>
          {seeding ? 'Seeding...' : '🌱 Seed Database (Dev)'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

interface MenuItemProps {
  iconName: IconName;
  label: string;
  subtitle: string;
  isDestructive?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ iconName, label, subtitle, isDestructive }) => (
  <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
    <View style={styles.menuIcon}>
      <Icon name={iconName} size={18} color={isDestructive ? Colors.error : Colors.primary} />
    </View>
    <View style={styles.menuContent}>
      <Text style={[styles.menuLabel, isDestructive && styles.destructiveText]}>{label}</Text>
      {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
    </View>
    <Icon name="chevron-right" size={18} color={Colors.textLight} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.xxxl,
    paddingTop: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl * 2,
    borderBottomRightRadius: BorderRadius.xl * 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.light,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
  },
  role: {
    fontSize: FontSize.lg,
    color: Colors.accent,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  location: {
    fontSize: FontSize.md,
    color: Colors.white,
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.medium,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  menuContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.light,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  menuLabel: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  menuSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  destructiveText: {
    color: Colors.error,
  },
  seedButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    backgroundColor: '#FF9800',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  seedButtonDisabled: {
    opacity: 0.5,
  },
  seedButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});

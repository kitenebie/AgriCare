import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Card, Icon, IconName } from '@/components/ui';
import { farmOverview } from '@/data/mockData';
import { useFadeInUp, useScaleIn, useFadeIn } from '@/hooks/useAnimatedEntry';

export default function HomeScreen() {
  const headerAnim = useFadeIn(100);
  const overviewAnim = useFadeInUp(200);
  const quickAccessAnim = useFadeInUp(400);
  const helpBannerAnim = useFadeInUp(600);

  return (
    <ScrollView
      style={[styles.container]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View style={[styles.header, headerAnim]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>Juan Dela Cruz</Text>
          <Text style={styles.role}>Farmer</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notifButton}>
            <Icon name="bell" size={24} color={Colors.white} />
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <Image
            source={require('../../../../assets/app/man.png')}
            style={styles.avatar}
            contentFit="cover"
          />
        </View>
      </Animated.View>

      {/* Farm Overview */}
      <Animated.View style={overviewAnim}>
        <Card style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>Farm Overview</Text>
          <View style={styles.overviewGrid}>
            <OverviewItem
              value={farmOverview.totalAnimals}
              label="Total Animals"
              iconName="cow"
            />
            <OverviewItem
              value={farmOverview.pendingServices}
              label="Pending Services"
              iconName="clipboard"
            />
            <OverviewItem
              value={farmOverview.upcomingVisits}
              label="Upcoming Visits"
              iconName="calendar"
            />
            <OverviewItem
              value={farmOverview.healthAlerts}
              label="Health Alerts"
              iconName="alert"
              isAlert
            />
          </View>
        </Card>
      </Animated.View>

      {/* Quick Access */}
      <Animated.View style={[styles.quickAccessSection, quickAccessAnim]}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          <QuickAccessItem iconName="paw" label="My Animals" onPress={() => {}} />
          <QuickAccessItem iconName="pencil" label={"Request\nService"} onPress={() => router.push('/(tabs)/services')} />
          <QuickAccessItem iconName="calendar" label="Appointments" onPress={() => router.push('/(tabs)/services')} />
          <QuickAccessItem iconName="clipboard" label={"Health\nRecords"} onPress={() => {}} />
        </View>
      </Animated.View>

      {/* Need Help Banner */}
      <Animated.View style={helpBannerAnim}>
        <View style={styles.helpBannerWrapper}>
          <TouchableOpacity
            style={styles.helpBanner}
            onPress={() => router.push('/(tabs)/map')}
            activeOpacity={0.85}
          >
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Need Immediate Help?</Text>
              <Text style={styles.helpSubtitle}>Find nearby technicians{'\n'}in your area.</Text>
              <View style={styles.findButton}>
                <Text style={styles.findButtonText}>Find Technician</Text>
              </View>
            </View>
            {/* Location pin decoration */}
            <View style={styles.pinContainer}>
              <Icon name="location" size={28} color="#7CFC00" />
            </View>
          </TouchableOpacity>
          {/* Man image overflowing card */}
          <Image
            source={require('../../../../assets/app/man.png')}
            style={styles.helpImage}
            contentFit="contain"
          />
        </View>
      </Animated.View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

interface OverviewItemProps {
  value: number;
  label: string;
  iconName: IconName;
  isAlert?: boolean;
}

const OverviewItem: React.FC<OverviewItemProps> = ({ value, label, iconName, isAlert }) => (
  <View style={styles.overviewItem}>
    <View style={styles.overviewItemHeader}>
      <Text style={[styles.overviewValue, isAlert && styles.alertValue]}>{value}</Text>
      <Icon name={iconName} size={24} color={isAlert ? Colors.error : Colors.primary} />
    </View>
    <Text style={styles.overviewLabel}>{label}</Text>
  </View>
);

interface QuickAccessItemProps {
  iconName: IconName;
  label: string;
  onPress: () => void;
}

const QuickAccessItem: React.FC<QuickAccessItemProps> = ({ iconName, label, onPress }) => (
  <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.quickIcon}>
      <Icon name={iconName} size={26} color={Colors.primary} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.primary,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  headerLeft: {},
  greeting: {
    fontSize: FontSize.lg,
    color: Colors.white,
    opacity: 0.9,
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
  },
  role: {
    fontSize: FontSize.md,
    color: Colors.accent,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  notifButton: {
    position: 'relative',
    padding: 4,
  },
  notifBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  overviewCard: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  overviewItem: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  overviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  alertValue: {
    color: Colors.error,
  },
  overviewLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  quickAccessSection: {
    marginTop: Spacing.xxl,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickItem: {
    alignItems: 'center',
    width: '23%',
  },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.light,
  },
  quickLabel: {
    fontSize: FontSize.xs,
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 14,
  },
  helpBanner: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingRight: 100,
    overflow: 'hidden',
  },
  helpContent: {
    zIndex: 2,
  },
  helpTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  helpSubtitle: {
    fontSize: FontSize.md,
    color: Colors.accent,
    marginTop: 4,
    lineHeight: 20,
  },
  findButton: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.white,
    backgroundColor: 'transparent',
  },
  findButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  helpBannerWrapper: {
    position: 'relative',
    marginTop: Spacing.xxl,
  },
  pinContainer: {
    position: 'absolute',
    right: 80,
    bottom: '40%',
    zIndex: 1,
  },
  helpImage: {
    position: 'absolute',
    right: 10,
    top: -40,
    width: 120,
    height: 180,
    zIndex: 3,
  },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Avatar, Card, Icon, IconName, ModernQuickAccessIcon } from '@/components/ui';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import firestore from '@react-native-firebase/firestore';
import { Collections } from '@/services/firebase';

interface FarmData {
  totalAnimals: number;
  pendingServices: number;
  upcomingVisits: number;
  healthAlerts: number;
}

export default function HomeScreen() {
  const headerAnim = useFadeIn(100);
  const overviewAnim = useFadeInUp(200);
  const quickAccessAnim = useFadeInUp(400);
  const helpBannerAnim = useFadeInUp(600);

  const [userName, setUserName] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [farmData, setFarmData] = useState<FarmData>({ totalAnimals: 0, pendingServices: 0, upcomingVisits: 0, healthAlerts: 0 });
  const [notifCount, setNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [badgeCounts, setBadgeCounts] = useState({
    myAnimals: 0,
    requestService: 0,
    appointments: 0,
    healthRecords: 0,
    technicians: 0,
    announcements: 0,
    knowledgeBase: 0,
    forum: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const session = await getSession();
        if (!session) { setLoading(false); return; }
        setUserName(session.displayName || 'Farmer');

        const uid = session.uid;

        // Get user photoURL
        const userDoc = await firestore().collection(Collections.USERS).doc(uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          if (data?.photoURL) setPhotoURL(data.photoURL);
        }

        // Count animals owned by this farmer
        const animalsSnap = await firestore().collection('animals').where('ownerId', '==', uid).get();
        const totalAnimals = animalsSnap.size;

        // Single-field query + client-side filter to avoid composite index
        const apptSnap = await firestore().collection(Collections.APPOINTMENTS)
          .where('farmerId', '==', uid)
          .get();
        const myAppts = apptSnap.docs.map(d => d.data());
        const pendingServices = myAppts.filter(a => a.status === 'pending').length;
        const upcomingVisits = myAppts.filter(a => a.status === 'confirmed').length;

        // Single-field query + client-side filter for emergency requests
        const alertsSnap = await firestore().collection(Collections.EMERGENCY_REQUESTS)
          .where('farmerId', '==', uid)
          .get();
        const healthAlerts = alertsSnap.docs.filter(d => d.data().status === 'active').length;

        setFarmData({ totalAnimals, pendingServices, upcomingVisits, healthAlerts });

        // Notification count
        const notifSnap = await firestore().collection(Collections.NOTIFICATIONS)
          .where('userId', '==', uid)
          .where('read', '==', false)
          .get();
        setNotifCount(notifSnap.size);

        // Badge counts for Quick Access
        const techSnap = await firestore().collection(Collections.USERS).where('role', '==', 'technician').where('status', '==', 'active').get();
        const announcementsSnap = await firestore().collection(Collections.ANNOUNCEMENTS).get();
        const kbSnap = await firestore().collection(Collections.KNOWLEDGE_BASE).get();
        const forumSnap = await firestore().collection(Collections.COMMUNITY_FORUM).get();

        setBadgeCounts({
          myAnimals: totalAnimals,
          requestService: 0,
          appointments: myAppts.length,
          healthRecords: myAppts.filter(a => a.status === 'completed').length,
          technicians: techSnap.size,
          announcements: announcementsSnap.size,
          knowledgeBase: kbSnap.size,
          forum: forumSnap.size,
        });
      } catch (e) {
        console.warn('Farmer home load error:', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View style={[styles.header, headerAnim]}>
        <Image
          source={require('../../../../assets/images/technician/Home/header_banner.png')}
          style={styles.headerBanner}
          contentFit="cover"
          pointerEvents="none"
        />
        <View style={styles.headerTop}>
          <Text style={styles.greeting}></Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifButton} onPress={() => router.push('/(farmer)/messages?tab=notifications')}>
              <Icon name="bell" size={22} color={Colors.primary} />
              {notifCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.avatarRing}><Avatar name={userName} imageUrl={photoURL || undefined} size={42} /></View>
          </View>
        </View>
        <View style={styles.headerIdentity}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name} numberOfLines={2}>{userName}</Text>
          <View style={styles.roleBadge}>
            <Icon name="farmer" size={16} color={Colors.primary} />
            <Text style={styles.role}>Farmer</Text>
          </View>
        </View>
      </Animated.View>

      {/* Farm Overview */}
      <Animated.View style={overviewAnim}>
        <Card style={styles.overviewCard}>
          <Image
            source={require('../../../../assets/images/farmer/dashboard_header_banner.png')}
            style={styles.overviewBanner}
            contentFit="contain"
            accessibilityLabel="Farm Overview"
          />
          <View style={styles.overviewGrid}>
            <OverviewItem value={farmData.totalAnimals} label="Total Animals" iconName="cow" imageSource={require('../../../../assets/images/farmer/cow.png')} color="#FFB800" background="#FFF8E7" onPress={() => router.push('/(farmer)/home/my-animals')} />
            <OverviewItem value={farmData.pendingServices} label="Pending Services" iconName="clipboard" imageSource={require('../../../../assets/images/farmer/pending.png')} color="#16B86A" background="#E9F9F0" onPress={() => router.push('/(farmer)/services')} />
            <OverviewItem value={farmData.upcomingVisits} label="Upcoming Visits" iconName="calendar" imageSource={require('../../../../assets/images/farmer/upcoming.png')} color="#258BF0" background="#EAF6FF" onPress={() => router.push('/(farmer)/home/appointments')} />
            <OverviewItem value={farmData.healthAlerts} label="Health Alerts" iconName="alert" imageSource={require('../../../../assets/images/farmer/alert.png')} color="#F04444" background="#FFF0F1" onPress={() => router.push('/(farmer)/home/health-records')} />
          </View>
        </Card>
      </Animated.View>

      {/* Quick Access */}
      <Animated.View style={[styles.quickAccessSection, quickAccessAnim]}>
        <Card style={styles.quickAccessCard}>
        <View style={styles.cardHeading}>
          <Icon name="services" size={26} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Quick Access</Text>
        </View>
        <View style={styles.quickGrid}>
          <QuickAccessItem iconName="paw" label="My Animals" onPress={() => router.push('/(farmer)/home/my-animals')} badge={badgeCounts.myAnimals} />
          <QuickAccessItem iconName="pencil" label={"Request\nService"} onPress={() => router.push('/(farmer)/services')} />
          <QuickAccessItem iconName="calendar" label="Appointments" onPress={() => router.push('/(farmer)/home/appointments')} badge={badgeCounts.appointments} />
          <QuickAccessItem iconName="clipboard" label={"Health\nRecords"} onPress={() => router.push('/(farmer)/home/health-records')} badge={badgeCounts.healthRecords} />
          <QuickAccessItem iconName="farmer" label="Technicians" onPress={() => router.push('/(farmer)/home/technicians')} badge={badgeCounts.technicians} />
          <QuickAccessItem iconName="technician" label={"Available\nTechnicians"} onPress={() => router.push('/(farmer)/home/available-technicians')} />
          <QuickAccessItem iconName="megaphone" label={"Announcements\n& Bulletins"} onPress={() => router.push('/(farmer)/home/announcements')} badge={badgeCounts.announcements} />
          <QuickAccessItem iconName="clipboard" label={"Knowledge\nBase"} onPress={() => router.push('/(farmer)/home/knowledge-base')} badge={badgeCounts.knowledgeBase} />
          <QuickAccessItem iconName="messages" label={"Community\nForum"} onPress={() => router.push('/(farmer)/home/forum')} badge={badgeCounts.forum} />
        </View>
        </Card>
      </Animated.View>

      {/* Need Help Banner */}
      <Animated.View style={helpBannerAnim}>
        <View style={styles.helpBannerWrapper}>
          <TouchableOpacity style={styles.helpBanner} onPress={() => router.push('/(farmer)/map')} activeOpacity={0.85}>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Need Immediate Help?</Text>
              <Text style={styles.helpSubtitle}>Find nearby technicians{'\n'}in your area.</Text>
              <View style={styles.findButton}>
                <Text style={styles.findButtonText}>Find Technician</Text>
              </View>
            </View>
            <View style={styles.pinContainer}>
              <Icon name="location" size={28} color="#7CFC00" />
            </View>
          </TouchableOpacity>
          <Image source={require('../../../../assets/app/man.png')} style={styles.helpImage} contentFit="contain" />
        </View>
      </Animated.View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

interface OverviewItemProps { value: number; label: string; iconName: IconName; imageSource: React.ComponentProps<typeof Image>['source']; color: string; background: string; onPress: () => void; }
const formatDashboardValue = (value: number) => {
  if (value < 1_000) return String(value);
  const suffix = value >= 1_000_000 ? 'M' : 'K';
  const divisor = suffix === 'M' ? 1_000_000 : 1_000;
  const compact = Number((value / divisor).toFixed(2));
  return suffix === 'K' && compact >= 1_000 ? '1M' : `${compact}${suffix}`;
};

const OverviewItem: React.FC<OverviewItemProps> = ({ value, label, iconName, imageSource, color, background, onPress }) => (
  <TouchableOpacity style={[styles.overviewItem, { backgroundColor: background }]} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.overviewIcon, { backgroundColor: color }]}><Icon name={iconName} size={25} color={Colors.white} /></View>
    <Text style={styles.overviewValue}>{formatDashboardValue(value)}</Text>
    <Text style={styles.overviewLabel} numberOfLines={2}>{label}</Text>
    <View style={styles.overviewDetails}>
      <Text style={styles.overviewDetailsText}>View Details</Text>
      <View style={styles.overviewArrow}><Icon name="chevron-right" size={18} color={Colors.primaryDark} /></View>
    </View>
    <Image source={imageSource} style={styles.overviewImage} contentFit="contain" pointerEvents="none" />
  </TouchableOpacity>
);

interface QuickAccessItemProps { iconName: IconName; label: string; onPress: () => void; badge?: number; }
const QuickAccessItem: React.FC<QuickAccessItemProps> = ({ iconName, label, onPress, badge }) => (
  <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.quickIcon}>
      <ModernQuickAccessIcon name={iconName} />
      {badge !== undefined && badge > 0 && (
        <View style={styles.quickBadge}>
          <Text style={styles.quickBadgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg },
  header: { position: 'relative', overflow: 'hidden', backgroundColor: '#B4E6B8', marginHorizontal: -Spacing.lg, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl },
  headerBanner: { position: 'absolute', top: 0, left: 0, height: '100%', width: '100%' },
  headerTop: { paddingHorizontal: Spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIdentity: { marginTop: Spacing.sm, paddingHorizontal: Spacing.lg },
  greeting: { fontSize: FontSize.lg, color: Colors.primaryDark, opacity: 0.9 },
  name: { width: '56%', fontSize: FontSize.xxl, lineHeight: FontSize.xxl, fontWeight: '800', color: Colors.primary },
  role: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  roleBadge: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.white, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 5, marginTop: -Spacing.sm, marginBottom: Spacing.md, ...Shadow.light },
  avatarRing: { width: 48, height: 48, borderRadius: BorderRadius.full, borderWidth: 2, borderColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  notifButton: { position: 'relative', width: 42, height: 42, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  notifBadge: { position: 'absolute', top: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center' },
  notifBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  overviewCard: { marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.xl },
  overviewBanner: { width: '100%', aspectRatio: 6.5, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  headingMark: { width: 28, height: 28, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  headingSquare: { width: 11, height: 11, backgroundColor: Colors.primary, borderRadius: 3 },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.md },
  overviewItem: { width: '48%', height: 130, borderRadius: BorderRadius.xl, padding: Spacing.sm, overflow: 'hidden' },
  overviewIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  overviewValue: { fontSize: 30, lineHeight: 34, fontWeight: '800', color: Colors.text, marginTop: 2 },
  overviewLabel: { width: '72%', fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  overviewDetails: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 'auto', zIndex: 1 },
  overviewDetailsText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  overviewArrow: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D9F2E1' },
  overviewImage: { position: 'absolute', width: '56%', height: '50%', right: 0, bottom: 6 },
  quickAccessSection: { marginTop: Spacing.md },
  quickAccessCard: { borderRadius: BorderRadius.xl, padding: Spacing.md, backgroundColor: Colors.white },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.md },
  quickItem: { alignItems: 'center', width: '23%' },
  quickIcon: { width: 56, height: 56, position: 'relative' },
  quickLabel: { fontSize: FontSize.xs, color: Colors.text, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 14 },
  quickBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  quickBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  helpBanner: { backgroundColor: Colors.mint, borderRadius: BorderRadius.xl, padding: Spacing.lg, paddingRight: 100, overflow: 'hidden' },
  helpContent: { zIndex: 2 },
  helpTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.primaryDark },
  helpSubtitle: { fontSize: FontSize.md, color: Colors.primary, marginTop: 4, lineHeight: 20 },
  findButton: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, alignSelf: 'flex-start', marginTop: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: 'transparent' },
  findButtonText: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.sm },
  helpBannerWrapper: { position: 'relative', marginTop: Spacing.xxl },
  pinContainer: { position: 'absolute', right: 80, bottom: '40%', zIndex: 1 },
  helpImage: { position: 'absolute', right: 10, top: -40, width: 145, height: 180, zIndex: 3 },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Card, Icon, IconName } from '@/components/ui';
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

        // Count pending appointments
        const pendingSnap = await firestore().collection(Collections.APPOINTMENTS)
          .where('farmerId', '==', uid)
          .where('status', '==', 'pending')
          .get();
        const pendingServices = pendingSnap.size;

        // Count upcoming appointments (confirmed)
        const upcomingSnap = await firestore().collection(Collections.APPOINTMENTS)
          .where('farmerId', '==', uid)
          .where('status', '==', 'confirmed')
          .get();
        const upcomingVisits = upcomingSnap.size;

        // Count emergency/health alerts
        const alertsSnap = await firestore().collection(Collections.EMERGENCY_REQUESTS)
          .where('farmerId', '==', uid)
          .where('status', '==', 'active')
          .get();
        const healthAlerts = alertsSnap.size;

        setFarmData({ totalAnimals, pendingServices, upcomingVisits, healthAlerts });

        // Notification count
        const notifSnap = await firestore().collection(Collections.NOTIFICATIONS)
          .where('userId', '==', uid)
          .where('read', '==', false)
          .get();
        setNotifCount(notifSnap.size);
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
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.role}>Farmer</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notifButton}>
            <Icon name="bell" size={24} color={Colors.white} />
            {notifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} contentFit="cover" />
          ) : (
            <Image source={require('../../../../assets/app/man.png')} style={styles.avatar} contentFit="cover" />
          )}
        </View>
      </Animated.View>

      {/* Farm Overview */}
      <Animated.View style={overviewAnim}>
        <Card style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>Farm Overview</Text>
          <View style={styles.overviewGrid}>
            <OverviewItem value={farmData.totalAnimals} label="Total Animals" iconName="cow" />
            <OverviewItem value={farmData.pendingServices} label="Pending Services" iconName="clipboard" />
            <OverviewItem value={farmData.upcomingVisits} label="Upcoming Visits" iconName="calendar" />
            <OverviewItem value={farmData.healthAlerts} label="Health Alerts" iconName="alert" isAlert />
          </View>
        </Card>
      </Animated.View>

      {/* Quick Access */}
      <Animated.View style={[styles.quickAccessSection, quickAccessAnim]}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          <QuickAccessItem iconName="paw" label="My Animals" onPress={() => router.push('/(farmer)/home/my-animals')} />
          <QuickAccessItem iconName="pencil" label={"Request\nService"} onPress={() => router.push('/(farmer)/services')} />
          <QuickAccessItem iconName="calendar" label="Appointments" onPress={() => router.push('/(farmer)/home/appointments')} />
          <QuickAccessItem iconName="clipboard" label={"Health\nRecords"} onPress={() => router.push('/(farmer)/home/health-records')} />
          <QuickAccessItem iconName="farmer" label="Technicians" onPress={() => router.push('/(farmer)/home/technicians')} />
        </View>
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

interface OverviewItemProps { value: number; label: string; iconName: IconName; isAlert?: boolean; }
const OverviewItem: React.FC<OverviewItemProps> = ({ value, label, iconName, isAlert }) => (
  <View style={styles.overviewItem}>
    <View style={styles.overviewItemHeader}>
      <Text style={[styles.overviewValue, isAlert && styles.alertValue]}>{value}</Text>
      <Icon name={iconName} size={24} color={isAlert ? Colors.error : Colors.primary} />
    </View>
    <Text style={styles.overviewLabel}>{label}</Text>
  </View>
);

interface QuickAccessItemProps { iconName: IconName; label: string; onPress: () => void; }
const QuickAccessItem: React.FC<QuickAccessItemProps> = ({ iconName, label, onPress }) => (
  <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.quickIcon}>
      <Icon name={iconName} size={26} color={Colors.primary} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.lg, backgroundColor: Colors.primary, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  headerLeft: {},
  greeting: { fontSize: FontSize.lg, color: Colors.white, opacity: 0.9 },
  name: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  role: { fontSize: FontSize.md, color: Colors.accent, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  notifButton: { position: 'relative', padding: 4 },
  notifBadge: { position: 'absolute', top: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center' },
  notifBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.white },
  overviewCard: { marginTop: Spacing.lg },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  overviewItem: { width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md },
  overviewItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overviewValue: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.primary },
  alertValue: { color: Colors.error },
  overviewLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  quickAccessSection: { marginTop: Spacing.xxl },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.md },
  quickItem: { alignItems: 'center', width: '23%' },
  quickIcon: { width: 56, height: 56, borderRadius: BorderRadius.lg, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadow.light },
  quickLabel: { fontSize: FontSize.xs, color: Colors.text, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 14 },
  helpBanner: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg, paddingRight: 100, overflow: 'hidden' },
  helpContent: { zIndex: 2 },
  helpTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  helpSubtitle: { fontSize: FontSize.md, color: Colors.accent, marginTop: 4, lineHeight: 20 },
  findButton: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, alignSelf: 'flex-start', marginTop: Spacing.md, borderWidth: 1.5, borderColor: Colors.white, backgroundColor: 'transparent' },
  findButtonText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  helpBannerWrapper: { position: 'relative', marginTop: Spacing.xxl },
  pinContainer: { position: 'absolute', right: 80, bottom: '40%', zIndex: 1 },
  helpImage: { position: 'absolute', right: 10, top: -40, width: 120, height: 180, zIndex: 3 },
});

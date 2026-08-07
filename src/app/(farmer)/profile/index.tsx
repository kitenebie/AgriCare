import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, IconName, Avatar } from '@/components/ui';
import { useFadeInUp, useScaleIn, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession, clearSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';

export default function ProfileScreen() {
  const avatarAnim = useScaleIn(200);
  const infoAnim = useFadeInUp(300);
  const menuAnim = useFadeInUp(500);

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [animalCount, setAnimalCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [techCount, setTechCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }

      setUserName(session.displayName || 'Farmer');
      setUserRole(session.role || 'farmer');

      // Get user details from Firestore
      try {
        const uid = session.uid;
        const userDoc = await firestore().collection(Collections.USERS).doc(uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          if (data?.photoURL) setPhotoURL(data.photoURL);
          if (data?.location) setUserLocation(data.location);
        }

        // Count animals
        const animalSnap = await firestore().collection('animals').where('ownerId', '==', uid).get();
        setAnimalCount(animalSnap.size);

        // Count appointments
        const apptSnap = await firestore().collection(Collections.APPOINTMENTS).where('farmerId', '==', uid).get();
        setAppointmentCount(apptSnap.size);

        // Count unique technicians worked with
        const techIds = new Set<string>();
        apptSnap.docs.forEach(d => { const tid = d.data().technicianId; if (tid) techIds.add(tid); });
        setTechCount(techIds.size);
      } catch (e) {
        console.warn('Profile load error:', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
        try { await clearSession(); await auth().signOut(); } catch (e) {}
        router.replace('/');
      }},
    ]);
  };

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.avatarContainer, avatarAnim]}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} contentFit="cover" />
          ) : (
            <Avatar name={userName} size={100} />
          )}
        </Animated.View>

        <Animated.View style={[styles.profileInfo, infoAnim]}>
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.role}>{userRole}</Text>
          {userLocation ? (
            <View style={styles.locationRow}>
              <Icon name="location" size={14} color={Colors.white} />
              <Text style={styles.location}>{userLocation}</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>

      {/* Stats */}
      <Animated.View style={[styles.statsContainer, infoAnim]}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{animalCount}</Text>
          <Text style={styles.statLabel}>Animals</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{appointmentCount}</Text>
          <Text style={styles.statLabel}>Appointments</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{techCount}</Text>
          <Text style={styles.statLabel}>Technicians</Text>
        </View>
      </Animated.View>

      {/* Menu Items */}
      <Animated.View style={[styles.menuContainer, menuAnim]}>
        <MenuItem iconName="paw" label="My Animals" subtitle="Manage your livestock" onPress={() => router.push('/(farmer)/home/my-animals')} />
        <MenuItem iconName="clipboard" label="Health Records" subtitle="View animal health history" onPress={() => router.push('/(farmer)/home/health-records')} />
        <MenuItem iconName="calendar" label="Appointments" subtitle="Past and upcoming visits" onPress={() => router.push('/(farmer)/home/appointments')} />
        <MenuItem iconName="bell" label="Notification Settings" subtitle="Manage alerts" />
        <MenuItem iconName="lock" label="Privacy & Security" subtitle="Account settings" />
        <MenuItem iconName="help" label="Help & Support" subtitle="FAQs and contact us" />
        <MenuItem iconName="logout" label="Log Out" subtitle="" isDestructive onPress={handleLogout} />
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

interface MenuItemProps {
  iconName: IconName;
  label: string;
  subtitle: string;
  isDestructive?: boolean;
  onPress?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ iconName, label, subtitle, isDestructive, onPress }) => (
  <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={onPress}>
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
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { alignItems: 'center', backgroundColor: Colors.primary, paddingVertical: Spacing.xxxl, paddingTop: Spacing.xl, borderBottomLeftRadius: BorderRadius.xl * 2, borderBottomRightRadius: BorderRadius.xl * 2 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: Colors.white },
  profileInfo: { alignItems: 'center', marginTop: Spacing.md },
  name: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  role: { fontSize: FontSize.lg, color: Colors.accent, marginTop: 2, textTransform: 'capitalize' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  location: { fontSize: FontSize.md, color: Colors.white, opacity: 0.8 },
  statsContainer: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: -Spacing.xl, borderRadius: BorderRadius.xl, padding: Spacing.xl, ...Shadow.medium },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  menuContainer: { backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: Spacing.xl, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadow.light },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  menuIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  menuContent: { flex: 1, marginLeft: Spacing.md },
  menuLabel: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  menuSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  destructiveText: { color: Colors.error },
});

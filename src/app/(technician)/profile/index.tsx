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

export default function TechProfileScreen() {
  const avatarAnim = useScaleIn(200);
  const infoAnim = useFadeInUp(300);
  const menuAnim = useFadeInUp(500);

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [experience, setExperience] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }

      setUserName(session.displayName || 'Technician');
      setUserRole(session.role || 'technician');

      try {
        const uid = session.uid;

        // Get user details
        const userDoc = await firestore().collection(Collections.USERS).doc(uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          if (data?.photoURL) setPhotoURL(data.photoURL);
          if (data?.specialization) setSpecialization(data.specialization);
          if (data?.experience) setExperience(data.experience);
          if (data?.verificationStatus) setVerificationStatus(data.verificationStatus);
        }

        // Get technician-specific data
        const techSnap = await firestore().collection('technician').where('userId', '==', uid).get();
        if (!techSnap.empty) {
          const techData = techSnap.docs[0].data();
          if (techData?.specializations) setSpecialization(techData.specializations.join(', '));
          if (techData?.experience) setExperience(techData.experience);
          if (techData?.verificationStatus) setVerificationStatus(techData.verificationStatus);
        }

        // Count reviews and avg rating
        const reviewsSnap = await firestore().collection(Collections.REVIEWS).where('technicianId', '==', uid).get();
        setReviewCount(reviewsSnap.size);
        if (reviewsSnap.size > 0) {
          const total = reviewsSnap.docs.reduce((sum, d) => sum + (d.data().rating || 0), 0);
          setRating(parseFloat((total / reviewsSnap.size).toFixed(1)));
        }

        // Count completed appointments
        const completedSnap = await firestore().collection(Collections.APPOINTMENTS)
          .where('technicianId', '==', uid)
          .where('status', '==', 'completed')
          .get();
        setCompletedCount(completedSnap.size);
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
          {verificationStatus === 'verified' && (
            <View style={styles.verifiedBadge}>
              <Icon name="check" size={14} color={Colors.white} />
            </View>
          )}
        </Animated.View>

        <Animated.View style={[styles.profileInfo, infoAnim]}>
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.role}>Veterinary Technician</Text>
          {specialization ? (
            <Text style={styles.specialization}>{specialization}</Text>
          ) : null}
          {verificationStatus && (
            <View style={[styles.verifyBadge, verificationStatus === 'verified' ? styles.verifiedBg : styles.pendingBg]}>
              <Text style={[styles.verifyText, verificationStatus === 'verified' ? styles.verifiedText : styles.pendingText]}>
                {verificationStatus === 'verified' ? '✓ Verified' : '⏳ Pending Verification'}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* Stats */}
      <Animated.View style={[styles.statsContainer, infoAnim]}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{rating > 0 ? `${rating} ⭐` : '--'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{reviewCount}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </Animated.View>

      {/* Menu Items */}
      <Animated.View style={[styles.menuContainer, menuAnim]}>
        <MenuItem iconName="profile" label="Edit Profile" subtitle="Update your information" />
        <MenuItem iconName="clipboard" label="Specializations" subtitle={specialization || 'Set your expertise'} />
        <MenuItem iconName="calendar" label="Schedule Settings" subtitle="Manage availability" onPress={() => router.push('/(technician)/schedule')} />
        <MenuItem iconName="star" label="My Reviews" subtitle={`${reviewCount} reviews`} />
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
  verifiedBadge: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.white },
  profileInfo: { alignItems: 'center', marginTop: Spacing.md },
  name: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  role: { fontSize: FontSize.lg, color: Colors.accent, marginTop: 2 },
  specialization: { fontSize: FontSize.sm, color: Colors.white, opacity: 0.8, marginTop: 4, textAlign: 'center' },
  verifyBadge: { marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full },
  verifiedBg: { backgroundColor: 'rgba(76, 175, 80, 0.3)' },
  pendingBg: { backgroundColor: 'rgba(255, 152, 0, 0.3)' },
  verifyText: { fontSize: FontSize.xs, fontWeight: '700' },
  verifiedText: { color: '#A5D6A7' },
  pendingText: { color: '#FFE0B2' },
  // Stats
  statsContainer: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: -Spacing.xl, borderRadius: BorderRadius.xl, padding: Spacing.xl, ...Shadow.medium },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  // Menu
  menuContainer: { backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: Spacing.xl, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadow.light },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  menuIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  menuContent: { flex: 1, marginLeft: Spacing.md },
  menuLabel: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  menuSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  destructiveText: { color: Colors.error },
});

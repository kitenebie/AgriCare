import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';
import { logCrud } from '@/services/logService';

interface Appointment {
  id: string;
  serviceType: string;
  animalName: string;
  farmerName: string;
  farmerId: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  description: string;
  location?: string;
  createdAt?: any;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending: { color: '#F59E0B', bg: '#FEF3C7', label: 'Pending', icon: 'clock' },
  confirmed: { color: '#10B981', bg: '#D1FAE5', label: 'Accepted', icon: 'check' },
  completed: { color: '#6366F1', bg: '#E0E7FF', label: 'Completed', icon: 'check-circle' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled', icon: 'close' },
};

export default function TechAppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [uid, setUid] = useState('');
  const headerAnim = useFadeIn(100);

  useEffect(() => {
    let unsub: () => void = () => {};
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);

      unsub = firestore()
        .collection(Collections.APPOINTMENTS)
        .where('technicianId', '==', session.uid)
        .onSnapshot(
          (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
            data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            setAppointments(data);
            setLoading(false);
          },
          () => setLoading(false)
        );
    };
    load();
    return () => unsub();
  }, []);

  const handleAccept = (appt: Appointment) => {
    Alert.alert('Accept Request', `Accept "${appt.serviceType}" for ${appt.farmerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: async () => {
        try {
          await firestore().collection(Collections.APPOINTMENTS).doc(appt.id).update({ status: 'confirmed' });
          await logCrud('Appointment Accepted', `${appt.serviceType} for ${appt.farmerName}`, 'appointments', appt.id, {
            old: { status: 'pending' }, new: { status: 'confirmed' },
          });
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleReject = (appt: Appointment) => {
    Alert.alert('Decline Request', `Decline "${appt.serviceType}" for ${appt.farmerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        try {
          await firestore().collection(Collections.APPOINTMENTS).doc(appt.id).update({ status: 'cancelled' });
          await logCrud('Appointment Declined', `${appt.serviceType} for ${appt.farmerName}`, 'appointments', appt.id, {
            old: { status: 'pending' }, new: { status: 'cancelled' },
          });
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleComplete = (appt: Appointment) => {
    Alert.alert('Mark Complete', `Mark "${appt.serviceType}" as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: async () => {
        try {
          await firestore().collection(Collections.APPOINTMENTS).doc(appt.id).update({ status: 'completed' });
          await logCrud('Appointment Completed', `${appt.serviceType} for ${appt.farmerName}`, 'appointments', appt.id, {
            old: { status: 'confirmed' }, new: { status: 'completed' },
          });
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const filtered = appointments.filter(a => filter === 'all' || a.status === filter);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <Animated.View style={[s.header, headerAnim]}>
        <Text style={s.headerTitle}>Appointment Requests</Text>
        <Text style={s.headerSubtitle}>{appointments.filter(a => a.status === 'pending').length} pending</Text>
      </Animated.View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {[
          { value: 'pending', label: 'Pending' },
          { value: 'confirmed', label: 'Accepted' },
          { value: 'completed', label: 'Completed' },
          { value: 'all', label: 'All' },
        ].map(f => (
          <TouchableOpacity key={f.value} style={[s.filterChip, filter === f.value && s.filterChipActive]} onPress={() => setFilter(f.value)}>
            <Text style={[s.filterText, filter === f.value && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count */}
      <Text style={s.count}>{filtered.length} request{filtered.length !== 1 ? 's' : ''}</Text>

      {/* List */}
      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={s.empty}>
            <Icon name="calendar" size={48} color={Colors.textLight} />
            <Text style={s.emptyText}>No requests found</Text>
            <Text style={s.emptySubtext}>Appointment requests will appear here</Text>
          </View>
        )}
        {filtered.map((a, index) => {
          const config = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
          return (
            <View key={a.id} style={s.card}>
              {/* Status Badge + Date */}
              <View style={s.cardTop}>
                <View style={[s.statusBadge, { backgroundColor: config.bg }]}>
                  <Icon name={config.icon as any} size={12} color={config.color} />
                  <Text style={[s.statusText, { color: config.color }]}>{config.label}</Text>
                </View>
                <Text style={s.cardDate}>{formatDate(a.date)}</Text>
              </View>

              {/* Service Info */}
              <Text style={s.cardService}>{a.serviceType}</Text>
              <Text style={s.cardAnimal}>{a.animalName}</Text>

              {/* Farmer & Details */}
              <View style={s.detailsRow}>
                <View style={s.detailItem}>
                  <Icon name="profile" size={14} color={Colors.textSecondary} />
                  <Text style={s.detailText}>{a.farmerName || 'Unknown Farmer'}</Text>
                </View>
                <View style={s.detailItem}>
                  <Icon name="clock" size={14} color={Colors.textSecondary} />
                  <Text style={s.detailText}>{a.time || 'No time set'}</Text>
                </View>
              </View>

              {/* Description */}
              {a.description ? <Text style={s.cardDesc} numberOfLines={2}>{a.description}</Text> : null}

              {/* Action Buttons */}
              {a.status === 'pending' && (
                <View style={s.actionRow}>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(a)}>
                    <Icon name="close" size={16} color={Colors.error} />
                    <Text style={s.rejectBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(a)}>
                    <Icon name="check" size={16} color={Colors.white} />
                    <Text style={s.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}
              {a.status === 'confirmed' && (
                <View style={s.actionRow}>
                  <TouchableOpacity style={s.completeBtn} onPress={() => handleComplete(a)}>
                    <Icon name="check-circle" size={16} color={Colors.white} />
                    <Text style={s.completeBtnText}>Mark as Complete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  headerSubtitle: { fontSize: FontSize.md, color: Colors.accent, marginTop: 4 },
  // Filters
  filterScroll: { maxHeight: 48, marginTop: Spacing.md },
  filterContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: Colors.white, fontWeight: '700' },
  count: { fontSize: FontSize.sm, color: Colors.textSecondary, paddingHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.sm },
  // List
  list: { flex: 1, paddingHorizontal: Spacing.lg },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4 },
  // Card
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.light },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 12, color: Colors.textSecondary },
  cardService: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  cardAnimal: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 2 },
  detailsRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: Colors.textSecondary },
  cardDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18, fontStyle: 'italic' },
  // Actions
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  acceptBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  rejectBtnText: { color: Colors.error, fontWeight: '700', fontSize: FontSize.sm },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#6366F1', paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  completeBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
});

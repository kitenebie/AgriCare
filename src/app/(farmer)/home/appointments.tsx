import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { getSession } from '@/services/sessionService';

interface Appointment {
  id: string;
  serviceType: string;
  animalName: string;
  technicianName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  description: string;
  createdAt?: any;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending: { color: '#F59E0B', bg: '#FEF3C7', label: 'Pending', icon: 'clock' },
  confirmed: { color: '#10B981', bg: '#D1FAE5', label: 'Accepted', icon: 'check' },
  completed: { color: '#6366F1', bg: '#E0E7FF', label: 'Completed', icon: 'check-circle' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled', icon: 'close' },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    let unsub: () => void = () => {};
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }

      unsub = firestore()
        .collection(Collections.APPOINTMENTS)
        .where('farmerId', '==', session.uid)
        .onSnapshot(
          (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
            // Sort by date descending
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
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Appointments</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'confirmed', label: 'Accepted' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
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
            <Text style={s.emptyText}>No appointments found</Text>
            <Text style={s.emptySubtext}>Your service requests will appear here</Text>
          </View>
        )}
        {filtered.map(a => {
          const config = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
          return (
            <View key={a.id} style={s.card}>
              {/* Status Badge */}
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

              {/* Details Row */}
              <View style={s.detailsRow}>
                <View style={s.detailItem}>
                  <Icon name="clock" size={14} color={Colors.textSecondary} />
                  <Text style={s.detailText}>{a.time || 'No time set'}</Text>
                </View>
                <View style={s.detailItem}>
                  <Icon name="profile" size={14} color={Colors.textSecondary} />
                  <Text style={s.detailText}>{a.technicianName || 'Unassigned'}</Text>
                </View>
              </View>

              {/* Description */}
              {a.description ? <Text style={s.cardDesc} numberOfLines={2}>{a.description}</Text> : null}

              {/* Technician Status Indicator */}
              {a.status === 'pending' && (
                <View style={s.waitingRow}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={s.waitingText}>Waiting for technician to accept...</Text>
                </View>
              )}
              {a.status === 'confirmed' && (
                <View style={s.acceptedRow}>
                  <Icon name="check" size={14} color="#10B981" />
                  <Text style={s.acceptedText}>Technician accepted your request</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
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
  // Status indicators
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: '#FEF3C7' },
  waitingText: { fontSize: 12, color: '#D97706' },
  acceptedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: '#D1FAE5' },
  acceptedText: { fontSize: 12, color: '#059669' },
});

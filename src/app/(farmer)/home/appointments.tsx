import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Collections } from '@/services/firebase';
import { getSession } from '@/services/sessionService';
import { modalAlert } from '@/components/ui/ModalAlert';
import { cancelFarmerAppointment } from '@/services/appointmentService';

interface Appointment {
  id: string;
  serviceType: string;
  animalType?: string;
  animalName: string;
  animalBreed?: string;
  animalQuantity?: number;
  technicianName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  description: string;
  createdAt?: any;
  location?: string;
  appointmentLatitude?: number | null;
  appointmentLongitude?: number | null;
  cancellationRequestStatus?: 'pending' | 'approved' | 'declined';
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending: { color: '#F59E0B', bg: '#FEF3C7', label: 'Pending', icon: 'clock' },
  confirmed: { color: '#10B981', bg: '#D1FAE5', label: 'Accepted', icon: 'check' },
  completed: { color: '#6366F1', bg: '#E0E7FF', label: 'Completed', icon: 'check-circle' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled', icon: 'close' },
};
const isCoordinateText = (value: string) => /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim());

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [farmerLocation, setFarmerLocation] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let unsub: () => void = () => {};
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      const farmerDoc = await firestore().collection(Collections.USERS).doc(session.uid).get().catch(() => null);
      setFarmerLocation(farmerDoc?.data()?.location || '');

      unsub = firestore()
        .collection(Collections.APPOINTMENTS)
        .where('farmerId', '==', session.uid)
        .onSnapshot(
          (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
            // Sort by date descending
            data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            setAppointments(data);
            setSelectedAppointment(current => current ? data.find(a => a.id === current.id) || current : null);
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

  const cancelRequest = (appointment: Appointment) => {
    if (cancelling) return;
    const needsApproval = appointment.status === 'confirmed';
    modalAlert(needsApproval ? 'Request cancellation?' : 'Cancel service request?', needsApproval
      ? 'The technician must approve cancellation of this accepted appointment.'
      : 'This pending request will be cancelled and cannot be restored.', [
      { text: 'Keep request', style: 'cancel' },
      { text: needsApproval ? 'Request cancellation' : 'Cancel request', style: 'destructive', onPress: async () => {
        setCancelling(true);
        try {
          const session = await getSession();
          if (!session) throw new Error('Please sign in again and try once more.');
          const result = await cancelFarmerAppointment(appointment.id, session.uid);
          if (result.needsApproval) {
            modalAlert('Approval requested', 'The technician has been notified. Your appointment stays accepted until they decide.');
          } else {
            setSelectedAppointment(null);
            modalAlert('Request cancelled', 'Your service request has been cancelled.');
          }
        } catch (error: any) {
          modalAlert('Unable to cancel request', error?.message || 'Please try again.');
        } finally {
          setCancelling(false);
        }
      } },
    ]);
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
          <TouchableOpacity key={a.id} style={s.card} activeOpacity={0.88} onPress={() => setSelectedAppointment(a)} accessibilityRole="button" accessibilityLabel={`View ${a.serviceType} request details for ${a.animalType || 'animal'}`} accessibilityHint="Opens full service request details">
              {/* Status Badge */}
              <View style={s.cardTop}>
                <View style={[s.statusBadge, { backgroundColor: config.bg }]}>
                  <Icon name={config.icon as any} size={12} color={config.color} />
                  <Text style={[s.statusText, { color: config.color }]}>{config.label}</Text>
                </View>
                <View style={s.cardDateRow}><Text style={s.cardDate}>{formatDate(a.date)}</Text><Icon name="chevron-right" size={16} color={Colors.textLight} /></View>
              </View>

              {/* Service Info */}
              <Text style={s.cardService}>{a.serviceType}</Text>
                  {!!a.animalType && <Text style={s.cardAnimal}>{a.animalType}</Text>}
              {(a.animalBreed || a.animalQuantity) ? <Text style={s.detailText}>{[a.animalBreed && `Breed: ${a.animalBreed}`, a.animalQuantity && `Quantity: ${a.animalQuantity}`].filter(Boolean).join(' · ')}</Text> : null}

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
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>
      <Modal visible={!!selectedAppointment} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedAppointment(null)}>
        <View style={s.drawerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedAppointment(null)} accessibilityRole="button" accessibilityLabel="Close appointment details" />
          <View style={[s.drawer, { paddingTop: Math.max(insets.top, Spacing.lg), paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
            <View style={s.drawerHeader}>
              <View><Text style={s.drawerKicker}>AGRICARE • MY REQUESTS</Text><Text style={s.drawerTitle}>Request Details</Text></View>
              <TouchableOpacity style={s.drawerClose} onPress={() => setSelectedAppointment(null)} accessibilityRole="button" accessibilityLabel="Close appointment details" hitSlop={6}><Icon name="close" size={22} color={Colors.white} /></TouchableOpacity>
            </View>
            {selectedAppointment && (() => {
              const appointment = selectedAppointment;
              const config = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
              const animalDetails = [appointment.animalBreed && `Breed: ${appointment.animalBreed}`, appointment.animalQuantity && `Quantity: ${appointment.animalQuantity}`].filter(Boolean).join(' · ');
              const location = [farmerLocation, appointment.location].find(value => typeof value === 'string' && value.trim() && !isCoordinateText(value)) || 'Address unavailable';
              return <ScrollView style={s.drawerContent} contentContainerStyle={s.drawerBody} showsVerticalScrollIndicator={false}>
                <View style={s.requestSummary}>
                  <View style={[s.statusBadge, { backgroundColor: config.bg }]}><Icon name={config.icon as any} size={12} color={config.color} /><Text style={[s.statusText, { color: config.color }]}>{config.label}</Text></View>
                  <Text style={s.drawerService}>{appointment.serviceType || 'Service request'}</Text>
                  {!!appointment.animalType && <Text style={s.drawerAnimal}>{appointment.animalType}</Text>}
                </View>
                {!!animalDetails && <RequestDetail icon="paw" label="Animal details" value={animalDetails} />}
                <RequestDetail icon="calendar" label="Preferred schedule" value={`${formatDate(appointment.date) || 'Date not set'} · ${appointment.time || 'Time not set'}`} />
                <RequestDetail icon="profile" label="Technician" value={appointment.technicianName || 'All available technicians'} />
                <RequestDetail icon="location" label="Service location" value={location} />
                <View style={s.requestDetailCard}><View style={s.detailHeading}><View style={s.detailIcon}><Icon name="messages" size={18} color={Colors.primary} /></View><Text style={s.detailLabel}>Issue / request details</Text></View><Text style={s.requestDescription}>{appointment.description?.trim() || 'No additional details provided.'}</Text></View>
                {appointment.status === 'confirmed' && appointment.cancellationRequestStatus === 'pending' && <Text style={s.cancellationPending}>Cancellation request sent. Waiting for technician approval.</Text>}
                {appointment.status === 'confirmed' && appointment.cancellationRequestStatus === 'declined' && <Text style={s.cancellationDeclined}>Technician declined the cancellation request.</Text>}
                {(appointment.status === 'pending' || (appointment.status === 'confirmed' && appointment.cancellationRequestStatus !== 'pending')) && <TouchableOpacity style={s.cancelRequestButton} onPress={() => cancelRequest(appointment)} disabled={cancelling} accessibilityRole="button" accessibilityLabel={appointment.status === 'pending' ? 'Cancel service request' : 'Request appointment cancellation'}>
                  {cancelling ? <ActivityIndicator color="#B42318" /> : <Text style={s.cancelRequestText}>{appointment.status === 'pending' ? 'Cancel Request' : 'Request Cancellation'}</Text>}
                </TouchableOpacity>}
                <View style={{ height: Spacing.lg }} />
              </ScrollView>;
            })()}
          </View>
        </View>
      </Modal>
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
  cardDateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
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
  drawerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9, 25, 17, 0.58)' },
  drawer: { height: '95%', backgroundColor: Colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden', ...Shadow.heavy },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  drawerKicker: { color: '#D6F4DE', fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.8 },
  drawerTitle: { color: Colors.white, fontSize: FontSize.xl, fontWeight: '800', marginTop: 2 },
  drawerClose: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  drawerContent: { flex: 1 },
  drawerBody: { padding: Spacing.lg, gap: Spacing.md },
  requestSummary: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.light },
  drawerService: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.md },
  drawerAnimal: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600', marginTop: Spacing.xs },
  requestDetailCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadow.light },
  detailHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  detailIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9' },
  detailLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },
  requestDescription: { color: Colors.text, fontSize: FontSize.md, lineHeight: 22 },
  cancelRequestButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.full, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA', marginTop: Spacing.sm },
  cancelRequestText: { color: '#B42318', fontSize: FontSize.md, fontWeight: '700' },
  cancellationPending: { color: '#9A6700', backgroundColor: '#FFF7D6', padding: Spacing.md, borderRadius: BorderRadius.md, fontSize: FontSize.sm, fontWeight: '600' },
  cancellationDeclined: { color: '#B42318', backgroundColor: '#FEE2E2', padding: Spacing.md, borderRadius: BorderRadius.md, fontSize: FontSize.sm, fontWeight: '600' },
});

const RequestDetail = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={s.requestDetailCard}>
    <View style={s.detailHeading}><View style={s.detailIcon}><Icon name={icon as any} size={18} color={Colors.primary} /></View><Text style={s.detailLabel}>{label}</Text></View>
    <Text style={s.requestDescription}>{value}</Text>
  </View>
);

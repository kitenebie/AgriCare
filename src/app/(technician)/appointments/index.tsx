import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';
import { acceptAppointment, declineAppointment } from '@/services/appointmentService';
interface Appointment {
  id: string;
  serviceType: string;
  animalName: string;
  farmerName: string;
  farmerId: string;
  date: string;
  time: string;
  status: string;
  description: string;
  technicianId: string;
  technicianName: string;
  location?: string;
  createdAt?: any;
}
export default function TechAppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');
  const [userName, setUserName] = useState('');
  const [techExpertise, setTechExpertise] = useState<string[]>([]);
  const headerAnim = useFadeIn(100);
  const contentAnim = useFadeInUp(200);
  useEffect(() => {
    let unsub: () => void = () => {};
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);
      setUserName(session.displayName || 'Technician');

      // Fetch technician's expertise/specialization from Firestore
      let expertise: string[] = [];
      try {
        const techDoc = await firestore().collection(Collections.USERS).doc(session.uid).get();
        const techData = techDoc.data();
        if (techData?.expertise && Array.isArray(techData.expertise)) {
          expertise = techData.expertise;
        } else if (techData?.specialization) {
          expertise = techData.specialization.split(',').map((s: string) => s.trim());
        }
        setTechExpertise(expertise);
      } catch (e) {
        console.warn('Failed to fetch tech expertise:', e);
      }

      // Listen to ALL PENDING appointments — filter by specialization
      unsub = firestore()
        .collection(Collections.APPOINTMENTS)
        .where('status', '==', 'pending')
        .onSnapshot(
          (snap) => {
            let data = snap.docs
              .map(d => ({ id: d.id, ...d.data() } as Appointment))
              .filter(a => !a.technicianId || a.technicianId === '' || a.technicianName === 'Unassigned');

            // Filter by technician's specialization
            if (expertise.length > 0) {
              data = data.filter(a => {
                const svc = (a.serviceType || '').toLowerCase();
                return expertise.some(exp => {
                  const expLower = exp.toLowerCase();
                  // Match if service type is mentioned in expertise
                  // e.g. expertise "Cow Healthcare & Treatment 🐄" matches service "Health Check", "Treatment", "Vaccination" for cows
                  if (expLower.includes('cow') && (svc.includes('cow') || svc.includes('cattle') || svc.includes('baka'))) return true;
                  if (expLower.includes('swine') && (svc.includes('swine') || svc.includes('pig') || svc.includes('baboy'))) return true;
                  if (expLower.includes('treatment') && svc.includes('treatment')) return true;
                  if (expLower.includes('vaccination') && svc.includes('vaccination')) return true;
                  if (expLower.includes('breeding') && (svc.includes('breeding') || svc.includes('insemination'))) return true;
                  if (expLower.includes('healthcare') && (svc.includes('health') || svc.includes('checkup') || svc.includes('check'))) return true;
                  // General match: any word overlap
                  const expWords = expLower.replace(/[^\w\s]/g, '').split(/\s+/);
                  const svcWords = svc.replace(/[^\w\s]/g, '').split(/\s+/);
                  return expWords.some(w => w.length > 3 && svcWords.includes(w));
                });
              });
            }

            // Sort by date ascending (oldest first)
            data.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
            setAppointments(data);
            setLoading(false);
          },
          (error) => {
            console.error('📋 Firestore error loading appointments:', error);
            setLoading(false);
          }
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
          await acceptAppointment({
            appointmentId: appt.id,
            serviceType: appt.serviceType,
            animalName: appt.animalName,
            date: appt.date,
            time: appt.time,
            farmerId: appt.farmerId,
            farmerName: appt.farmerName,
            technicianId: uid,
            technicianName: userName,
          });
          Alert.alert('Accepted! ✅', `You've accepted the request. A message has been sent to ${appt.farmerName}.`);
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };
  const handleDecline = (appt: Appointment) => {
    Alert.alert('Decline Request', `Decline "${appt.serviceType}" for ${appt.farmerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        try {
          await declineAppointment({
            appointmentId: appt.id,
            serviceType: appt.serviceType,
            animalName: appt.animalName,
            farmerId: appt.farmerId,
            farmerName: appt.farmerName,
            technicianId: uid,
            technicianName: userName,
          });
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const getRelativeDate = (dateStr: string) => {
    if (!dateStr) return '';
    const today = new Date();
    const date = new Date(dateStr);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    return '';
  };
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  return (
    <View style={s.container}>
      {/* Header */}
      <Animated.View style={[s.header, headerAnim]}>
        <Text style={s.headerTitle}>Available Requests</Text>
        <Text style={s.headerSubtitle}>{appointments.length} request{appointments.length !== 1 ? 's' : ''} matching your specialization</Text>
      </Animated.View>
      {/* List */}
      <Animated.View style={[{ flex: 1 }, contentAnim]}>
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          {appointments.length === 0 ? (
            <View style={s.empty}>
              <Icon name="check-circle" size={56} color={Colors.accent} />
              <Text style={s.emptyText}>No pending requests</Text>
              <Text style={s.emptySubtext}>New service requests from farmers will appear here</Text>
            </View>
          ) : (
            appointments.map((a) => {
              const relDate = getRelativeDate(a.date);
              return (
                <View key={a.id} style={s.card}>
                  {/* Header Row */}
                  <View style={s.cardHeader}>
                    <View style={s.pendingBadge}>
                      <View style={s.pulseDot} />
                      <Text style={s.pendingText}>Pending</Text>
                    </View>
                    <View style={s.dateCol}>
                      <Text style={s.cardDate}>{formatDate(a.date)}</Text>
                      {relDate ? <Text style={s.relDate}>{relDate}</Text> : null}
                    </View>
                  </View>
                  {/* Service Type */}
                  <Text style={s.cardService}>{a.serviceType}</Text>
                  {/* Animal */}
                  <View style={s.infoRow}>
                    <Icon name="paw" size={14} color={Colors.primary} />
                    <Text style={s.infoText}>{a.animalName}</Text>
                  </View>
                  {/* Farmer */}
                  <View style={s.infoRow}>
                    <Icon name="farmer" size={14} color={Colors.textSecondary} />
                    <Text style={s.infoText}>{a.farmerName || 'Unknown Farmer'}</Text>
                  </View>
                  {/* Time */}
                  <View style={s.infoRow}>
                    <Icon name="clock" size={14} color={Colors.textSecondary} />
                    <Text style={s.infoText}>{a.time || 'No preferred time'}</Text>
                  </View>
                  {/* Description */}
                  {a.description ? (
                    <View style={s.descBox}>
                      <Text style={s.descLabel}>Notes from farmer:</Text>
                      <Text style={s.descText} numberOfLines={3}>{a.description}</Text>
                    </View>
                  ) : null}
                  {/* Action Buttons */}
                  <View style={s.actionRow}>
                    <TouchableOpacity style={s.declineBtn} onPress={() => handleDecline(a)}>
                      <Icon name="close" size={16} color={Colors.error} />
                      <Text style={s.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(a)}>
                      <Icon name="check" size={16} color={Colors.white} />
                      <Text style={s.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  headerSubtitle: { fontSize: FontSize.md, color: Colors.accent, marginTop: 4 },
  // List
  list: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.lg },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
  // Card
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.light, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },
  pendingText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  dateCol: { alignItems: 'flex-end' },
  cardDate: { fontSize: FontSize.sm, color: Colors.textSecondary },
  relDate: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  // Service
  cardService: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: FontSize.md, color: Colors.textSecondary },
  // Description
  descBox: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm },
  descLabel: { fontSize: FontSize.xs, color: Colors.textLight, marginBottom: 4 },
  descText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 18 },
  // Actions
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  acceptBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  declineBtn: { flex: 0.7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  declineBtnText: { color: Colors.error, fontWeight: '700', fontSize: FontSize.md },
});

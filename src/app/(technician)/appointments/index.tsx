import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import firestore from '@react-native-firebase/firestore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';
import ServiceRequestDetailsDrawer from '@/components/technician/ServiceRequestDetailsDrawer';
import { isRequestAvailableToTechnician, type ServiceRequest } from '@/utils/technicianRequests';
export default function TechAppointmentsScreen() {
  const [appointments, setAppointments] = useState<ServiceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
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
              .map(d => ({ id: d.id, ...d.data() } as ServiceRequest))
              .filter(a => isRequestAvailableToTechnician(a, session.uid));

            // Filter by technician's specialization
            if (expertise.length > 0) {
              data = data.filter(a => {
                // Always show appointments specifically assigned to this technician
                if (a.technicianId === session.uid) return true;
                // Always show unassigned/open appointments (any technician can take them)
                if (!a.technicianId || a.technicianId === '' || (a.technicianName || '').toLowerCase() === 'unassigned') return true;
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
        <TouchableOpacity style={s.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(technician)/dashboard')} accessibilityLabel="Go back">
          <Icon name="chevron-left" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Available Requests</Text>
          <Text style={s.headerSubtitle}>{appointments.length} public or assigned request{appointments.length !== 1 ? 's' : ''}</Text>
        </View>
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
                <TouchableOpacity key={a.id} style={s.card} activeOpacity={0.8} onPress={() => setSelectedRequest(a)} accessibilityRole="button" accessibilityLabel={`View ${a.serviceType} request from ${a.farmerName}`}>
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
                  {(a.animalType || a.animalBreed || a.animalQuantity) ? <Text style={[s.infoText, { marginLeft: 22 }]}>{[a.animalType && `Type: ${a.animalType}`, a.animalBreed && `Breed: ${a.animalBreed}`, a.animalQuantity && `Quantity: ${a.animalQuantity}`].filter(Boolean).join(' · ')}</Text> : null}
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
                  <View style={s.openDetails}><Text style={s.openDetailsText}>View full request</Text><Icon name="chevron-right" size={18} color={Colors.primary} /></View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      </Animated.View>
      <ServiceRequestDetailsDrawer request={selectedRequest} technicianId={uid} technicianName={userName} onClose={() => setSelectedRequest(null)} />
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl },
  backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1 },
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
  openDetails: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  openDetailsText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
});

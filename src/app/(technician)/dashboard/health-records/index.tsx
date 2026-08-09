import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';

interface AppointmentAnimal {
  appointmentId: string;
  animalId: string;
  animalName: string;
  farmerId: string;
  farmerName: string;
  farmerPhoto: string;
  serviceType: string;
  date: string;
  time: string;
  status: string;
  animalPhoto: string;
}

interface HealthRecord {
  id: string;
  animalName: string;
  recordType: string;
  diagnosis: string;
  date: any;
  status: string;
  animalId: string;
}

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  checkup: { color: '#2196F3', bg: '#E3F2FD' },
  vaccination: { color: '#4CAF50', bg: '#E8F5E9' },
  treatment: { color: '#FF9800', bg: '#FFF3E0' },
  surgery: { color: '#9C27B0', bg: '#F3E5F5' },
  deworming: { color: '#795548', bg: '#EFEBE9' },
  lab_test: { color: '#607D8B', bg: '#ECEFF1' },
  emergency: { color: '#F44336', bg: '#FFEBEE' },
  follow_up: { color: '#009688', bg: '#E0F2F1' },
};

export default function HealthRecordsListScreen() {
  const [animals, setAnimals] = useState<AppointmentAnimal[]>([]);
  const [recentRecords, setRecentRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');
  const headerAnim = useFadeIn(100);
  const contentAnim = useFadeInUp(200);

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);

      try {
        // Get animals from confirmed appointments assigned to this technician
        const apptSnap = await firestore()
          .collection(Collections.APPOINTMENTS)
          .where('technicianId', '==', session.uid)
          .where('status', '==', 'confirmed')
          .get();

        const animalsList: AppointmentAnimal[] = await Promise.all(
          apptSnap.docs.map(async (doc) => {
            const data = doc.data();
            let farmerPhoto = '';
            let animalPhoto = '';
            if (data.farmerId) {
              try {
                const farmerDoc = await firestore().collection(Collections.USERS).doc(data.farmerId).get();
                if (farmerDoc.exists) farmerPhoto = farmerDoc.data()?.photoURL || '';
              } catch (e) {}
            }
            // Get animal image
            if (data.animalId) {
              try {
                const animalDoc = await firestore().collection('animals').doc(data.animalId).get();
                if (animalDoc.exists) animalPhoto = animalDoc.data()?.imageUrl || animalDoc.data()?.photoURL || '';
              } catch (e) {}
            }
            return {
              appointmentId: doc.id,
              animalId: data.animalId || '',
              animalName: data.animalName || 'Unknown Animal',
              farmerId: data.farmerId || '',
              farmerName: data.farmerName || 'Unknown Farmer',
              farmerPhoto,
              serviceType: data.serviceType || '',
              date: data.date || '',
              time: data.time || '',
              status: data.status || '',
              animalPhoto,
            };
          })
        );

        setAnimals(animalsList);

        // Get recent health records by this technician
        const recordsSnap = await firestore()
          .collection('healthRecords')
          .where('technicianId', '==', session.uid)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get();

        setRecentRecords(recordsSnap.docs.map(d => ({ id: d.id, ...d.data() } as HealthRecord)));
      } catch (e: any) {
        console.warn('Health records load error:', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <Animated.View style={[s.header, headerAnim]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Health Records</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={s.headerSubtitle}>{animals.length} animal{animals.length !== 1 ? 's' : ''} from your appointments</Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Animals from Appointments */}
        <Animated.View style={[s.section, contentAnim]}>
          <Text style={s.sectionTitle}>Animals (from Appointments)</Text>
          <Text style={s.sectionSubtitle}>Tap an animal to create a health record</Text>

          {animals.length === 0 ? (
            <View style={s.empty}>
              <Icon name="paw" size={40} color={Colors.textLight} />
              <Text style={s.emptyText}>No animals from appointments</Text>
              <Text style={s.emptySubtext}>Accept appointment requests to see animals here</Text>
            </View>
          ) : (
            animals.map((animal) => (
              <TouchableOpacity
                key={animal.appointmentId}
                style={s.animalCard}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/(technician)/dashboard/health-records/form',
                  params: {
                    animalId: animal.animalId,
                    animalName: animal.animalName,
                    farmerId: animal.farmerId,
                    farmerName: animal.farmerName,
                    serviceType: animal.serviceType,
                    animalPhoto: animal.animalPhoto,
                  },
                })}
              >
                <View style={s.dualAvatar}>
                  <Avatar name={animal.farmerName} imageUrl={animal.farmerPhoto} size={38} />
                  <Avatar name={animal.animalName} imageUrl={animal.animalPhoto || undefined} size={38} type="animal" />
                </View>
                <View style={s.animalInfo}>
                  <Text style={s.animalName}>{animal.animalName}</Text>
                  <Text style={s.animalService}>{animal.serviceType}</Text>
                  <View style={s.animalRow}>
                    <Icon name="farmer" size={12} color={Colors.textSecondary} />
                    <Text style={s.animalDetail}>{animal.farmerName}</Text>
                    <Text style={s.animalDot}>•</Text>
                    <Text style={s.animalDetail}>{formatDate(animal.date)}</Text>
                  </View>
                </View>
                <View style={s.addRecordBtn}>
                  <Icon name="plus" size={18} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>

        {/* Recent Records */}
        {recentRecords.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Recent Records</Text>
            {recentRecords.map((record) => {
              const typeStyle = TYPE_COLORS[record.recordType] || TYPE_COLORS.checkup;
              return (
                <View key={record.id} style={s.recordCard}>
                  <View style={[s.recordType, { backgroundColor: typeStyle.bg }]}>
                    <Text style={[s.recordTypeText, { color: typeStyle.color }]}>{record.recordType.replace('_', ' ')}</Text>
                  </View>
                  <Text style={s.recordAnimal}>{record.animalName}</Text>
                  <View style={s.recordFooter}>
                    <Text style={s.recordDiagnosis} numberOfLines={1}>{record.diagnosis || 'No diagnosis'}</Text>
                    <Text style={s.recordDate}>{formatTimestamp(record.date)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

import Animated from 'react-native-reanimated';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: FontSize.sm, color: Colors.accent, marginTop: 4, marginLeft: 36 },
  // Section
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  sectionSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  // Empty
  empty: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4 },
  // Animal Card
  animalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.light },
  dualAvatar: { flexDirection: 'row', alignItems: 'center', gap: -10 },
  animalInfo: { flex: 1, marginLeft: Spacing.md },
  animalName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  animalService: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 1 },
  animalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  animalDetail: { fontSize: FontSize.xs, color: Colors.textSecondary },
  animalDot: { fontSize: FontSize.xs, color: Colors.textLight },
  addRecordBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  // Record Card
  recordCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.light },
  recordType: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.full, marginBottom: Spacing.xs },
  recordTypeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  recordAnimal: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  recordFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  recordDiagnosis: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  recordDate: { fontSize: FontSize.xs, color: Colors.textLight },
});

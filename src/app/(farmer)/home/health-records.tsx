import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { getSession } from '@/services/sessionService';

interface Animal { id: string; name: string; breed: string; type: string; imageUrl?: string; healthStatus: string; lastCheckup?: string; vaccinationUpToDate?: boolean; }
interface Appointment { id: string; serviceType: string; animalName: string; animalId: string; date: string; status: string; technicianName: string; description?: string; }

export default function HealthRecordsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [records, setRecords] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }

      // Load animals
      const animalSnap = await firestore().collection('animals').where('ownerId', '==', session.uid).get();
      const animalData = animalSnap.docs.map(d => ({ id: d.id, ...d.data() } as Animal));
      setAnimals(animalData);

      // Load completed appointments as health records
      const recSnap = await firestore().collection(Collections.APPOINTMENTS)
        .where('farmerId', '==', session.uid)
        .where('status', '==', 'completed')
        .get();
      const recData = recSnap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
      recData.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setRecords(recData);

      setLoading(false);
    };
    load();
  }, []);

  const filteredRecords = selectedAnimal
    ? records.filter(r => r.animalId === selectedAnimal)
    : records;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getHealthColor = (status: string) => status === 'healthy' ? '#10B981' : status === 'sick' ? '#EF4444' : '#F59E0B';

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Health Records</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Animal Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        <TouchableOpacity style={[s.filterChip, !selectedAnimal && s.filterChipActive]} onPress={() => setSelectedAnimal(null)}>
          <Text style={[s.filterText, !selectedAnimal && s.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {animals.map(a => (
          <TouchableOpacity key={a.id} style={[s.filterChip, selectedAnimal === a.id && s.filterChipActive]} onPress={() => setSelectedAnimal(a.id)}>
            <Text style={[s.filterText, selectedAnimal === a.id && s.filterTextActive]}>{a.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {/* Animal Health Summary */}
        <Text style={s.sectionTitle}>Animal Health Status</Text>
        {animals.length === 0 && <Text style={s.emptyText}>No animals registered</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
          {animals.map(a => (
            <View key={a.id} style={s.animalCard}>
              {a.imageUrl ? (
                <Image source={{ uri: a.imageUrl }} style={s.animalImg} contentFit="cover" />
              ) : (
                <View style={[s.animalImg, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }]}><Icon name="paw" size={20} color={Colors.textLight} /></View>
              )}
              <Text style={s.animalName} numberOfLines={1}>{a.name}</Text>
              <View style={[s.healthDot, { backgroundColor: getHealthColor(a.healthStatus) }]} />
              <Text style={[s.healthLabel, { color: getHealthColor(a.healthStatus) }]}>{a.healthStatus}</Text>
              <View style={s.animalMeta}>
                {a.vaccinationUpToDate ? (
                  <View style={s.vaccBadge}><Icon name="check" size={10} color="#10B981" /><Text style={s.vaccText}>Vaccinated</Text></View>
                ) : (
                  <View style={[s.vaccBadge, { backgroundColor: '#FEF3C7' }]}><Icon name="alert" size={10} color="#F59E0B" /><Text style={[s.vaccText, { color: '#D97706' }]}>Due</Text></View>
                )}
              </View>
              {a.lastCheckup ? <Text style={s.lastCheckup}>Last: {formatDate(a.lastCheckup)}</Text> : null}
            </View>
          ))}
        </ScrollView>

        {/* Service History */}
        <Text style={[s.sectionTitle, { marginTop: Spacing.xl }]}>Service History</Text>
        {filteredRecords.length === 0 && (
          <View style={s.empty}>
            <Icon name="clipboard" size={40} color={Colors.textLight} />
            <Text style={s.emptyText}>No completed services yet</Text>
            <Text style={s.emptySubtext}>Completed appointments will show here as health records</Text>
          </View>
        )}
        {filteredRecords.map(r => (
          <View key={r.id} style={s.recordCard}>
            <View style={s.recordLeft}>
              <View style={s.recordIcon}><Icon name="check-circle" size={16} color="#10B981" /></View>
              <View style={s.recordLine} />
            </View>
            <View style={s.recordContent}>
              <Text style={s.recordDate}>{formatDate(r.date)}</Text>
              <Text style={s.recordService}>{r.serviceType}</Text>
              <Text style={s.recordAnimal}>{r.animalName}</Text>
              <Text style={s.recordTech}>By: {r.technicianName}</Text>
              {r.description ? <Text style={s.recordDesc}>{r.description}</Text> : null}
            </View>
          </View>
        ))}
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
  // List
  list: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  // Animal cards
  animalCard: { width: 120, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center', ...Shadow.light },
  animalImg: { width: 60, height: 60, borderRadius: 30 },
  animalName: { fontSize: 12, fontWeight: '700', color: Colors.text, marginTop: 6, textAlign: 'center' },
  healthDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  healthLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  animalMeta: { marginTop: 4 },
  vaccBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  vaccText: { fontSize: 9, fontWeight: '600', color: '#059669' },
  lastCheckup: { fontSize: 9, color: Colors.textLight, marginTop: 3 },
  // Empty
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.sm },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
  // Record timeline
  recordCard: { flexDirection: 'row', marginBottom: 4 },
  recordLeft: { alignItems: 'center', width: 30, marginRight: 12 },
  recordIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  recordLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 4 },
  recordContent: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.light },
  recordDate: { fontSize: 11, color: Colors.textSecondary },
  recordService: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginTop: 2 },
  recordAnimal: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 1 },
  recordTech: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  recordDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic', lineHeight: 18 },
});

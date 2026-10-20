import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import firestore from '@react-native-firebase/firestore';
import { AppText as Text } from '@/components/ui/FontScale';
import { Avatar, Icon } from '@/components/ui';
import { BorderRadius, Colors, FontSize, Shadow, Spacing } from '@/constants/theme';
import { Collections } from '@/services/firebase';

interface AvailabilitySlot { date?: string; dayOfWeek?: number; time: string; }
interface Technician {
  id: string;
  displayName: string;
  specialization?: string;
  expertise?: string[];
  photoURL?: string;
  location?: string;
  available?: boolean;
  availabilitySlots?: AvailabilitySlot[];
}

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function AvailableTechniciansPage() {
  const [technicians, setTechnicians] = useState<(Technician & { nextSlot: AvailabilitySlot })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    firestore().collection(Collections.USERS).where('role', '==', 'technician').where('status', '==', 'active').get()
      .then(snapshot => {
        const today = dateKey(new Date());
        setTechnicians(snapshot.docs.flatMap(doc => {
          const tech = { id: doc.id, ...doc.data() } as Technician;
          const nextSlot = (tech.availabilitySlots || []).flatMap(slot => {
            if (slot.date) return slot.date >= today ? [slot] : [];
            if (slot.dayOfWeek === undefined) return [];
            const nextDate = Array.from({ length: 7 }, (_, offset) => {
              const date = new Date();
              date.setDate(date.getDate() + offset);
              return date;
            }).find(date => date.getDay() === slot.dayOfWeek);
            return nextDate ? [{ date: dateKey(nextDate), time: slot.time }] : [];
          }).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
          return tech.available !== false && nextSlot ? [{ ...tech, nextSlot }] : [];
        }));
      })
      .catch(error => {
        console.warn('Available technicians load failed:', error);
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityLabel="Go back">
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Available Technicians</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View> : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {technicians.length === 0 ? (
            <View style={s.empty}>
              <Icon name="technician" size={42} color={Colors.textLight} />
              <Text style={s.emptyText}>{loadFailed ? 'Unable to load technicians' : 'No technicians with upcoming availability'}</Text>
            </View>
          ) : technicians.map(tech => (
            <View key={tech.id} style={s.card}>
              <Avatar name={tech.displayName} imageUrl={tech.photoURL} size={50} />
              <View style={s.cardInfo}>
                <Text style={s.cardName}>{tech.displayName}</Text>
                {!!(tech.expertise?.length || tech.specialization) && (
                  <Text style={s.cardSpec} numberOfLines={1}>{(tech.expertise || tech.specialization?.split(',').map(value => value.trim()) || []).join(' • ')}</Text>
                )}
                <View style={s.slotRow}>
                  <Icon name="calendar" size={14} color={Colors.primary} />
                  <Text style={s.slotText}>Next: {tech.nextSlot.date} at {tech.nextSlot.time}</Text>
                </View>
                {!!tech.location && <Text style={s.location}>{tech.location}</Text>}
              </View>
            </View>
          ))}
          <View style={s.bottomSpace} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  list: { padding: Spacing.lg, paddingBottom: 0 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: Colors.textLight, fontSize: FontSize.md, marginTop: Spacing.lg, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadow.light },
  cardInfo: { flex: 1, marginLeft: Spacing.md },
  cardName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  cardSpec: { color: Colors.primary, fontSize: FontSize.sm, marginTop: 2 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  slotText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  location: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 3 },
  bottomSpace: { height: 96 },
});

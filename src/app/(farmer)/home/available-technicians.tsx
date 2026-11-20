import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppText as Text } from '@/components/ui/FontScale';
import { Avatar, Icon } from '@/components/ui';
import { BorderRadius, Colors, FontSize, Shadow, Spacing } from '@/constants/theme';
import { getRelevantTechnicians } from '@/services/technicianDiscoveryService';
import { getNextAvailability, getTechnicianAvailability, type AvailabilitySlot, type TimeRange } from '@/utils/availability';

interface Technician {
  id: string;
  displayName: string;
  specialization?: string;
  expertise?: string[];
  photoURL?: string;
  location?: string;
  available?: boolean;
  availabilitySlots?: AvailabilitySlot[];
  alwaysAvailable?: TimeRange[] | TimeRange;
  alwaysAvailableEnabled?: boolean;
}

export default function AvailableTechniciansPage() {
  const [technicians, setTechnicians] = useState<(Technician & { nextAvailability: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(useCallback(() => {
    let active = true;
    const clock = setInterval(() => setNow(new Date()), 30_000);
    setNow(new Date());
    setLoading(true);
    setLoadFailed(false);
    getRelevantTechnicians()
      .then(records => {
        if (!active) return;
        setTechnicians((records || []).flatMap(tech => {
          const nextAvailability = getNextAvailability(tech);
          return nextAvailability ? [{ ...tech, nextAvailability }] : [];
        }));
      })
      .catch(error => {
        console.warn('Available technicians load failed:', error);
        if (active) setLoadFailed(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; clearInterval(clock); };
  }, []));

  const currentlyAvailable = technicians.filter(tech => getTechnicianAvailability(tech, now).status === 'Available Now');

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
          {currentlyAvailable.length === 0 ? (
            <View style={s.empty}>
              <Icon name="technician" size={42} color={Colors.textLight} />
              <Text style={s.emptyText}>{loadFailed ? 'Unable to load technicians' : 'No technicians available right now'}</Text>
            </View>
          ) : currentlyAvailable.map(tech => (
            <TouchableOpacity
              key={tech.id}
              style={s.card}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`View ${tech.displayName} profile and request service`}
              onPress={() => router.push({ pathname: '/(farmer)/home/technicians', params: { technicianId: tech.id, returnToAvailable: 'true' } })}
            >
              <Avatar name={tech.displayName} imageUrl={tech.photoURL} size={50} />
              <View style={s.cardInfo}>
                <Text style={s.cardName}>{tech.displayName}</Text>
                {!!(tech.expertise?.length || tech.specialization) && (
                  <Text style={s.cardSpec} numberOfLines={1}>{(tech.expertise || tech.specialization?.split(',').map(value => value.trim()) || []).join(' • ')}</Text>
                )}
                <View style={s.slotRow}>
                  <Icon name="calendar" size={14} color={Colors.primary} />
                  <Text style={s.slotText}>{tech.nextAvailability}</Text>
                </View>
                {!!tech.location && <Text style={s.location}>{tech.location}</Text>}
              </View>
              <Icon name="chevron-right" size={20} color={Colors.textLight} />
            </TouchableOpacity>
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

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';

interface ScheduleItem {
  id: string;
  serviceType: string;
  animalName: string;
  farmerName: string;
  date: string;
  time: string;
  status: string;
  location?: string;
}

export default function TechScheduleScreen() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const headerAnim = useFadeIn(100);
  const contentAnim = useFadeInUp(200);

  // Generate next 7 days
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        dateStr: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('en-PH', { weekday: 'short' }),
        date: d.getDate(),
        isToday: i === 0,
      });
    }
    return dates;
  };

  const weekDates = getWeekDates();

  useEffect(() => {
    setSelectedDate(weekDates[0].dateStr);
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    let unsub: () => void = () => {};
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }

      unsub = firestore()
        .collection(Collections.APPOINTMENTS)
        .where('technicianId', '==', session.uid)
        .where('status', '==', 'confirmed')
        .where('date', '==', selectedDate)
        .onSnapshot(
          (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleItem));
            // Sort by time
            data.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            setSchedule(data);
            setLoading(false);
          },
          () => setLoading(false)
        );
    };
    load();
    return () => unsub();
  }, [selectedDate]);

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <Animated.View style={[s.header, headerAnim]}>
        <Text style={s.headerTitle}>My Schedule</Text>
        <Text style={s.headerSubtitle}>{formatDateLabel(selectedDate)}</Text>
      </Animated.View>

      {/* Week Day Selector */}
      <View style={s.weekRow}>
        {weekDates.map((wd) => (
          <TouchableOpacity
            key={wd.dateStr}
            style={[s.dayItem, selectedDate === wd.dateStr && s.dayItemActive]}
            onPress={() => { setLoading(true); setSelectedDate(wd.dateStr); }}
          >
            <Text style={[s.dayLabel, selectedDate === wd.dateStr && s.dayLabelActive]}>{wd.day}</Text>
            <Text style={[s.dayDate, selectedDate === wd.dateStr && s.dayDateActive]}>{wd.date}</Text>
            {wd.isToday && <View style={s.todayDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Schedule List */}
      <Animated.View style={[{ flex: 1 }, contentAnim]}>
        {loading ? (
          <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : (
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {schedule.length === 0 ? (
              <View style={s.empty}>
                <Icon name="calendar" size={48} color={Colors.textLight} />
                <Text style={s.emptyText}>No appointments scheduled</Text>
                <Text style={s.emptySubtext}>Your confirmed visits will appear here</Text>
              </View>
            ) : (
              schedule.map((item, index) => (
                <View key={item.id} style={s.card}>
                  <View style={s.timeCol}>
                    <Text style={s.timeText}>{item.time || '--:--'}</Text>
                  </View>
                  <View style={s.cardContent}>
                    <Text style={s.cardService}>{item.serviceType}</Text>
                    <Text style={s.cardAnimal}>{item.animalName}</Text>
                    <View style={s.cardRow}>
                      <Icon name="profile" size={14} color={Colors.textSecondary} />
                      <Text style={s.cardFarmer}>{item.farmerName}</Text>
                    </View>
                    {item.location ? (
                      <View style={s.cardRow}>
                        <Icon name="location" size={14} color={Colors.textSecondary} />
                        <Text style={s.cardLocation}>{item.location}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={s.statusDot} />
                </View>
              ))
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  headerSubtitle: { fontSize: FontSize.md, color: Colors.accent, marginTop: 4 },
  // Week selector
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.sm, backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: -Spacing.md, borderRadius: BorderRadius.xl, ...Shadow.medium },
  dayItem: { alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md, minWidth: 42 },
  dayItemActive: { backgroundColor: Colors.primary },
  dayLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
  dayLabelActive: { color: Colors.white },
  dayDate: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginTop: 4 },
  dayDateActive: { color: Colors.white },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 4 },
  // List
  list: { flex: 1, paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4 },
  // Card
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.light },
  timeCol: { width: 60, alignItems: 'center', borderRightWidth: 2, borderRightColor: Colors.primary, paddingRight: Spacing.md, marginRight: Spacing.md },
  timeText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  cardContent: { flex: 1 },
  cardService: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardAnimal: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardFarmer: { fontSize: FontSize.xs, color: Colors.textSecondary },
  cardLocation: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' },
});

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { AppText as Text } from '@/components/ui/FontScale';
import { Icon } from '@/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { TimePickerModal } from '@/components/ui/TimePickerModal';
import { getSession } from '@/services/sessionService';
import firestore from '@react-native-firebase/firestore';
import { Collections } from '@/services/firebase';

interface AvailabilitySlot { date?: string; dayOfWeek?: number; time: string; }
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function TechnicianAvailabilityPage() {
  const [available, setAvailable] = useState(true);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [availabilityDate, setAvailabilityDate] = useState(new Date(Date.now() + 86400000));
  const [availabilityTime, setAvailabilityTime] = useState('08:00 AM');
  const [weeklyMode, setWeeklyMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [dateModal, setDateModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAvailability = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) return;
      const userDoc = await firestore().collection(Collections.USERS).doc(session.uid).get();
      if (!userDoc.exists) return;
      const data = userDoc.data();
      if (data?.available !== undefined) setAvailable(data.available);
      if (Array.isArray(data?.availabilitySlots)) setAvailabilitySlots(data.availabilitySlots);
    } catch (error) {
      console.warn('Availability load error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAvailability(); }, [loadAvailability]));

  const toggleAvailability = async (newStatus: boolean) => {
    try {
      const session = await getSession();
      if (!session) return;
      await firestore().collection(Collections.USERS).doc(session.uid).update({ available: newStatus });
      setAvailable(newStatus);
    } catch (error) {
      console.warn('Toggle availability error:', error);
    }
  };

  const addAvailabilitySlot = async (date: Date, time: string) => {
    try {
      const session = await getSession();
      if (!session) return;
      const slot = { date: dateKey(date), time };
      if (availabilitySlots.some(item => item.date === slot.date && item.time === slot.time)) return;
      await firestore().collection(Collections.USERS).doc(session.uid).update({
        availabilitySlots: firestore.FieldValue.arrayUnion(slot),
      });
      setAvailabilitySlots(current => [...current, slot]);
    } catch (error) {
      console.warn('Add availability slot error:', error);
    }
  };

  const addWeeklyAvailability = async (time: string) => {
    try {
      const session = await getSession();
      if (!session || selectedDays.length === 0) return;
      const slots = selectedDays.map(dayOfWeek => ({ dayOfWeek, time }));
      const newSlots = slots.filter(slot => !availabilitySlots.some(item => item.dayOfWeek === slot.dayOfWeek && item.time === slot.time));
      if (newSlots.length === 0) return;
      await firestore().collection(Collections.USERS).doc(session.uid).update({
        availabilitySlots: firestore.FieldValue.arrayUnion(...newSlots),
      });
      setAvailabilitySlots(current => [...current, ...newSlots]);
    } catch (error) {
      console.warn('Add weekly availability error:', error);
    }
  };

  const removeAvailabilitySlot = async (slot: AvailabilitySlot) => {
    try {
      const session = await getSession();
      if (!session) return;
      await firestore().collection(Collections.USERS).doc(session.uid).update({
        availabilitySlots: firestore.FieldValue.arrayRemove(slot),
      });
      setAvailabilitySlots(current => current.filter(item => item.date !== slot.date || item.dayOfWeek !== slot.dayOfWeek || item.time !== slot.time));
    } catch (error) {
      console.warn('Remove availability slot error:', error);
    }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton}>
          <Icon name="chevron-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>My Availability</Text>
          <Text style={styles.subtitle}>Set when farmers can request your service.</Text>
        </View>
      </View>
      <View style={styles.statusCard}>
        <View style={styles.statusCopy}>
          <View style={[styles.statusIcon, available ? styles.statusIconOn : styles.statusIconOff]}>
            <Icon name={available ? 'check-circle' : 'close'} size={20} color={available ? Colors.primary : Colors.error} />
          </View>
          <View style={styles.statusTextBlock}>
            <Text style={styles.statusTitle}>{available ? 'Accepting requests' : 'Not accepting requests'}</Text>
            <Text style={styles.statusHint}>{available ? 'Farmers can find and request you.' : 'Your profile is hidden from new requests.'}</Text>
          </View>
        </View>
        <Switch value={available} onValueChange={toggleAvailability} trackColor={{ false: Colors.border, true: '#A5D6A7' }} thumbColor={available ? Colors.primary : '#F4F3F4'} />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Your schedule</Text>
          <Text style={styles.sectionHint}>Manage your available dates and hours.</Text>
        </View>
        <View style={styles.countBadge}><Text style={styles.countText}>{availabilitySlots.length}</Text></View>
      </View>

      {availabilitySlots.length ? availabilitySlots.map(slot => (
        <View key={`${slot.date || slot.dayOfWeek}-${slot.time}`} style={styles.slotCard}>
          <View style={styles.slotIcon}><Icon name="calendar" size={20} color={Colors.primary} /></View>
          <View style={styles.slotCopy}>
            <Text style={styles.slotTitle}>{slot.date ? new Date(`${slot.date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : `Every ${WEEKDAYS[slot.dayOfWeek ?? 0]}`}</Text>
            <View style={styles.slotTime}><Icon name="clock" size={14} color={Colors.textSecondary} /><Text style={styles.slotTimeText}>{slot.time}</Text></View>
          </View>
          <TouchableOpacity onPress={() => removeAvailabilitySlot(slot)} accessibilityRole="button" accessibilityLabel="Remove availability" style={styles.removeButton}>
            <Icon name="close" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      )) : (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Icon name="calendar" size={24} color={Colors.textSecondary} /></View>
          <Text style={styles.emptyTitle}>No schedule added</Text>
          <Text style={styles.emptyHint}>Add dates or set your regular weekday hours.</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionCard} onPress={() => { setWeeklyMode(false); setDateModal(true); }} activeOpacity={0.75}>
          <View style={styles.actionIcon}><Icon name="plus" size={18} color={Colors.primary} /></View>
          <Text style={styles.actionTitle}>Add a date</Text>
          <Text style={styles.actionHint}>One-time availability</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => setWeeklyMode(value => !value)} activeOpacity={0.75}>
          <View style={styles.actionIcon}><Icon name="calendar" size={18} color={Colors.primary} /></View>
          <Text style={styles.actionTitle}>{weeklyMode ? 'Close weekdays' : 'Set weekdays'}</Text>
          <Text style={styles.actionHint}>Choose recurring hours</Text>
        </TouchableOpacity>
      </View>

      {weeklyMode && <View style={styles.weeklyCard}>
          <Text style={styles.weeklyTitle}>Weekly availability</Text>
          <Text style={styles.sectionHint}>Select the days you are available.</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.slice(1, 6).map((day, index) => {
              const dayOfWeek = index + 1;
              const selected = selectedDays.includes(dayOfWeek);
              return <TouchableOpacity key={day} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setSelectedDays(current => selected ? current.filter(value => value !== dayOfWeek) : [...current, dayOfWeek])} style={[styles.weekdayButton, selected && styles.weekdayButtonActive]}>
                <Text style={[styles.weekdayText, selected && styles.weekdayTextActive]}>{day}</Text>
              </TouchableOpacity>;
            })}
          </View>
          <TouchableOpacity style={styles.weeklyAddButton} onPress={() => setTimeModal(true)}>
            <Icon name="clock" size={18} color={Colors.white} />
            <Text style={styles.weeklyAddText}>Choose time for selected days</Text>
          </TouchableOpacity>
      </View>}
      <DatePickerModal visible={dateModal} value={availabilityDate} minimumDate={new Date()} onConfirm={date => { setAvailabilityDate(date); setDateModal(false); setTimeModal(true); }} onCancel={() => setDateModal(false)} />
      <TimePickerModal visible={timeModal} value={availabilityTime} onConfirm={time => { setAvailabilityTime(time); setTimeModal(false); weeklyMode ? addWeeklyAvailability(time) : addAvailabilitySlot(availabilityDate, time); }} onCancel={() => setTimeModal(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  backButton: { width: 42, height: 42, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  headerCopy: { flex: 1 },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 3 },
  statusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl },
  statusCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginRight: Spacing.sm },
  statusIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  statusIconOn: { backgroundColor: '#E8F5E9' },
  statusIconOff: { backgroundColor: '#FFEBEE' },
  statusTextBlock: { flex: 1 },
  statusTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  statusHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  sectionHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  countBadge: { minWidth: 32, height: 32, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: Spacing.sm },
  countText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
  slotCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  slotIcon: { width: 42, height: 42, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', marginRight: Spacing.md },
  slotCopy: { flex: 1 },
  slotTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  slotTime: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  slotTimeText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  removeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.full, backgroundColor: '#FFEBEE', marginLeft: Spacing.sm },
  emptyCard: { alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  emptyIcon: { width: 48, height: 48, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, marginBottom: Spacing.sm },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  emptyHint: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  actionCard: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  actionIcon: { width: 36, height: 36, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', marginBottom: Spacing.sm },
  actionTitle: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '700' },
  actionHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  weeklyCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.md },
  weeklyTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  weekdayRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  weekdayButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.white },
  weekdayButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  weekdayText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  weekdayTextActive: { color: Colors.white, fontWeight: '700' },
  weeklyAddButton: { flexDirection: 'row', minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, marginTop: Spacing.lg },
  weeklyAddText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
});

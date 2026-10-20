import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import Animated from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';
import { getOrCreateChatRoom } from '@/services/chatService';
interface ScheduleItem {
  id: string;
  serviceType: string;
  animalName: string;
  farmerName: string;
  date: string;
  time: string;
  status: string;
  location?: string;
  description?: string;
  farmerId?: string;
}
type DateStatus = 'overdue' | 'today' | 'upcoming';
const STATUS_CONFIG: Record<DateStatus, { color: string; bg: string; label: string; icon: string }> = {
  overdue: { color: '#EF4444', bg: '#FEE2E2', label: 'Overdue', icon: 'alert' },
  today: { color: '#F59E0B', bg: '#FEF3C7', label: 'Today', icon: 'clock' },
  upcoming: { color: '#10B981', bg: '#D1FAE5', label: 'Upcoming', icon: 'calendar' },
};
export default function TechScheduleScreen() {
  const [appointments, setAppointments] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const headerAnim = useFadeIn(100);
  const calendarAnim = useFadeInUp(200);
  const listAnim = useFadeInUp(400);
  // Dates that have appointments (for calendar dots)
  const [appointmentDates, setAppointmentDates] = useState<Set<string>>(new Set());
  useEffect(() => {
    let unsub: () => void = () => {};
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);
      // Listen to confirmed/accepted appointments for this technician
      unsub = firestore()
        .collection(Collections.APPOINTMENTS)
        .where('technicianId', '==', session.uid)
        .where('status', '==', 'confirmed')
        .onSnapshot(
          (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleItem));
            data.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
            setAppointments(data);
            // Build set of dates with appointments
            const dates = new Set<string>();
            data.forEach(a => { if (a.date) dates.add(a.date); });
            setAppointmentDates(dates);
            setLoading(false);
          },
          (error) => {
            console.error('Schedule load error:', error);
            setLoading(false);
          }
        );
    };
    load();
    return () => unsub();
  }, []);
  // Get today string
  const today = new Date().toISOString().split('T')[0];
  // Determine date status
  const getDateStatus = (dateStr: string): DateStatus => {
    if (!dateStr) return 'upcoming';
    if (dateStr < today) return 'overdue';
    if (dateStr === today) return 'today';
    return 'upcoming';
  };
  // Filter appointments by selected date (or show all if no date selected)
  const filteredAppointments = selectedDate
    ? appointments.filter(a => a.date === selectedDate)
    : appointments;
  // Group appointments by status
  const overdueAppts = filteredAppointments.filter(a => getDateStatus(a.date) === 'overdue');
  const todayAppts = filteredAppointments.filter(a => getDateStatus(a.date) === 'today');
  const upcomingAppts = filteredAppointments.filter(a => getDateStatus(a.date) === 'upcoming');
  // Calendar helpers
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth, year, month };
  };
  const { firstDay, daysInMonth, year, month } = getMonthDays(currentMonth);
  const monthLabel = currentMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const prevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };
  const formatDateStr = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${m}-${dd}`;
  };
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
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
          <Text style={s.headerTitle}>My Schedule</Text>
          <Text style={s.headerSubtitle}>{appointments.length} accepted appointment{appointments.length !== 1 ? 's' : ''}</Text>
        </View>
      </Animated.View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <Animated.View style={[s.calendarCard, calendarAnim]}>
          {/* Month Navigation */}
          <View style={s.monthRow}>
            <TouchableOpacity onPress={prevMonth} style={s.monthBtn}>
              <Icon name="chevron-right" size={20} color={Colors.text} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={s.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity onPress={nextMonth} style={s.monthBtnRight}>
              <Icon name="chevron-right" size={20} color={Colors.text} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          {/* Day Headers */}
          <View style={s.dayHeaderRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <Text key={d} style={s.dayHeader}>{d}</Text>
            ))}
          </View>
          {/* Calendar Grid */}
          <View style={s.calendarGrid}>
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={s.dayCell} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDateStr(day);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const hasAppointment = appointmentDates.has(dateStr);
              const isOverdue = hasAppointment && dateStr < today;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    s.dayCell,
                    isToday && s.todayCell,
                    isSelected && s.selectedCell,
                  ]}
                  onPress={() => setSelectedDate(selectedDate === dateStr ? '' : dateStr)}
                  activeOpacity={0.6}
                >
                  <Text style={[
                    s.dayText,
                    isToday && s.todayText,
                    isSelected && s.selectedText,
                  ]}>
                    {day}
                  </Text>
                  {hasAppointment && (
                    <View style={[s.dot, isOverdue ? s.dotOverdue : isToday && dateStr === today ? s.dotToday : s.dotUpcoming]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Legend */}
          <View style={s.legend}>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#EF4444' }]} /><Text style={s.legendText}>Overdue</Text></View>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#F59E0B' }]} /><Text style={s.legendText}>Today</Text></View>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#10B981' }]} /><Text style={s.legendText}>Upcoming</Text></View>
          </View>
          {/* Selected date label */}
          {selectedDate ? (
            <TouchableOpacity style={s.selectedLabel} onPress={() => setSelectedDate('')}>
              <Text style={s.selectedLabelText}>Showing: {formatDisplayDate(selectedDate)}</Text>
              <Icon name="close" size={14} color={Colors.primary} />
            </TouchableOpacity>
          ) : null}
        </Animated.View>
        {/* Appointments List */}
        <Animated.View style={[s.listSection, listAnim]}>
          {filteredAppointments.length === 0 ? (
            <View style={s.empty}>
              <Icon name="calendar" size={48} color={Colors.textLight} />
              <Text style={s.emptyText}>{selectedDate ? 'No appointments on this date' : 'No accepted appointments yet'}</Text>
              <Text style={s.emptySubtext}>Accept requests to see them here</Text>
            </View>
          ) : (
            <>
              {/* Overdue */}
              {overdueAppts.length > 0 && (
                <View style={s.group}>
                  <View style={s.groupHeader}>
                    <Icon name="alert" size={16} color="#EF4444" />
                    <Text style={[s.groupTitle, { color: '#EF4444' }]}>Overdue ({overdueAppts.length})</Text>
                  </View>
                  {overdueAppts.map(a => <AppointmentCard key={a.id} item={a} status="overdue" technicianId={uid} />)}
                </View>
              )}
              {/* Today */}
              {todayAppts.length > 0 && (
                <View style={s.group}>
                  <View style={s.groupHeader}>
                    <Icon name="clock" size={16} color="#F59E0B" />
                    <Text style={[s.groupTitle, { color: '#F59E0B' }]}>Today ({todayAppts.length})</Text>
                  </View>
                  {todayAppts.map(a => <AppointmentCard key={a.id} item={a} status="today" technicianId={uid} />)}
                </View>
              )}
              {/* Upcoming */}
              {upcomingAppts.length > 0 && (
                <View style={s.group}>
                  <View style={s.groupHeader}>
                    <Icon name="calendar" size={16} color="#10B981" />
                    <Text style={[s.groupTitle, { color: '#10B981' }]}>Upcoming ({upcomingAppts.length})</Text>
                  </View>
                  {upcomingAppts.map(a => <AppointmentCard key={a.id} item={a} status="upcoming" technicianId={uid} />)}
                </View>
              )}
            </>
          )}
        </Animated.View>
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}
// Appointment Card Component
interface AppointmentCardProps { item: ScheduleItem; status: DateStatus; technicianId: string; }
const AppointmentCard: React.FC<AppointmentCardProps> = ({ item, status, technicianId }) => {
  const handleMessage = async () => {
    if (!item.farmerId || !technicianId) return;
    try {
      const chatId = await getOrCreateChatRoom(technicianId, item.farmerId);
      router.push({ pathname: '/(technician)/messages/chat', params: { chatId, otherUserId: item.farmerId, otherUserName: item.farmerName, otherPhoto: '' } });
    } catch (e) {
      console.warn('Failed to open chat:', e);
    }
  };
  const config = STATUS_CONFIG[status];
  return (
    <View style={[s.card, { borderLeftColor: config.color }]}>
      <View style={s.cardTop}>
        <View style={[s.statusBadge, { backgroundColor: config.bg }]}>
          <Icon name={config.icon as any} size={12} color={config.color} />
          <Text style={[s.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
        <Text style={s.cardTime}>{item.time || '--:--'}</Text>
      </View>
      <Text style={s.cardService}>{item.serviceType}</Text>
      <View style={s.cardInfoRow}>
        <Icon name="paw" size={13} color={Colors.primary} />
        <Text style={s.cardInfoText}>{item.animalName}</Text>
      </View>
      <View style={s.cardInfoRow}>
        <Icon name="farmer" size={13} color={Colors.textSecondary} />
        <Text style={s.cardInfoText}>{item.farmerName}</Text>
      </View>
      {item.location ? (
        <View style={s.cardInfoRow}>
          <Icon name="location" size={13} color={Colors.textSecondary} />
          <Text style={s.cardInfoText}>{item.location}</Text>
        </View>
      ) : null}
      <Text style={s.cardDate}>{new Date(item.date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
      {/* Message Button */}
      <TouchableOpacity style={s.messageBtn} onPress={handleMessage} activeOpacity={0.7}>
        <Icon name="messages" size={16} color={Colors.white} />
        <Text style={s.messageBtnText}>Message Farmer</Text>
      </TouchableOpacity>
    </View>
  );
};
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl },
  backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  headerSubtitle: { fontSize: FontSize.md, color: Colors.accent, marginTop: 4 },
  // Calendar
  calendarCard: { backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.medium },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  monthBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  monthBtnRight: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  monthLabel: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  dayHeaderRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  todayCell: { backgroundColor: '#E8F5E9', borderRadius: 20 },
  selectedCell: { backgroundColor: Colors.primary, borderRadius: 20 },
  dayText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  todayText: { color: Colors.primary, fontWeight: '700' },
  selectedText: { color: Colors.white, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3, position: 'absolute', bottom: 4 },
  dotOverdue: { backgroundColor: '#EF4444' },
  dotToday: { backgroundColor: '#F59E0B' },
  dotUpcoming: { backgroundColor: '#10B981' },
  // Legend
  legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 0.5, borderTopColor: Colors.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  // Selected label
  selectedLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.sm, paddingVertical: 6, backgroundColor: '#E8F5E9', borderRadius: BorderRadius.full },
  selectedLabelText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  // List
  listSection: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4 },
  // Groups
  group: { marginBottom: Spacing.lg },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  groupTitle: { fontSize: FontSize.md, fontWeight: '700' },
  // Card
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, borderLeftWidth: 4, ...Shadow.light },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardTime: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  cardService: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardInfoText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  cardDate: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: Spacing.sm, fontStyle: 'italic' },
  messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  messageBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
});

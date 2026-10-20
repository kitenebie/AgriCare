import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import { Colors, FontSize, BorderRadius, Spacing } from '@/constants/theme';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({ visible, value, minimumDate, onConfirm, onCancel }) => {
  const [viewDate, setViewDate] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const [selected, setSelected] = useState(value);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = minimumDate ? new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate()) : null;

  // First day of month (0=Sun)
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    if (minDate && prev < new Date(minDate.getFullYear(), minDate.getMonth(), 1)) return;
    setViewDate(prev);
  };
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isDisabled = (day: number) => {
    if (!minDate) return false;
    const d = new Date(year, month, day);
    return d < minDate;
  };

  const isToday = (day: number) => {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  const isSelected = (day: number) => {
    return selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;
  };

  const handleSelect = (day: number) => {
    if (isDisabled(day)) return;
    setSelected(new Date(year, month, day));
  };

  const formatHeader = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[selected.getDay()]}, ${MONTHS[selected.getMonth()].slice(0, 3)} ${selected.getDate()}`;
  };

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Green Header */}
          <View style={s.header}>
            <Text style={s.headerLabel}>SELECT DATE</Text>
            <Text style={s.headerDate}>{formatHeader()}</Text>
          </View>

          {/* Month Navigation */}
          <View style={s.monthRow}>
            <Text style={s.monthText}>{MONTHS[month]} {year}</Text>
            <View style={s.navRow}>
              <TouchableOpacity onPress={prevMonth} style={s.navBtn}><Text style={s.navArrow}>‹</Text></TouchableOpacity>
              <TouchableOpacity onPress={nextMonth} style={s.navBtn}><Text style={s.navArrow}>›</Text></TouchableOpacity>
            </View>
          </View>

          {/* Day Headers */}
          <View style={s.daysRow}>
            {DAYS.map((d, i) => <Text key={i} style={s.dayHeader}>{d}</Text>)}
          </View>

          {/* Calendar Grid */}
          <View style={s.grid}>
            {cells.map((day, i) => (
              <TouchableOpacity key={i} style={s.cell} disabled={!day || isDisabled(day)} onPress={() => day && handleSelect(day)}>
                {day ? (
                  <View style={[s.dayCircle, isSelected(day) && s.dayCircleSelected, isToday(day) && !isSelected(day) && s.dayCircleToday]}>
                    <Text style={[s.dayText, isSelected(day) && s.dayTextSelected, isDisabled(day) && s.dayTextDisabled, isToday(day) && !isSelected(day) && s.dayTextToday]}>{day}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity onPress={onCancel} style={s.actionBtn}><Text style={s.actionText}>CANCEL</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(selected)} style={s.actionBtn}><Text style={s.actionText}>OK</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const CELL_SIZE = (Dimensions.get('window').width - 80) / 7;

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, width: '100%', overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  // Header
  header: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  headerLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 6 },
  headerDate: { fontSize: 28, fontWeight: '700', color: '#fff' },
  // Month nav
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  monthText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  navRow: { flexDirection: 'row', gap: 8 },
  navBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  navArrow: { fontSize: 22, color: Colors.text, fontWeight: '600' },
  // Day headers
  daysRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
  dayHeader: { width: CELL_SIZE, textAlign: 'center', fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 12 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center' },
  dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dayCircleSelected: { backgroundColor: Colors.primary },
  dayCircleToday: { borderWidth: 1.5, borderColor: Colors.text },
  dayText: { fontSize: 14, color: Colors.text },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  dayTextDisabled: { color: '#D1D5DB' },
  dayTextToday: { fontWeight: '700' },
  // Actions
  actions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  actionText: { fontSize: 14, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
});

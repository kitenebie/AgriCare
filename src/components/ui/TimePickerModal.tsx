import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import { Colors, FontSize, BorderRadius, Spacing } from '@/constants/theme';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ['00', '15', '30', '45'];

interface TimePickerModalProps {
  visible: boolean;
  value: string; // "09:00 AM"
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({ visible, value, onConfirm, onCancel }) => {
  // Parse initial value
  const parseTime = (v: string) => {
    const match = v.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) return { hour: parseInt(match[1]), minute: match[2], period: match[3].toUpperCase() as 'AM' | 'PM' };
    return { hour: 8, minute: '00', period: 'AM' as const };
  };

  const initial = parseTime(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial.period);

  const formatTime = () => `${hour.toString().padStart(2, '0')}:${minute} ${period}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerLabel}>SELECT TIME</Text>
            <Text style={s.headerTime}>{formatTime()}</Text>
          </View>

          {/* Hour */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Hour</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scrollRow}>
              {HOURS.map(h => (
                <TouchableOpacity key={h} style={[s.numBtn, hour === h && s.numBtnActive]} onPress={() => setHour(h)}>
                  <Text style={[s.numText, hour === h && s.numTextActive]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Minute */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Minute</Text>
            <View style={s.row}>
              {MINUTES.map(m => (
                <TouchableOpacity key={m} style={[s.numBtn, minute === m && s.numBtnActive]} onPress={() => setMinute(m)}>
                  <Text style={[s.numText, minute === m && s.numTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* AM/PM */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Period</Text>
            <View style={s.row}>
              <TouchableOpacity style={[s.periodBtn, period === 'AM' && s.periodBtnActive]} onPress={() => setPeriod('AM')}>
                <Text style={[s.periodText, period === 'AM' && s.periodTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.periodBtn, period === 'PM' && s.periodBtnActive]} onPress={() => setPeriod('PM')}>
                <Text style={[s.periodText, period === 'PM' && s.periodTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity onPress={onCancel} style={s.actionBtn}><Text style={s.actionText}>CANCEL</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(formatTime())} style={s.actionBtn}><Text style={s.actionText}>OK</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, width: '100%', overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  headerLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 6 },
  headerTime: { fontSize: 32, fontWeight: '700', color: '#fff' },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  scrollRow: { gap: 8, paddingBottom: 4 },
  row: { flexDirection: 'row', gap: 8 },
  numBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  numBtnActive: { backgroundColor: Colors.primary },
  numText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  numTextActive: { color: '#fff' },
  periodBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  periodTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 16 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  actionText: { fontSize: 14, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
});

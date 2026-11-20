import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { AppText as Text } from '@/components/ui/FontScale';
import { Icon } from '@/components/ui';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { TimePickerModal } from '@/components/ui/TimePickerModal';
import { getSession } from '@/services/sessionService';
import firestore from '@react-native-firebase/firestore';
import { Collections } from '@/services/firebase';
import { modalAlert } from '@/components/ui/ModalAlert';
import { hasTimeRangeConflict, hasTimeSlotConflict, isTimeRangeValid, normalizeTimeRanges, type TimeRange } from '@/utils/availability';

interface AvailabilitySlot { date?: string; dayOfWeek?: number; time?: string; startTime?: string; endTime?: string; }
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const getMonthCells = (date: Date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return [...Array(42)].map((_, index) => {
    const day = index - first.getDay() + 1;
    return day > 0 && day <= count ? new Date(date.getFullYear(), date.getMonth(), day) : null;
  });
};

export default function TechnicianAvailabilityPage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila';
  const [available, setAvailable] = useState(true);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [alwaysAvailable, setAlwaysAvailable] = useState<TimeRange[]>([]);
  const [alwaysAvailableEnabled, setAlwaysAvailableEnabled] = useState(false);
  const [dailyRequestLimit, setDailyRequestLimit] = useState('');
  const [savingDailyLimit, setSavingDailyLimit] = useState(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState(new Date(Date.now() + 86400000));
  const [availabilityTime, setAvailabilityTime] = useState('08:00 AM');
  const [oneTimeStart, setOneTimeStart] = useState('');
  const [oneTimeEnd, setOneTimeEnd] = useState('');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [setupType, setSetupType] = useState<'daily' | 'one-time' | 'weekly' | null>(null);
  const [setupModal, setSetupModal] = useState(false);
  const [setupDrawer, setSetupDrawer] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);
  const [rangePicker, setRangePicker] = useState<'start' | 'end' | 'oneStart' | 'oneEnd' | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAvailability = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) return;
      const userDoc = await firestore().collection(Collections.USERS).doc(session.uid).get();
      if (!userDoc.exists) return;
      const data = userDoc.data();
      if (data?.available !== undefined) setAvailable(data.available);
      const savedDailyLimit = data?.maxRequestsPerDay;
      setDailyRequestLimit(typeof savedDailyLimit === 'number' && Number.isInteger(savedDailyLimit) && savedDailyLimit > 0 ? String(savedDailyLimit) : '');
      if (Array.isArray(data?.availabilitySlots)) setAvailabilitySlots(data.availabilitySlots);
      const ranges = normalizeTimeRanges(data?.alwaysAvailable);
      setAlwaysAvailable(ranges);
      setAlwaysAvailableEnabled(ranges.length > 0 && data?.alwaysAvailableEnabled !== false);
      setRangeStart('');
      setRangeEnd('');
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

  const saveDailyRequestLimit = async () => {
    const value = dailyRequestLimit.trim() ? Number(dailyRequestLimit) : null;
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > 99)) {
      modalAlert('Invalid daily limit', 'Enter a whole number from 1 to 99, or leave it blank for no limit.');
      return;
    }
    setSavingDailyLimit(true);
    try {
      const session = await getSession();
      if (!session) return;
      await firestore().collection(Collections.USERS).doc(session.uid).update({
        maxRequestsPerDay: value ?? firestore.FieldValue.delete(),
      });
      modalAlert('Daily limit saved', value === null ? 'There is no daily request limit.' : `You can accept up to ${value} requests per day.`);
    } catch (error) {
      console.warn('Daily request limit update error:', error);
      modalAlert('Unable to save limit', 'Please try again.');
    } finally {
      setSavingDailyLimit(false);
    }
  };

  const addAlwaysAvailableRange = async () => {
    if (!rangeStart || !rangeEnd || !isTimeRangeValid(rangeStart, rangeEnd)) {
      modalAlert('Time range required', 'Choose different start and end times. The range may continue overnight.');
      return;
    }
    if (hasTimeRangeConflict(rangeStart, rangeEnd, { everyDay: true }, availabilitySlots, alwaysAvailable)) {
      modalAlert('Schedule conflict', 'This daily time range overlaps another availability range or time slot.');
      return;
    }
    try {
      const session = await getSession();
      if (!session) return;
      if (alwaysAvailable.some(range => range.startTime === rangeStart && range.endTime === rangeEnd)) return;
      const ranges = [...alwaysAvailable, { startTime: rangeStart, endTime: rangeEnd }];
      await firestore().collection(Collections.USERS).doc(session.uid).update({ alwaysAvailable: ranges, alwaysAvailableEnabled: true, timezone });
      setAlwaysAvailable(ranges);
      setAlwaysAvailableEnabled(true);
      setRangeStart('');
      setRangeEnd('');
    } catch (error) {
      console.warn('Always available update error:', error);
    }
  };

  const toggleAlwaysAvailable = async (enabled: boolean) => {
    if (enabled && !alwaysAvailable.length) return addAlwaysAvailableRange();
    try {
      const session = await getSession();
      if (!session) return;
      await firestore().collection(Collections.USERS).doc(session.uid).update({ alwaysAvailableEnabled: enabled, timezone });
      setAlwaysAvailableEnabled(enabled);
    } catch (error) {
      console.warn('Always available update error:', error);
    }
  };

  const removeAlwaysAvailableRange = async (index: number) => {
    try {
      const session = await getSession();
      if (!session) return;
      const ranges = alwaysAvailable.filter((_, rangeIndex) => rangeIndex !== index);
      const enabled = ranges.length > 0 && alwaysAvailableEnabled;
      await firestore().collection(Collections.USERS).doc(session.uid).update({ alwaysAvailable: ranges.length ? ranges : null, alwaysAvailableEnabled: enabled, timezone });
      setAlwaysAvailable(ranges);
      setAlwaysAvailableEnabled(enabled);
    } catch (error) {
      console.warn('Always available range removal error:', error);
    }
  };

  const addAvailabilityRange = async (date: Date, startTime: string, endTime: string) => {
    if (!isTimeRangeValid(startTime, endTime)) {
      modalAlert('Invalid time range', 'Choose different start and end times. The range may continue overnight.');
      return;
    }
    if (hasTimeRangeConflict(startTime, endTime, { date: dateKey(date) }, availabilitySlots, alwaysAvailableEnabled ? alwaysAvailable : [])) {
      modalAlert('Schedule conflict', 'This date and time range overlaps another availability range or time slot.');
      return;
    }
    try {
      const session = await getSession();
      if (!session) return;
      const slot = { date: dateKey(date), startTime, endTime };
      if (availabilitySlots.some(item => item.date === slot.date && item.startTime === startTime && item.endTime === endTime)) return;
      await firestore().collection(Collections.USERS).doc(session.uid).update({
        availabilitySlots: firestore.FieldValue.arrayUnion(slot),
        timezone,
      });
      setAvailabilitySlots(current => [...current, slot]);
      setOneTimeStart('');
      setOneTimeEnd('');
    } catch (error) {
      console.warn('Add availability range error:', error);
    }
  };

  const addWeeklyAvailability = async (time: string) => {
    try {
      const session = await getSession();
      if (!session || selectedDays.length === 0) return;
      const slots = selectedDays.map(dayOfWeek => ({ dayOfWeek, time }));
      const newSlots = slots.filter(slot => !availabilitySlots.some(item => item.dayOfWeek === slot.dayOfWeek && item.time === slot.time));
      if (newSlots.length === 0) return;
      if (newSlots.some(slot => hasTimeSlotConflict(time, slot.dayOfWeek, availabilitySlots, alwaysAvailableEnabled ? alwaysAvailable : []))) {
        modalAlert('Schedule conflict', 'This weekly time overlaps an existing availability range.');
        return;
      }
      await firestore().collection(Collections.USERS).doc(session.uid).update({
        availabilitySlots: firestore.FieldValue.arrayUnion(...newSlots),
        timezone,
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
        timezone,
      });
      setAvailabilitySlots(current => current.filter(item => item.date !== slot.date || item.dayOfWeek !== slot.dayOfWeek || item.time !== slot.time || item.startTime !== slot.startTime || item.endTime !== slot.endTime));
    } catch (error) {
      console.warn('Remove availability slot error:', error);
    }
  };

  const monthCells = getMonthCells(visibleMonth);
  const selectedDateSlots = availabilitySlots.filter(slot => slot.date === dateKey(availabilityDate));
  const selectedWeeklySlots = availabilitySlots.filter(slot => slot.dayOfWeek === availabilityDate.getDay());

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton}>
          <Icon name="chevron-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>My Availability</Text>
          <Text style={styles.subtitle}>Manage your schedule at a glance.</Text>
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
      <TouchableOpacity style={styles.setupButton} onPress={() => setSetupModal(true)}><Icon name="calendar" size={19} color={Colors.white} /><Text style={styles.setupButtonText}>Set up my availability</Text></TouchableOpacity>

      <View style={styles.limitCard}>
        <Text style={styles.limitTitle}>Maximum requests per day</Text>
        <Text style={styles.limitHint}>Set how many service requests you can accept each day. Leave blank for no limit.</Text>
        <View style={styles.limitRow}>
          <TextInput
            accessibilityLabel="Maximum accepted requests per day"
            style={styles.limitInput}
            value={dailyRequestLimit}
            onChangeText={value => setDailyRequestLimit(value.replace(/\D/g, '').slice(0, 2))}
            placeholder="No limit"
            keyboardType="number-pad"
            maxLength={2}
          />
          <TouchableOpacity accessibilityRole="button" style={[styles.limitSave, savingDailyLimit && styles.disabledButton]} onPress={saveDailyRequestLimit} disabled={savingDailyLimit}>
            {savingDailyLimit ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.limitSaveText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Text style={styles.monthTitle}>{visibleMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</Text>
          <View style={styles.monthActions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" style={styles.monthArrow} onPress={() => setVisibleMonth(month => new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Icon name="chevron-left" size={20} color={Colors.text} /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" style={styles.monthArrow} onPress={() => setVisibleMonth(month => new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Icon name="chevron-right" size={20} color={Colors.text} /></TouchableOpacity>
          </View>
        </View>
        <View style={styles.calendarGrid}>
          {WEEKDAYS.map(day => <View key={day} style={styles.calendarCell}><Text style={styles.weekdayLabel}>{day}</Text></View>)}
          {monthCells.map((date, index) => {
            const daySlots = date ? availabilitySlots.filter(slot => slot.date === dateKey(date) || slot.dayOfWeek === date.getDay()) : [];
            const hasDailyHours = !!date && alwaysAvailableEnabled && alwaysAvailable.length > 0;
            const selected = !!date && dateKey(date) === dateKey(availabilityDate);
            return <TouchableOpacity key={index} disabled={!date} onPress={() => date && setAvailabilityDate(date)} style={[styles.calendarCell, styles.dateCell, selected && styles.dateCellSelected]}>
              {date && <Text style={[styles.dateNumber, selected && styles.dateNumberSelected]}>{date.getDate()}</Text>}
              {(daySlots.length > 0 || hasDailyHours) && <View style={[styles.dateDot, selected && styles.dateDotSelected]} />}
            </TouchableOpacity>;
          })}
        </View>
        <View style={styles.calendarLegend}><View style={styles.dateDot} /><Text style={styles.sectionHint}>Availability scheduled</Text></View>
      </View>

      <View style={styles.agendaHeader}>
        <View><Text style={styles.sectionTitle}>{availabilityDate.toLocaleDateString('en-PH', { weekday: 'long' })}</Text><Text style={styles.sectionHint}>{availabilityDate.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</Text></View>
        <TouchableOpacity style={styles.todayButton} onPress={() => { const today = new Date(); setAvailabilityDate(today); setVisibleMonth(today); }}><Text style={styles.todayText}>Today</Text></TouchableOpacity>
      </View>
      {alwaysAvailableEnabled && alwaysAvailable.map((range, index) => <View key={`daily-${index}`} style={styles.agendaItem}><View style={styles.agendaDot} /><Text style={styles.agendaTime}>{range.startTime} – {range.endTime}</Text><Text style={styles.agendaLabel}>Daily</Text></View>)}
      {selectedDateSlots.map(slot => <View key={`date-${slot.date}-${slot.startTime}-${slot.endTime}-${slot.time}`} style={styles.agendaItem}><View style={styles.agendaDot} /><Text style={styles.agendaTime}>{slot.time || `${slot.startTime} – ${slot.endTime}`}</Text><Text style={styles.agendaLabel}>One-time</Text><TouchableOpacity onPress={() => removeAvailabilitySlot(slot)} accessibilityRole="button" accessibilityLabel="Remove availability" style={styles.agendaRemove}><Icon name="close" size={16} color={Colors.error} /></TouchableOpacity></View>)}
      {selectedWeeklySlots.map(slot => <View key={`weekly-${slot.dayOfWeek}-${slot.time}`} style={styles.agendaItem}><View style={styles.agendaDot} /><Text style={styles.agendaTime}>{slot.time || `${slot.startTime} – ${slot.endTime}`}</Text><Text style={styles.agendaLabel}>Weekly</Text><TouchableOpacity onPress={() => removeAvailabilitySlot(slot)} accessibilityRole="button" accessibilityLabel="Remove availability" style={styles.agendaRemove}><Icon name="close" size={16} color={Colors.error} /></TouchableOpacity></View>)}
      {!alwaysAvailableEnabled && !selectedDateSlots.length && !selectedWeeklySlots.length && <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Nothing scheduled</Text><Text style={styles.emptyHint}>Choose “Set up my availability” to add hours for this day.</Text></View>}
      <Modal visible={setupModal} transparent animationType="slide" onRequestClose={() => setSetupModal(false)}>
        <View style={styles.choiceOverlay}><TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSetupModal(false)} /><View style={[styles.choiceSheet, { height: Dimensions.get('window').height * 0.5 }]}>
          <View style={styles.drawerHandle} />
          <View style={styles.choiceHeader}><View style={styles.choiceHeadingCopy}><Text style={styles.choiceEyebrow}>SCHEDULE TYPE</Text><Text style={styles.choiceHeading}>Set up availability</Text><Text style={styles.drawerHint}>Choose how these hours should repeat.</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close schedule options" hitSlop={6} activeOpacity={0.7} onPress={() => setSetupModal(false)} style={styles.closeButton}><Icon name="close" size={22} color={Colors.primary} /></TouchableOpacity></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.choiceOptions}>
            {([
              ['daily', 'Daily hours', 'Available during these hours every day.'],
              ['one-time', 'One-time availability', 'Set hours for a specific date only.'],
              ['weekly', 'Weekly schedule', 'Repeat the same hours on selected weekdays.'],
            ] as const).map(([type, title, description]) => <TouchableOpacity key={type} accessibilityRole="button" style={styles.choiceRow} onPress={() => { setSetupType(type); if (type === 'weekly') { const days = [...new Set(availabilitySlots.filter(slot => slot.dayOfWeek !== undefined && !slot.date).map(slot => slot.dayOfWeek!))]; setSelectedDays(days.length ? days : [1, 2, 3, 4, 5]); } setSetupModal(false); setSetupDrawer(true); }}>
              <View style={styles.choiceIcon}><Icon name={type === 'daily' ? 'clock' : 'calendar'} size={19} color={Colors.primary} /></View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>{title}</Text><Text style={styles.choiceDescription}>{description}</Text></View><Icon name="chevron-right" size={18} color={Colors.primary} />
            </TouchableOpacity>)}
          </ScrollView>
        </View></View>
      </Modal>

      <Modal visible={setupDrawer} transparent animationType="slide" onRequestClose={() => setSetupDrawer(false)}>
        <View style={styles.drawerOverlay}><TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={() => setSetupDrawer(false)} /><View style={[styles.setupDrawer, { height: Dimensions.get('window').height * 0.95 }]}>
          <View style={styles.drawerHandle} /><View style={styles.drawerHeader}><View><Text style={styles.drawerTitle}>{setupType === 'daily' ? 'Daily hours' : setupType === 'weekly' ? 'Weekly schedule' : 'One-time availability'}</Text><Text style={styles.drawerHint}>{setupType === 'daily' ? 'Repeats every day until you turn it off.' : setupType === 'weekly' ? 'Choose weekdays and add available times.' : 'Choose a date and add each available time range.'}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close setup" hitSlop={6} activeOpacity={0.7} onPress={() => setSetupDrawer(false)} style={styles.closeButton}><Icon name="close" size={22} color={Colors.primary} /></TouchableOpacity></View>
          <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerContent} keyboardShouldPersistTaps="handled">
            {setupType === 'daily' && <>
              <View style={styles.drawerSwitchRow}><View style={styles.statusTextBlock}><Text style={styles.choiceTitle}>Use daily hours</Text><Text style={styles.sectionHint}>{alwaysAvailable.length ? 'Farmers can request you during these hours.' : 'Add a time range below to turn this on.'}</Text></View><Switch disabled={!alwaysAvailable.length} value={alwaysAvailableEnabled} onValueChange={toggleAlwaysAvailable} trackColor={{ false: Colors.border, true: '#A5D6A7' }} thumbColor={alwaysAvailableEnabled ? Colors.primary : '#F4F3F4'} /></View>
              {alwaysAvailable.map((range, index) => <View key={`${range.startTime}-${range.endTime}-${index}`} style={styles.savedRangeRow}><Icon name="clock" size={16} color={Colors.primary} /><Text style={styles.savedRangeText}>{range.startTime} – {range.endTime}</Text><TouchableOpacity onPress={() => removeAlwaysAvailableRange(index)} accessibilityRole="button" accessibilityLabel="Remove daily time range" style={styles.removeButton}><Icon name="close" size={18} color={Colors.error} /></TouchableOpacity></View>)}
              <Text style={styles.formLabel}>Add a time range</Text><View style={styles.rangeRow}><TouchableOpacity style={styles.rangeButton} onPress={() => setRangePicker('start')}><Text style={styles.rangeLabel}>START</Text><Text style={styles.rangeTime}>{rangeStart || 'Choose time'}</Text></TouchableOpacity><Icon name="chevron-right" size={18} color={Colors.textSecondary} /><TouchableOpacity style={styles.rangeButton} onPress={() => setRangePicker('end')}><Text style={styles.rangeLabel}>END</Text><Text style={styles.rangeTime}>{rangeEnd || 'Choose time'}</Text></TouchableOpacity></View>
              {rangeStart && rangeEnd && !isTimeRangeValid(rangeStart, rangeEnd) && <Text style={styles.rangeError}>End time must be later than start time.</Text>}{rangeStart && rangeEnd && isTimeRangeValid(rangeStart, rangeEnd) && <TouchableOpacity style={styles.weeklyAddButton} onPress={addAlwaysAvailableRange}><Icon name="plus" size={18} color={Colors.white} /><Text style={styles.weeklyAddText}>Add time range</Text></TouchableOpacity>}
            </>}
            {setupType === 'one-time' && <>
              <Text style={styles.formLabel}>1. Choose a date</Text><TouchableOpacity style={styles.dateSelectButton} onPress={() => setDateModal(true)}><Icon name="calendar" size={18} color={Colors.primary} /><Text style={styles.dateSelectText}>{availabilityDate.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text><Text style={styles.dateChangeText}>Change</Text></TouchableOpacity>
              <Text style={styles.formLabel}>2. Add a time range</Text><View style={styles.rangeRow}><TouchableOpacity style={styles.rangeButton} onPress={() => setRangePicker('oneStart')}><Text style={styles.rangeLabel}>START</Text><Text style={styles.rangeTime}>{oneTimeStart || 'Choose time'}</Text></TouchableOpacity><Icon name="chevron-right" size={18} color={Colors.textSecondary} /><TouchableOpacity style={styles.rangeButton} onPress={() => setRangePicker('oneEnd')}><Text style={styles.rangeLabel}>END</Text><Text style={styles.rangeTime}>{oneTimeEnd || 'Choose time'}</Text></TouchableOpacity></View>
              {oneTimeStart && oneTimeEnd && !isTimeRangeValid(oneTimeStart, oneTimeEnd) && <Text style={styles.rangeError}>End time must be later than start time.</Text>}{oneTimeStart && oneTimeEnd && isTimeRangeValid(oneTimeStart, oneTimeEnd) && <TouchableOpacity style={styles.weeklyAddButton} onPress={() => addAvailabilityRange(availabilityDate, oneTimeStart, oneTimeEnd)}><Icon name="plus" size={18} color={Colors.white} /><Text style={styles.weeklyAddText}>Add time range</Text></TouchableOpacity>}
              {selectedDateSlots.map(slot => <View key={`drawer-${slot.startTime}-${slot.endTime}-${slot.time}`} style={styles.savedRangeRow}><Icon name="clock" size={16} color={Colors.primary} /><Text style={styles.savedRangeText}>{slot.time || `${slot.startTime} – ${slot.endTime}`}</Text><TouchableOpacity onPress={() => removeAvailabilitySlot(slot)} accessibilityRole="button" accessibilityLabel="Remove time range" style={styles.removeButton}><Icon name="close" size={18} color={Colors.error} /></TouchableOpacity></View>)}
            </>}
            {setupType === 'weekly' && <>
              <Text style={styles.formLabel}>1. Select weekdays</Text><View style={styles.weekdayRow}>{WEEKDAYS.map((day, dayOfWeek) => { const selected = selectedDays.includes(dayOfWeek); return <TouchableOpacity key={day} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setSelectedDays(current => selected ? current.filter(value => value !== dayOfWeek) : [...current, dayOfWeek])} style={[styles.weekdayButton, selected && styles.weekdayButtonActive]}><Text style={[styles.weekdayText, selected && styles.weekdayTextActive]}>{day.slice(0, 1)}</Text></TouchableOpacity>; })}</View>
              <Text style={styles.formLabel}>2. Add a time</Text><TouchableOpacity disabled={!selectedDays.length} style={[styles.weeklyAddButton, !selectedDays.length && styles.disabledButton]} onPress={() => setTimeModal(true)}><Icon name="clock" size={18} color={Colors.white} /><Text style={styles.weeklyAddText}>{selectedDays.length ? 'Choose a time for selected days' : 'Select at least one weekday'}</Text></TouchableOpacity>
              {availabilitySlots.filter(slot => slot.dayOfWeek !== undefined).map(slot => <View key={`weekly-drawer-${slot.dayOfWeek}-${slot.time}`} style={styles.savedRangeRow}><Icon name="clock" size={16} color={Colors.primary} /><Text style={styles.savedRangeText}>{WEEKDAYS[slot.dayOfWeek ?? 0]} · {slot.time || `${slot.startTime} – ${slot.endTime}`}</Text><TouchableOpacity onPress={() => removeAvailabilitySlot(slot)} accessibilityRole="button" accessibilityLabel="Remove weekly time" style={styles.removeButton}><Icon name="close" size={18} color={Colors.error} /></TouchableOpacity></View>)}
            </>}
          </ScrollView>
        </View></View>
      </Modal>
      <DatePickerModal visible={dateModal} value={availabilityDate} minimumDate={new Date()} onConfirm={date => { setAvailabilityDate(date); setDateModal(false); setOneTimeStart(''); setOneTimeEnd(''); }} onCancel={() => setDateModal(false)} />
      <TimePickerModal key={rangePicker || (timeModal ? 'availability' : 'closed')} visible={timeModal || !!rangePicker} value={rangePicker === 'start' ? rangeStart || '08:00 AM' : rangePicker === 'end' ? rangeEnd || '05:00 PM' : rangePicker === 'oneStart' ? oneTimeStart || '08:00 AM' : rangePicker === 'oneEnd' ? oneTimeEnd || '10:00 AM' : availabilityTime} onConfirm={time => {
        if (rangePicker === 'start') { setRangeStart(time); setRangePicker(null); }
        else if (rangePicker === 'end') { setRangeEnd(time); setRangePicker(null); }
        else if (rangePicker === 'oneStart') { setOneTimeStart(time); setRangePicker(null); }
        else if (rangePicker === 'oneEnd') { setOneTimeEnd(time); setRangePicker(null); }
        else { setAvailabilityTime(time); setTimeModal(false); addWeeklyAvailability(time); }
      }} onCancel={() => { setTimeModal(false); setRangePicker(null); }} />
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
  statusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  statusCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginRight: Spacing.sm },
  statusIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  statusIconOn: { backgroundColor: '#E8F5E9' },
  statusIconOff: { backgroundColor: '#FFEBEE' },
  statusTextBlock: { flex: 1 },
  statusTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  statusHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  limitCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  limitTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  limitHint: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4, marginBottom: Spacing.sm },
  limitRow: { flexDirection: 'row', gap: Spacing.sm },
  limitInput: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, color: Colors.text, backgroundColor: Colors.surface },
  limitSave: { minWidth: 84, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary },
  limitSaveText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
  calendarCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  monthTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  monthActions: { flexDirection: 'row', gap: Spacing.sm },
  monthArrow: { width: 36, height: 36, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center' },
  weekdayLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '700' },
  dateCell: { height: 42, borderRadius: BorderRadius.full },
  dateCellSelected: { backgroundColor: Colors.primary },
  dateNumber: { color: Colors.text, fontSize: FontSize.sm },
  dateNumberSelected: { color: Colors.white, fontWeight: '700' },
  dateDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 2 },
  dateDotSelected: { backgroundColor: Colors.white },
  calendarLegend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  agendaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xl, marginBottom: Spacing.md },
  todayButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: '#E8F5E9' },
  todayText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700' },
  agendaItem: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  agendaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  agendaTime: { flex: 1, color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  agendaLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  agendaRemove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  setupButton: { flexDirection: 'row', minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, marginTop: Spacing.sm, marginBottom: Spacing.md },
  setupButtonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  choiceOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.62)' },
  choiceSheet: { width: '100%', backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 24 },
  choiceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  choiceOptions: { paddingBottom: Spacing.md },
  choiceHeadingCopy: { flex: 1 },
  choiceEyebrow: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1 },
  choiceHeading: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginTop: 3 },
  choiceRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.sm },
  choiceIcon: { width: 42, height: 42, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9' },
  choiceCopy: { flex: 1 },
  choiceTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  choiceDescription: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 3 },
  drawerOverlay: { flex: 1, justifyContent: 'flex-end' },
  drawerBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  setupDrawer: { width: '100%', backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 24 },
  drawerHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: Colors.border, marginBottom: Spacing.md },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  drawerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  drawerHint: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18, marginTop: 3 },
  closeButton: { width: 44, height: 44, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#D1E8D8' },
  drawerScroll: { flex: 1 },
  drawerContent: { padding: Spacing.lg, paddingBottom: 40 },
  drawerSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md },
  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginTop: Spacing.md },
  rangeButton: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md },
  rangeLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },
  rangeTime: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600', marginTop: 4 },
  formLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginTop: Spacing.md },
  rangeError: { color: Colors.error, fontSize: FontSize.xs, marginTop: Spacing.sm },
  savedRangeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, marginTop: Spacing.sm },
  savedRangeText: { flex: 1, color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  sectionHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  removeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.full, backgroundColor: '#FFEBEE', marginLeft: Spacing.sm },
  emptyCard: { alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  emptyHint: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  dateSelectButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.md },
  dateSelectText: { flex: 1, color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  dateChangeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  weekdayButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.white },
  weekdayButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  weekdayText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  weekdayTextActive: { color: Colors.white, fontWeight: '700' },
  weeklyAddButton: { flexDirection: 'row', minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, marginTop: Spacing.lg },
  weeklyAddText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
  disabledButton: { opacity: 0.5 },
});

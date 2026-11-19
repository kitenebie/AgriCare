import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/FontScale';
import { modalAlert } from '@/components/ui/ModalAlert';
import Animated from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, IconName } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { useFadeInUp } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';
import { hasAppointmentTimeConflict, isTechnicianAppointmentActive, isTimeInAnyRange, isTimeInRange, type TimeRange } from '@/utils/availability';
import { logCrud } from '@/services/logService';
import * as Location from 'expo-location';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { TimePickerModal } from '@/components/ui/TimePickerModal';

interface ServiceItem { id: string; name: string; iconName: IconName; }
interface AvailabilitySlot { date?: string; dayOfWeek?: number; time?: string; startTime?: string; endTime?: string; }
interface Technician { id: string; displayName: string; specialization?: string; photoURL?: string; rating?: number; available?: boolean; availabilitySlots?: AvailabilitySlot[]; alwaysAvailable?: TimeRange[] | TimeRange; alwaysAvailableEnabled?: boolean; }
interface ScheduledAppointment { technicianId?: string; date?: string; time?: string; status?: string; responseDeadlineAt?: { toMillis?: () => number }; }
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const TECHNICIAN_RESPONSE_HOURS = 24;
const MAX_DESCRIPTION_LENGTH = 5000;
const isPastTimeOnDate = (date: Date, time: string) => {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;
  const [, hour, minute, period] = match;
  const requestedDate = new Date(date);
  requestedDate.setHours((Number(hour) % 12) + (period.toUpperCase() === 'PM' ? 12 : 0), Number(minute), 0, 0);
  return requestedDate.getTime() <= Date.now();
};
const issueTemplates = [
  { label: 'Health concern', text: 'Main concern:\nSymptoms:\nWhen it started:' },
  { label: 'Vaccination', text: 'Vaccine or service needed:\nLast vaccination date (if known):' },
  { label: 'Treatment / follow-up', text: 'Treatment or follow-up needed:\nPrevious treatment (if any):' },
  { label: 'Urgent concern', text: 'How urgent is this request?\nBest time to contact you:' },
  { label: 'Animal details', text: 'Animal age or condition:\nRelevant health history:' },
];

const serviceTypes: ServiceItem[] = [
  { id: '1', name: 'Health Check', iconName: 'health-check' },
  { id: '2', name: 'Vaccination', iconName: 'vaccination' },
  { id: '3', name: 'Treatment', iconName: 'treatment' },
  { id: '4', name: 'Deworming', iconName: 'bug' },
  { id: '5', name: 'Artificial Insemination', iconName: 'dna' },
  { id: '6', name: 'Iron Injection', iconName: 'vaccination' },
  { id: '7', name: 'Vitamin Injection', iconName: 'vaccination' },
  { id: '8', name: 'Castration', iconName: 'treatment' },
  { id: '9', name: 'Wound Treatment', iconName: 'health-check' },
  { id: '10', name: 'Antibiotic Injection', iconName: 'vaccination' },
];

export default function ServicesScreen() {
  const { technicianId, returnToAvailable, returnToTechnicians } = useLocalSearchParams<{ technicianId?: string; returnToAvailable?: string; returnToTechnicians?: string }>();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [animalType, setAnimalType] = useState('');
  const [animalBreed, setAnimalBreed] = useState('');
  const [animalQuantity, setAnimalQuantity] = useState('1');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uid, setUid] = useState('');
  const [userName, setUserName] = useState('');
  const [farmerLocation, setFarmerLocation] = useState('');

  // Technicians
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [scheduledAppointments, setScheduledAppointments] = useState<ScheduledAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsLoadFailed, setAppointmentsLoadFailed] = useState(false);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [dateModal, setDateModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);
  const [descriptionHeight, setDescriptionHeight] = useState(100);
  const formScroll = useRef<ScrollView>(null);
  const descriptionFocused = useRef(false);
  const [step, setStep] = useState(0);

  const contentAnim = useFadeInUp(200);

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);
      setUserName(session.displayName || 'Farmer');

      const [techSnap, farmerDoc] = await Promise.all([
        firestore().collection(Collections.USERS).where('role', '==', 'technician').where('status', '==', 'active').get(),
        firestore().collection(Collections.USERS).doc(session.uid).get().catch(() => null),
      ]);
      setTechnicians(techSnap.docs.map(d => ({ id: d.id, ...d.data() } as Technician)));
      setFarmerLocation(farmerDoc?.data()?.location || '');

      // Default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow);

      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    let active = true;
    setAppointmentsLoading(true);
    setAppointmentsLoadFailed(false);
    setScheduledAppointments([]);
    return firestore().collection(Collections.APPOINTMENTS).where('status', 'in', ['pending', 'confirmed', 'upcoming']).onSnapshot(
      snap => {
        setScheduledAppointments(snap.docs.map(d => d.data() as ScheduledAppointment));
        setAppointmentsLoading(false);
      },
      error => {
        console.warn('Appointment availability load error:', error);
        setAppointmentsLoadFailed(true);
        setAppointmentsLoading(false);
      }
    );
  }, [selectedDate]);

  useEffect(() => {
    setSelectedTech(technicianId ? technicians.find(tech => tech.id === technicianId) || null : null);
  }, [technicianId, technicians]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-PH', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  };
  const techniciansForSlot = technicians.filter(tech => {
    if (appointmentsLoading || appointmentsLoadFailed || !selectedTime || tech.available === false) return false;
    const hasSchedule = tech.availabilitySlots?.some(slot => {
      const dateMatches = slot.date ? slot.date === dateKey(selectedDate) : slot.dayOfWeek === selectedDate.getDay();
      if (!dateMatches) return false;
      return slot.startTime && slot.endTime
        ? isTimeInRange(selectedTime, slot.startTime, slot.endTime)
        : !!slot.time && slot.time.trim().toUpperCase() === selectedTime.trim().toUpperCase();
    }) || (tech.alwaysAvailableEnabled !== false && isTimeInAnyRange(selectedTime, tech.alwaysAvailable));
    return hasSchedule && !scheduledAppointments.some(appointment => appointment.technicianId === tech.id && isTechnicianAppointmentActive(appointment) && hasAppointmentTimeConflict(dateKey(selectedDate), selectedTime, appointment));
  });

  const moveToStep = (nextStep: number) => {
    Keyboard.dismiss();
    setStep(nextStep);
    requestAnimationFrame(() => formScroll.current?.scrollTo({ y: 0, animated: false }));
  };
  const continueForm = () => {
    if (step === 0 && !selectedService) { modalAlert('Service required', 'Select a service to continue.'); return; }
    if (step === 1 && (!animalType.trim() || !animalBreed.trim() || !Number.isSafeInteger(Number(animalQuantity)) || Number(animalQuantity) < 1)) { modalAlert('Animal details required', 'Enter the animal type, breed, and a quantity of at least 1.'); return; }
    if (step === 1 && selectedService === '5' && !['pig', 'swine', 'cattle', 'carabao'].includes(animalType.trim().toLowerCase())) { modalAlert('Animal type not supported', 'Artificial Insemination is available for Pig/Swine, Cattle, and Carabao only.'); return; }
    if (step === 2 && !selectedTime) { modalAlert('Time required', 'Select a preferred date and time to continue.'); return; }
    if (step === 2 && isPastTimeOnDate(selectedDate, selectedTime)) { modalAlert('Invalid time', 'Choose a time later than the current time.'); return; }
    if (step === 2 && selectedTech && !techniciansForSlot.some(tech => tech.id === selectedTech.id)) { modalAlert('Technician unavailable', 'Choose another available technician or select Any Available Technician.'); return; }
    moveToStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!selectedService) { modalAlert('Error', 'Please select a service type.'); return; }
    if (!animalType.trim() || !animalBreed.trim() || !Number.isSafeInteger(Number(animalQuantity)) || Number(animalQuantity) < 1) { modalAlert('Error', 'Enter the animal type, breed, and a quantity of at least 1.'); return; }
    if (selectedService === '5' && !['pig', 'swine', 'cattle', 'carabao'].includes(animalType.trim().toLowerCase())) { modalAlert('Animal type not supported', 'Artificial Insemination is available for Pig/Swine, Cattle, and Carabao only.'); return; }
    if (!selectedTime) { modalAlert('Error', 'Please select a preferred date and time.'); return; }
    if (isPastTimeOnDate(selectedDate, selectedTime)) { modalAlert('Invalid time', 'Choose a time later than the current time.'); return; }
    if (selectedTech && !techniciansForSlot.some(tech => tech.id === selectedTech.id)) { modalAlert('Error', 'This technician is not available at the selected date and time.'); return; }

    setSubmitting(true);
    try {
      const { status: locationPermission } = await Location.requestForegroundPermissionsAsync();
      if (locationPermission !== 'granted') {
        modalAlert('Location Required', 'Allow location access so the technician can navigate to the exact appointment location.');
        return;
      }

      const appointmentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const locationAccuracy = appointmentPosition.coords.accuracy;
      if (locationAccuracy !== null && locationAccuracy > 50) {
        modalAlert('Location Not Accurate Yet', 'Wait until your phone has a stronger GPS signal, then submit the appointment again.');
        return;
      }
      const serviceName = serviceTypes.find(s => s.id === selectedService)?.name || 'Service';
      const dateStr = dateKey(selectedDate);
      const docRef = await firestore().collection(Collections.APPOINTMENTS).add({
        serviceType: serviceName,
        animalType: animalType.trim(),
        animalName: animalType.trim(),
        animalBreed: animalBreed.trim(),
        animalQuantity: Number(animalQuantity),
        farmerId: uid,
        farmerName: userName,
        technicianId: selectedTech?.id || '',
        technicianName: selectedTech?.displayName || 'Unassigned',
        date: dateStr,
        time: selectedTime,
        status: 'pending',
        ...(selectedTech ? { responseDeadlineAt: new Date(Date.now() + TECHNICIAN_RESPONSE_HOURS * 60 * 60 * 1000) } : {}),
        description: description.trim(),
        location: farmerLocation,
        appointmentLatitude: appointmentPosition.coords.latitude,
        appointmentLongitude: appointmentPosition.coords.longitude,
        appointmentLocationAccuracy: locationAccuracy ?? null,
        appointmentLocationCapturedAt: firestore.FieldValue.serverTimestamp(),
        createdAt: firestore.FieldValue.serverTimestamp()
      });
      await logCrud('Service Requested', `${serviceName} for ${animalType.trim()}`, 'appointments', docRef.id, {
        old: {},
        new: { serviceType: serviceName, animalType: animalType.trim(), animalBreed: animalBreed.trim(), animalQuantity: Number(animalQuantity), date: dateStr, time: selectedTime, technician: selectedTech?.displayName || 'All available technicians' }
      });
      modalAlert('Success', 'Service request submitted! A technician will be assigned soon.');
      setSelectedService(null); setAnimalType(''); setAnimalBreed(''); setAnimalQuantity('1'); setDescription(''); setDescriptionHeight(100); setSelectedTime(''); setSelectedTech(null); moveToStep(0);
    } catch (e: any) { modalAlert('Error', e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => returnToAvailable === 'true' ? router.dismissTo('/(farmer)/home/available-technicians') : returnToTechnicians === 'true' ? router.dismissTo('/(farmer)/home/technicians') : router.canGoBack() ? router.back() : router.replace('/(farmer)/home')} accessibilityLabel="Go back">
          <Icon name="chevron-left" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Request Service</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.stepHeader}>
        <View style={s.stepMeta}><Text style={s.stepCount}>STEP {step + 1} OF 5</Text><Text style={s.stepName}>{['Service Type', 'Animal Details', 'Schedule', 'Request Details', 'Review'][step]}</Text></View>
        <View style={s.stepTrack}>{[0, 1, 2, 3, 4].map(index => <View key={index} style={[s.stepSegment, index <= step && s.stepSegmentActive]} />)}</View>
      </View>

      <ScrollView ref={formScroll} style={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <Animated.View style={contentAnim}>
          {step === 0 && <>
          {/* Service Type */}
          <Text style={s.sectionTitle}>Select Service Type</Text>
          <Text style={{ color: Colors.textSecondary, marginBottom: 8 }}>Choose the service needed for your animal.</Text>
          <View style={s.serviceGrid}>
            {serviceTypes.map((service) => (
              <TouchableOpacity key={service.id} accessibilityRole="button" accessibilityState={{ selected: selectedService === service.id }} style={s.serviceItem} onPress={() => setSelectedService(service.id)}>
                <View style={[s.serviceIconBox, selectedService === service.id && s.serviceIconBoxActive]}>
                  <Icon name={service.iconName} size={28} color={selectedService === service.id ? Colors.white : Colors.primary} strokeWidth={1.5} />
                </View>
                <Text style={[s.serviceName, selectedService === service.id && s.serviceNameActive]}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          </>}

          {step === 1 && <>
          <Text style={s.sectionTitle}>Animal Details</Text>
          <Text style={{ color: Colors.textSecondary, marginBottom: 8 }}>Tell the technician which animal needs the service.</Text>
          <Text style={s.fieldLabel}>Animal type</Text>
          <TextInput style={s.formInput} value={animalType} onChangeText={setAnimalType} placeholder="e.g. Pig, Horse, Cattle, Goat, Carabao" placeholderTextColor={Colors.textLight} />
          <Text style={s.fieldLabel}>Breed</Text>
          <TextInput style={s.formInput} value={animalBreed} onChangeText={setAnimalBreed} placeholder="Enter breed" placeholderTextColor={Colors.textLight} />
          <Text style={s.fieldLabel}>Quantity</Text>
          <TextInput style={s.formInput} value={animalQuantity} onChangeText={value => setAnimalQuantity(value.replace(/[^0-9]/g, ''))} placeholder="Number of animals" placeholderTextColor={Colors.textLight} keyboardType="number-pad" />
          </>}

          {step === 2 && <>
          {/* Preferred Date */}
          <Text style={s.sectionTitle}>Preferred Date</Text>
          <TouchableOpacity style={s.selectRow} onPress={() => setDateModal(true)}>
            <View style={s.selectRowLeft}>
              <Icon name="calendar" size={20} color={Colors.textSecondary} />
              <Text style={s.selectRowText}>{formatDate(selectedDate)}</Text>
            </View>
            <Icon name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Preferred Time */}
          <Text style={s.sectionTitle}>Preferred Time</Text>
          <TouchableOpacity style={s.selectRow} onPress={() => setTimeModal(true)}>
            <View style={s.selectRowLeft}>
              <Icon name="clock" size={20} color={Colors.textSecondary} />
              <Text style={s.selectRowText}>{selectedTime || 'Select preferred time'}</Text>
            </View>
            <Icon name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          <Text style={s.sectionTitle}>Preferred Technician</Text>
          <View style={s.selectRow}>
            <View style={s.selectRowLeft}>
              {selectedTech ? (
                <Avatar name={selectedTech.displayName} imageUrl={selectedTech.photoURL} size={36} />
              ) : (
                <View style={[s.thumb, { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }]}><Icon name="profile" size={18} color={Colors.textLight} /></View>
              )}
              <View>
                <Text style={s.selectRowText}>{selectedTech?.displayName || 'All available technicians'}</Text>
                {selectedTech?.specialization ? <Text style={{ fontSize: 11, color: Colors.textSecondary }}>{selectedTech.specialization}</Text> : null}
              </View>
            </View>
            {!selectedTech && <Icon name="check" size={18} color={Colors.primary} />}
          </View>
          <Text style={{ color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: Spacing.sm }}>{selectedTech ? 'This request is directed to this technician.' : 'Your request will be available to all technicians.'}</Text>
          {selectedTech && <Text style={{ color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: Spacing.sm }}>The technician has 1 day to accept. If they don’t, this request becomes available to all technicians.</Text>}
          </>}

          {step === 3 && <>
          {/* Describe Issue */}
          <Text style={s.sectionTitle}>Describe the Issue / Request</Text>
          <Text style={s.templateHint}>Choose a template to get started.</Text>
          <View style={s.templateRow}>{issueTemplates.map(template => <TouchableOpacity key={template.label} style={s.templateChip} accessibilityRole="button" onPress={() => setDescription(current => current.includes(template.text) ? current : [current.trim(), template.text].filter(Boolean).join('\n\n').slice(0, MAX_DESCRIPTION_LENGTH))}><Text style={s.templateChipText}>{template.label}</Text></TouchableOpacity>)}</View>
          <TextInput style={[s.textArea, { height: descriptionHeight }]} maxLength={MAX_DESCRIPTION_LENGTH} scrollEnabled={false} placeholder="Please describe the issue or service needed..." placeholderTextColor={Colors.textLight} multiline textAlignVertical="top" value={description} onChangeText={setDescription} onFocus={() => { descriptionFocused.current = true; requestAnimationFrame(() => formScroll.current?.scrollToEnd({ animated: true })); }} onBlur={() => { descriptionFocused.current = false; }} onContentSizeChange={event => { setDescriptionHeight(Math.max(100, event.nativeEvent.contentSize.height)); if (descriptionFocused.current) requestAnimationFrame(() => formScroll.current?.scrollToEnd({ animated: false })); }} />
          <Text style={s.descriptionCounter}>{description.length}/{MAX_DESCRIPTION_LENGTH}</Text>
          </>}

          {step === 4 && <>
            <Text style={s.sectionTitle}>Review your request</Text>
            <Text style={s.reviewHint}>Check the details before sending your service request.</Text>
            <View style={s.reviewCard}>
              <View style={s.reviewHead}><Text style={s.reviewLabel}>SERVICE TYPE</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit service type" onPress={() => moveToStep(0)}><Text style={s.reviewEdit}>Edit</Text></TouchableOpacity></View>
              <Text style={s.reviewValue}>{serviceTypes.find(service => service.id === selectedService)?.name || 'Service'}</Text>
            </View>
            <View style={s.reviewCard}>
              <View style={s.reviewHead}><Text style={s.reviewLabel}>ANIMAL DETAILS</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit animal details" onPress={() => moveToStep(1)}><Text style={s.reviewEdit}>Edit</Text></TouchableOpacity></View>
              <Text style={s.reviewValue}>{animalType.trim()} · {animalBreed.trim()}</Text>
              <Text style={s.reviewSub}>Quantity: {animalQuantity}</Text>
            </View>
            <View style={s.reviewCard}>
              <View style={s.reviewHead}><Text style={s.reviewLabel}>SCHEDULE & TECHNICIAN</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit schedule and technician" onPress={() => moveToStep(2)}><Text style={s.reviewEdit}>Edit</Text></TouchableOpacity></View>
              <Text style={s.reviewValue}>{formatDate(selectedDate)} · {selectedTime}</Text>
              <Text style={s.reviewSub}>{selectedTech?.displayName || 'All available technicians'}</Text>
            </View>
            <View style={s.reviewCard}>
              <View style={s.reviewHead}><Text style={s.reviewLabel}>ISSUE / REQUEST DETAILS</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit request details" onPress={() => moveToStep(3)}><Text style={s.reviewEdit}>Edit</Text></TouchableOpacity></View>
              <Text style={s.reviewDescription}>{description.trim() || 'No additional details provided.'}</Text>
            </View>
          </>}
        </Animated.View>
      </ScrollView>

      <View style={s.stepFooter}>
        {step > 0 ? <TouchableOpacity style={s.stepBack} onPress={() => moveToStep(step - 1)}><Text style={s.stepBackText}>Back</Text></TouchableOpacity> : <View style={s.stepBackPlaceholder} />}
        {step < 4 ? <TouchableOpacity style={s.stepNext} activeOpacity={0.8} onPress={continueForm}><Text style={s.stepNextText}>{step === 3 ? 'Review Request' : 'Continue'}</Text><Icon name="chevron-right" size={18} color={Colors.white} /></TouchableOpacity> : <TouchableOpacity style={[s.stepNext, submitting && { opacity: 0.6 }]} activeOpacity={0.8} onPress={handleSubmit} disabled={submitting}>{submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={s.stepNextText}>Submit Request</Text>}</TouchableOpacity>}
      </View>

      {dateModal && <DatePickerModal visible value={selectedDate} minimumDate={new Date()} onConfirm={date => { setSelectedDate(date); setDateModal(false); if (selectedTime && isPastTimeOnDate(date, selectedTime)) { setSelectedTime(''); modalAlert('Time cleared', 'That time has already passed for the selected date. Choose a later time.'); } }} onCancel={() => setDateModal(false)} />}
      {timeModal && <TimePickerModal visible value={selectedTime || '08:00 AM'} selectedDate={selectedDate} onConfirm={time => { if (isPastTimeOnDate(selectedDate, time)) { modalAlert('Past time not allowed', 'Choose a future time for the selected date.'); return; } setSelectedTime(time); setTimeModal(false); }} onCancel={() => setTimeModal(false)} />}

    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  stepHeader: { backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  stepMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  stepCount: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.6 },
  stepName: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
  stepTrack: { flexDirection: 'row', gap: Spacing.xs },
  stepSegment: { flex: 1, height: 4, borderRadius: BorderRadius.full, backgroundColor: Colors.border },
  stepSegmentActive: { backgroundColor: Colors.primary },
  content: { flex: 1, paddingHorizontal: Spacing.xl },
  stepFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  stepBack: { minWidth: 100, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full },
  stepBackPlaceholder: { minWidth: 100 },
  stepBackText: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  stepNext: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
  stepNextText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  reviewHint: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.md },
  reviewCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  reviewLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5 },
  reviewEdit: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  reviewValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  reviewSub: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.xs },
  reviewDescription: { color: Colors.text, fontSize: FontSize.sm, lineHeight: 20 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginTop: Spacing.xl, marginBottom: Spacing.md },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  serviceItem: { width: '31%', alignItems: 'center', marginBottom: Spacing.lg },
  serviceIconBox: { width: 60, height: 60, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
  serviceIconBoxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  serviceName: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 14 },
  serviceNameActive: { color: Colors.primary, fontWeight: '600' },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  selectRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  selectRowText: { fontSize: FontSize.md, color: Colors.text },
  fieldLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginTop: Spacing.md, marginBottom: Spacing.xs },
  formInput: { minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, fontSize: FontSize.md, color: Colors.text, backgroundColor: Colors.white },
  thumb: { width: 36, height: 36, borderRadius: BorderRadius.sm },
  templateHint: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  templateChip: { borderWidth: 1, borderColor: '#C8E6D0', borderRadius: BorderRadius.full, backgroundColor: '#EAF6EF', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  templateChipText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  textArea: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg, fontSize: FontSize.md, color: Colors.text, minHeight: 100, backgroundColor: Colors.white },
  descriptionCounter: { textAlign: 'right', color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: Spacing.xs },
});

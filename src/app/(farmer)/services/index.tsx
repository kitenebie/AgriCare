import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/FontScale';
import { modalAlert } from '@/components/ui/ModalAlert';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, IconName } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { useFadeInUp } from '@/hooks/useAnimatedEntry';
import { useFocusEffect } from 'expo-router';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';
import { logCrud } from '@/services/logService';
import * as Location from 'expo-location';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { TimePickerModal } from '@/components/ui/TimePickerModal';

interface ServiceItem { id: string; name: string; iconName: IconName; }
interface Animal { id: string; name: string; breed: string; type: string; imageUrl?: string; }
interface AvailabilitySlot { date?: string; dayOfWeek?: number; time: string; }
interface Technician { id: string; displayName: string; specialization?: string; photoURL?: string; rating?: number; available?: boolean; availabilitySlots?: AvailabilitySlot[]; }
interface CustomService { id: string; name: string; iconName: IconName; ownerId: string; }
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const TECHNICIAN_RESPONSE_MINUTES = 15;

const serviceTypes: ServiceItem[] = [
  { id: '1', name: 'Health Check', iconName: 'health-check' },
  { id: '2', name: 'Vaccination', iconName: 'vaccination' },
  { id: '3', name: 'Treatment', iconName: 'treatment' },
  { id: '4', name: 'De-worming', iconName: 'bug' },
  { id: '5', name: 'Artificial\nInsemination', iconName: 'dna' },
  { id: '6', name: 'Others', iconName: 'dots' },
];

export default function ServicesScreen() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uid, setUid] = useState('');
  const [userName, setUserName] = useState('');

  // Technicians
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [dateModal, setDateModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);

  // Modals
  const [animalModal, setAnimalModal] = useState(false);
  const [techModal, setTechModal] = useState(false);

  const contentAnim = useFadeInUp(200);

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);
      setUserName(session.displayName || 'Farmer');

      // Load farmer's animals
      const animalSnap = await firestore().collection('animals').where('ownerId', '==', session.uid).get();
      setAnimals(animalSnap.docs.map(d => ({ id: d.id, ...d.data() } as Animal)));

      // Load technicians
      const techSnap = await firestore().collection(Collections.USERS).where('role', '==', 'technician').where('status', '==', 'active').get();
      setTechnicians(techSnap.docs.map(d => ({ id: d.id, ...d.data() } as Technician)));

      // Load user's custom services
      const csSnap = await firestore().collection('customServices').where('ownerId', '==', session.uid).get();
      setCustomServices(csSnap.docs.map(d => ({ id: d.id, ...d.data() } as CustomService)));

      // Default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow);

      setLoading(false);
    };
    load();
  }, []);

  // Refresh custom services when screen gains focus (after adding a new one)
  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      firestore().collection('customServices').where('ownerId', '==', uid).get().then(snap => {
        setCustomServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomService)));
      });
    }, [uid])
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-PH', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  };
  const techniciansForSlot = technicians.filter(tech => tech.available !== false && tech.availabilitySlots?.some(
    slot => (slot.date === dateKey(selectedDate) || slot.dayOfWeek === selectedDate.getDay()) && slot.time === selectedTime
  ));

  const handleSubmit = async () => {
    if (!selectedService) { modalAlert('Error', 'Please select a service type.'); return; }
    if (!selectedAnimal) { modalAlert('Error', 'Please select an animal.'); return; }
    if (!selectedTime) { modalAlert('Error', 'Please select a preferred date and time.'); return; }
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
      let serviceName = serviceTypes.find(s => s.id === selectedService)?.name || '';
      // Check if it's a custom service
      if (!serviceName && selectedService?.startsWith('custom_')) {
        const csId = selectedService.replace('custom_', '');
        serviceName = customServices.find(c => c.id === csId)?.name || 'Custom Service';
      }
      if (!serviceName) serviceName = 'Service';
      const dateStr = dateKey(selectedDate);
      const docRef = await firestore().collection(Collections.APPOINTMENTS).add({
        serviceType: serviceName,
        animalId: selectedAnimal.id,
        animalName: `${selectedAnimal.name} (${selectedAnimal.breed})`,
        farmerId: uid,
        farmerName: userName,
        technicianId: selectedTech?.id || '',
        technicianName: selectedTech?.displayName || 'Unassigned',
        date: dateStr,
        time: selectedTime,
        status: 'pending',
        ...(selectedTech ? { responseDeadlineAt: new Date(Date.now() + TECHNICIAN_RESPONSE_MINUTES * 60 * 1000) } : {}),
        description: description.trim(),
        location: '',
        appointmentLatitude: appointmentPosition.coords.latitude,
        appointmentLongitude: appointmentPosition.coords.longitude,
        appointmentLocationAccuracy: locationAccuracy ?? null,
        appointmentLocationCapturedAt: firestore.FieldValue.serverTimestamp(),
        createdAt: firestore.FieldValue.serverTimestamp()
      });
      await logCrud('Service Requested', `${serviceName} for ${selectedAnimal.name}`, 'appointments', docRef.id, {
        old: {},
        new: { serviceType: serviceName, animalName: selectedAnimal.name, date: dateStr, time: selectedTime, technician: selectedTech?.displayName || 'Any' }
      });
      modalAlert('Success', 'Service request submitted! A technician will be assigned soon.');
      setSelectedService(null); setSelectedAnimal(null); setDescription(''); setSelectedTime(''); setSelectedTech(null);
    } catch (e: any) { modalAlert('Error', e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(farmer)/home')} accessibilityLabel="Go back">
          <Icon name="chevron-left" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Request Service</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={contentAnim}>
          {/* Service Type */}
          <Text style={s.sectionTitle}>Select Service Type</Text>
          <View style={s.serviceGrid}>
            {serviceTypes.map((service) => (
              <TouchableOpacity key={service.id} style={s.serviceItem} onPress={() => {
                if (service.id === '6') { router.push('/(farmer)/services/custom-service'); }
                else { setSelectedService(service.id); }
              }}>
                <View style={[s.serviceIconBox, selectedService === service.id && s.serviceIconBoxActive]}>
                  <Icon name={service.iconName} size={28} color={selectedService === service.id ? Colors.white : Colors.primary} strokeWidth={1.5} />
                </View>
                <Text style={[s.serviceName, selectedService === service.id && s.serviceNameActive]}>{service.name}</Text>
              </TouchableOpacity>
            ))}
            {/* Custom services from Firebase */}
            {customServices.map((cs) => (
              <TouchableOpacity key={cs.id} style={s.serviceItem} onPress={() => setSelectedService(`custom_${cs.id}`)}>
                <View style={[s.serviceIconBox, selectedService === `custom_${cs.id}` && s.serviceIconBoxActive]}>
                  <Icon name={cs.iconName} size={28} color={selectedService === `custom_${cs.id}` ? Colors.white : Colors.primary} strokeWidth={1.5} />
                </View>
                <Text style={[s.serviceName, selectedService === `custom_${cs.id}` && s.serviceNameActive]}>{cs.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Select Animal */}
          <Text style={s.sectionTitle}>Select Animal</Text>
          <TouchableOpacity style={s.selectRow} onPress={() => setAnimalModal(true)}>
            <View style={s.selectRowLeft}>
              {selectedAnimal?.imageUrl ? (
                <Image source={{ uri: selectedAnimal.imageUrl }} style={s.thumb} contentFit="cover" />
              ) : (
                <View style={[s.thumb, { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }]}><Icon name="paw" size={18} color={Colors.textLight} /></View>
              )}
              <Text style={s.selectRowText}>{selectedAnimal ? `${selectedAnimal.name} (${selectedAnimal.breed})` : 'Select an animal'}</Text>
            </View>
            <Icon name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

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

          {/* Preferred Technician (Optional) */}
          <Text style={s.sectionTitle}>Preferred Technician <Text style={{ fontWeight: '400', color: Colors.textLight }}>(optional)</Text></Text>
          <TouchableOpacity style={s.selectRow} onPress={() => setTechModal(true)}>
            <View style={s.selectRowLeft}>
              {selectedTech ? (
                <Avatar name={selectedTech.displayName} imageUrl={selectedTech.photoURL} size={36} />
              ) : (
                <View style={[s.thumb, { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }]}><Icon name="profile" size={18} color={Colors.textLight} /></View>
              )}
              <View>
                <Text style={s.selectRowText}>{selectedTech?.displayName || 'Any available technician'}</Text>
                {selectedTech?.specialization ? <Text style={{ fontSize: 11, color: Colors.textSecondary }}>{selectedTech.specialization}</Text> : null}
              </View>
            </View>
            <Icon name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          {selectedTech && <Text style={{ color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: Spacing.sm }}>The technician has {TECHNICIAN_RESPONSE_MINUTES} minutes to accept. If they don't, this request becomes available to all technicians.</Text>}

          {/* Describe Issue */}
          <Text style={s.sectionTitle}>Describe the Issue / Request</Text>
          <TextInput style={s.textArea} placeholder="Please describe the issue or service needed..." placeholderTextColor={Colors.textLight} multiline numberOfLines={4} textAlignVertical="top" value={description} onChangeText={setDescription} />

          {/* Submit */}
          <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.6 }]} activeOpacity={0.8} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={s.submitBtnText}>Submit Request</Text>}
          </TouchableOpacity>

          <View style={{ height: 80 }} />
        </Animated.View>
      </ScrollView>

      {/* Animal Modal */}
      <Modal visible={animalModal} transparent animationType="slide">
        <View style={s.modalOverlay}><View style={s.modal}>
          <View style={s.modalHead}><Text style={s.modalTitle}>Select Animal</Text><TouchableOpacity onPress={() => setAnimalModal(false)}><Icon name="close" size={22} color={Colors.text} /></TouchableOpacity></View>
          {animals.length === 0 ? <Text style={s.emptyModal}>No animals registered yet.</Text> : (
            <FlatList data={animals} keyExtractor={a => a.id} renderItem={({ item }) => (
              <TouchableOpacity style={s.listRow} onPress={() => { setSelectedAnimal(item); setAnimalModal(false); }}>
                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={s.thumb} contentFit="cover" /> : <View style={[s.thumb, { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }]}><Icon name="paw" size={16} color={Colors.textLight} /></View>}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.listRowTitle}>{item.name}</Text>
                  <Text style={s.listRowSub}>{item.breed} • {item.type}</Text>
                </View>
                {selectedAnimal?.id === item.id && <Icon name="check" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            )} />
          )}
        </View></View>
      </Modal>

      {/* Technician Modal */}
      <Modal visible={techModal} transparent animationType="slide">
        <View style={s.modalOverlay}><View style={s.modal}>
          <View style={s.modalHead}><Text style={s.modalTitle}>Select Technician</Text><TouchableOpacity onPress={() => setTechModal(false)}><Icon name="close" size={22} color={Colors.text} /></TouchableOpacity></View>
          {/* Any option */}
          <TouchableOpacity style={s.listRow} onPress={() => { setSelectedTech(null); setTechModal(false); }}>
            <View style={[s.thumb, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E9' }]}><Icon name="check" size={16} color={Colors.primary} /></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.listRowTitle}>Any Available Technician</Text>
              <Text style={s.listRowSub}>System will assign a technician when available</Text>
            </View>
            {!selectedTech && <Icon name="check" size={18} color={Colors.primary} />}
          </TouchableOpacity>
          {techniciansForSlot.length === 0 ? <Text style={s.emptyModal}>No technicians posted availability for this date and time. You can still request any available technician.</Text> : (
            <FlatList data={techniciansForSlot} keyExtractor={t => t.id} renderItem={({ item }) => (
              <TouchableOpacity style={s.listRow} onPress={() => { setSelectedTech(item); setTechModal(false); }}>
                <Avatar name={item.displayName} imageUrl={item.photoURL} size={36} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.listRowTitle}>{item.displayName}</Text>
                  <Text style={s.listRowSub}>{item.specialization || 'General Veterinary'}{item.rating ? ` • ⭐ ${item.rating}` : ''}</Text>
                </View>
                {selectedTech?.id === item.id && <Icon name="check" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            )} />
          )}
        </View></View>
      </Modal>

      {dateModal && <DatePickerModal visible value={selectedDate} minimumDate={new Date()} onConfirm={date => { setSelectedDate(date); setDateModal(false); }} onCancel={() => setDateModal(false)} />}
      {timeModal && <TimePickerModal visible value={selectedTime || '08:00 AM'} onConfirm={time => { setSelectedTime(time); setTimeModal(false); }} onCancel={() => setTimeModal(false)} />}

    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: Spacing.xl },
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
  thumb: { width: 36, height: 36, borderRadius: BorderRadius.sm },
  textArea: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg, fontSize: FontSize.md, color: Colors.text, minHeight: 100, backgroundColor: Colors.white },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40, maxHeight: '70%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  listRowTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  listRowSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  emptyModal: { color: Colors.textLight, textAlign: 'center', paddingVertical: 40 }
});

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Modal } from 'react-native';
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
import type { TimeRange } from '@/utils/availability';
import { logCrud } from '@/services/logService';
import * as Location from 'expo-location';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { TimePickerModal } from '@/components/ui/TimePickerModal';
import { callBackend } from '@/services/backendApi';
import { catalog, isTechnicianQualified, normalizeAnimalTypeId } from '../../../../functions/shared/technicianServiceMatching';

interface ServiceItem { id: string; name: string; iconName: IconName; }
interface BreedOption { id: string; animalTypeId: string; name: string; sourceCategoryId?: string; }
interface FarmerAnimal { id: string; name?: string; type?: string; breed?: string; count?: number; age?: number; ageUnit?: string; }
interface AvailabilitySlot { date?: string; dayOfWeek?: number; time?: string; startTime?: string; endTime?: string; }
interface Technician { id: string; role?: string; status?: string; displayName: string; specialization?: string; specializationIds?: string[]; qualificationKeys?: string[]; qualificationVerified?: boolean; photoURL?: string; rating?: number; available?: boolean; availabilitySlots?: AvailabilitySlot[]; alwaysAvailable?: TimeRange[] | TimeRange; alwaysAvailableEnabled?: boolean; }
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

export default function ServicesScreen() {
  const { technicianId, returnToAvailable, returnToTechnicians } = useLocalSearchParams<{ technicianId?: string; returnToAvailable?: string; returnToTechnicians?: string }>();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [farmerAnimals, setFarmerAnimals] = useState<FarmerAnimal[]>([]);
  const [animalType, setAnimalType] = useState('');
  const [animalTypeId, setAnimalTypeId] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [animalBreed, setAnimalBreed] = useState('');
  const [animalBreedId, setAnimalBreedId] = useState('');
  const [approvedBreeds, setApprovedBreeds] = useState<BreedOption[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [animalTypeModal, setAnimalTypeModal] = useState(false);
  const [technicianModal, setTechnicianModal] = useState(false);
  const [animalQuantity, setAnimalQuantity] = useState('1');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uid, setUid] = useState('');
  const [farmerLocation, setFarmerLocation] = useState('');

  // Technicians
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState('');
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

      const [farmerDoc, directTechDoc, catalogResult, animalsSnapshot] = await Promise.all([
        firestore().collection(Collections.USERS).doc(session.uid).get().catch(() => null),
        technicianId ? firestore().collection(Collections.PUBLIC_PROFILES).doc(String(technicianId)).get().catch(() => null) : Promise.resolve(null),
        callBackend<{ additionalBreeds?: BreedOption[] }>('getServiceCatalog').catch(error => { setCatalogError(error.message || 'Approved breed options could not be loaded.'); return null; }),
        firestore().collection('animals').where('ownerId', '==', session.uid).get().catch(() => null),
      ]);
      setApprovedBreeds(catalogResult?.additionalBreeds || []);
      setFarmerAnimals((animalsSnapshot?.docs || []).map(doc => ({ id: doc.id, ...doc.data() }) as FarmerAnimal));
      const directTech = directTechDoc?.data();
      if (directTechDoc?.exists && directTech?.role === 'technician' && directTech.status === 'active') {
        const technician = { id: directTechDoc.id, ...directTech } as Technician;
        setSelectedTech(technician);
        setTechnicians([technician]);
      }
      setFarmerLocation(farmerDoc?.data()?.location || '');

      // Default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow);

      setLoading(false);
    };
    load();
  }, [technicianId]);

  useEffect(() => {
    if (!uid || !animalTypeId || !selectedService) return;
    let active = true;
    setCandidateLoading(true);
    setCandidateError('');
    callBackend<{ technicians: Technician[] }>('getEligibleTechnicians', {
      animalTypeId,
      serviceTypeId: selectedService,
      ...(selectedTime ? { date: dateKey(selectedDate), time: selectedTime } : {}),
    })
      .then(result => {
        if (!active) return;
        const candidates = result.technicians || [];
        setTechnicians(candidates);
        if (selectedTech && !candidates.some(tech => tech.id === selectedTech.id)) {
          setCandidateError('The selected technician does not provide this animal and service combination.');
        }
      })
      .catch(error => { if (active) setCandidateError(error.message || 'Qualified technicians could not be loaded.'); })
      .finally(() => { if (active) setCandidateLoading(false); });
    return () => { active = false; };
  }, [uid, animalTypeId, selectedService, selectedTech?.id, selectedTime, selectedDate]);

  const serviceOptions: ServiceItem[] = catalog.serviceTypes
    .filter(service => catalog.subSpecializations.some(item => item.serviceTypeId === service.id &&
      (!animalTypeId || item.animalTypeId === animalTypeId) &&
      (!selectedTech || isTechnicianQualified(selectedTech, item.animalTypeId, service.id))))
    .map(service => ({ ...service, iconName: service.iconName as IconName }));
  const animalTypeOptions = catalog.animalTypes.filter(type => farmerAnimals.some(animal => normalizeAnimalTypeId(animal.type || animal.name) === type.id) && catalog.subSpecializations.some(item =>
    item.animalTypeId === type.id && (!selectedService || item.serviceTypeId === selectedService) &&
    (!selectedTech || isTechnicianQualified(selectedTech, type.id, item.serviceTypeId))));
  const animalBreedOptions = [
    ...catalog.breeds.filter(breed => breed.animalTypeId === animalTypeId),
    ...approvedBreeds.filter(breed => breed.animalTypeId === animalTypeId),
  ];
  const breedCatalogUnavailable = !!catalogError && ['goat', 'horse'].includes(animalTypeId);
  const animalRecordsForType = farmerAnimals.filter(animal => normalizeAnimalTypeId(animal.type || animal.name) === animalTypeId);
  const selectedAnimal = farmerAnimals.find(animal => animal.id === selectedAnimalId) || null;
  const qualifiedTechnicians = technicians.filter(tech => selectedService && animalTypeId &&
    isTechnicianQualified(tech, animalTypeId, selectedService));

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-PH', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  };
  const techniciansForSlot = !candidateLoading && !candidateError && selectedTime ? qualifiedTechnicians : [];

  const moveToStep = (nextStep: number) => {
    Keyboard.dismiss();
    setStep(nextStep);
    requestAnimationFrame(() => formScroll.current?.scrollTo({ y: 0, animated: false }));
  };
  const continueForm = () => {
    if (step === 0 && !selectedService) { modalAlert('Service required', 'Select a service to continue.'); return; }
    if (step === 1 && breedCatalogUnavailable) { modalAlert('Breed options unavailable', 'We could not verify the approved breeds. Try again when online.'); return; }
    if (step === 1 && (!animalTypeId || !selectedAnimalId || (animalBreedOptions.length > 0 && !animalBreedId) || !Number.isSafeInteger(Number(animalQuantity)) || Number(animalQuantity) < 1 || Number(animalQuantity) > Number(selectedAnimal?.count || 1))) { modalAlert('Animal details required', 'Select one of your registered animals and enter a valid quantity.'); return; }
    if (step === 1 && !catalog.subSpecializations.some(item => item.animalTypeId === animalTypeId && item.serviceTypeId === selectedService)) { modalAlert('Service not supported', 'Choose a service offered for this animal type.'); return; }
    if (step === 2 && !selectedTime) { modalAlert('Time required', 'Select a preferred date and time to continue.'); return; }
    if (step === 2 && isPastTimeOnDate(selectedDate, selectedTime)) { modalAlert('Invalid time', 'Choose a time later than the current time.'); return; }
    if (step === 2 && candidateLoading) { modalAlert('Checking availability', 'Wait while we check qualified technicians for this time.'); return; }
    if (step === 2 && selectedTech && !techniciansForSlot.some(tech => tech.id === selectedTech.id)) { modalAlert('Technician unavailable', 'Choose another qualified technician or select All Qualified Technicians.'); return; }
    moveToStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!selectedService) { modalAlert('Error', 'Please select a service type.'); return; }
    if (breedCatalogUnavailable) { modalAlert('Breed options unavailable', 'We could not verify the approved breeds. Try again when online.'); return; }
    if (!animalTypeId || !selectedAnimalId || (animalBreedOptions.length > 0 && !animalBreedId) || !Number.isSafeInteger(Number(animalQuantity)) || Number(animalQuantity) < 1 || Number(animalQuantity) > Number(selectedAnimal?.count || 1)) { modalAlert('Error', 'Select one of your registered animals and enter a valid quantity.'); return; }
    if (!catalog.subSpecializations.some(item => item.animalTypeId === animalTypeId && item.serviceTypeId === selectedService)) { modalAlert('Service not supported', 'Choose a service offered for this animal type.'); return; }
    if (!selectedTime) { modalAlert('Error', 'Please select a preferred date and time.'); return; }
    if (isPastTimeOnDate(selectedDate, selectedTime)) { modalAlert('Invalid time', 'Choose a time later than the current time.'); return; }
    if (candidateLoading) { modalAlert('Checking availability', 'Wait while we check qualified technicians for this time.'); return; }
    if (selectedTech && !techniciansForSlot.some(tech => tech.id === selectedTech.id)) { modalAlert('Error', 'This technician is not qualified or available at the selected date and time.'); return; }
    if (!selectedTech && !techniciansForSlot.length) { modalAlert('No Qualified Technicians', 'No active technician is qualified and available for this animal, service, and time. Choose another time or service.'); return; }

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
      const serviceName = catalog.serviceTypes.find(s => s.id === selectedService)?.name || 'Service';
      const dateStr = dateKey(selectedDate);
      const requestResult = await callBackend<{ appointmentId: string; eligibleTechnicianCount: number }>('createServiceRequest', {
        serviceTypeId: selectedService,
        animalTypeId,
        animalRecordId: selectedAnimalId,
        animalBreedId,
        animalQuantity: Number(animalQuantity),
        technicianId: selectedTech?.id || '',
        date: dateStr,
        time: selectedTime,
        description: description.trim(),
        location: farmerLocation,
        appointmentLatitude: appointmentPosition.coords.latitude,
        appointmentLongitude: appointmentPosition.coords.longitude,
        appointmentLocationAccuracy: locationAccuracy ?? null,
      });
      const pickedBreed = animalBreed.trim();
      await logCrud('Service Requested', `${serviceName} for ${selectedAnimal?.name || animalType.trim()}`, 'appointments', requestResult.appointmentId, {
        old: {},
        new: { serviceType: serviceName, animalType: animalType.trim(), animalRecordId: selectedAnimalId, animalName: selectedAnimal?.name || animalType.trim(), animalBreed: pickedBreed, animalQuantity: Number(animalQuantity), date: dateStr, time: selectedTime, technician: selectedTech?.displayName || 'All qualified technicians' }
      });
      modalAlert('Success', selectedTech ? `Request sent to ${selectedTech.displayName}.` : `Request sent to ${requestResult.eligibleTechnicianCount} qualified technicians.`);
      setSelectedService(null); setAnimalType(''); setAnimalTypeId(''); setSelectedAnimalId(''); setAnimalBreed(''); setAnimalBreedId(''); setAnimalQuantity('1'); setDescription(''); setDescriptionHeight(100); setSelectedTime(''); setSelectedTech(null); moveToStep(0);
    } catch (e: any) { modalAlert('Error', e.message); }
    finally { setSubmitting(false); }
  };

  const chooseService = (id: string) => {
    setSelectedService(id);
    if (animalTypeId && !catalog.subSpecializations.some(item => item.animalTypeId === animalTypeId && item.serviceTypeId === id)) {
      setAnimalTypeId(''); setAnimalType(''); setSelectedAnimalId(''); setAnimalBreedId(''); setAnimalBreed(''); setAnimalQuantity('1');
    }
  };
  const chooseAnimalType = (id: string) => {
    const type = catalog.animalTypes.find(item => item.id === id);
    if (!type) return;
    setAnimalTypeId(type.id); setAnimalType(type.name); setSelectedAnimalId(''); setAnimalBreedId(''); setAnimalBreed(''); setAnimalQuantity('1');
    if (selectedService && !catalog.subSpecializations.some(item => item.animalTypeId === type.id && item.serviceTypeId === selectedService)) setSelectedService(null);
    setAnimalTypeModal(false);
  };
  const chooseAnimalRecord = (animal: FarmerAnimal) => {
    const typeId = normalizeAnimalTypeId(animal.type || animal.name);
    const breed = animalBreedOptions.find(item => item.animalTypeId === typeId && item.name.trim().toLowerCase() === String(animal.breed || '').trim().toLowerCase());
    setSelectedAnimalId(animal.id);
    setAnimalBreed(animal.breed || '');
    setAnimalBreedId(breed?.id || '');
    setAnimalQuantity(String(Math.max(1, Number(animal.count) || 1)));
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
          <Text style={{ color: Colors.textSecondary, marginBottom: 8 }}>{selectedTech ? `Services available from ${selectedTech.displayName}.` : 'Choose the service needed for your animal.'}</Text>
          {selectedTech && serviceOptions.length === 0 && <View style={s.emptyBox}>
            <Text style={s.emptyText}>This technician has no verified services. Select a qualified technician instead.</Text>
            <TouchableOpacity style={s.inlineAction} onPress={() => setSelectedTech(null)}><Text style={s.inlineActionText}>Choose any qualified technician</Text></TouchableOpacity>
          </View>}
          <View style={s.serviceGrid}>
            {serviceOptions.map((service) => (
              <TouchableOpacity key={service.id} accessibilityRole="button" accessibilityState={{ selected: selectedService === service.id }} style={s.serviceItem} onPress={() => chooseService(service.id)}>
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
          <TouchableOpacity style={[s.selectRow, !animalTypeOptions.length && s.disabledRow]} onPress={() => setAnimalTypeModal(true)} disabled={!animalTypeOptions.length} accessibilityRole="button" accessibilityLabel="Select animal type from your registered animals">
            <Text style={s.selectRowText}>{animalType || (animalTypeOptions.length ? 'Select animal type' : 'No registered animals for this service')}</Text>{!!animalTypeOptions.length && <Icon name="chevron-down" size={18} color={Colors.textSecondary} />}
          </TouchableOpacity>
          {!animalTypeOptions.length && <TouchableOpacity style={s.inlineAction} onPress={() => router.push('/(farmer)/home/my-animals')} accessibilityRole="button"><Text style={s.inlineActionText}>Add an animal record</Text></TouchableOpacity>}
          {animalTypeId ? <>
            <Text style={s.fieldLabel}>Select your animal</Text>
            {animalRecordsForType.length ? <View style={s.animalRecordList}>{animalRecordsForType.map(animal => (
              <TouchableOpacity key={animal.id} style={[s.animalRecordCard, selectedAnimalId === animal.id && s.animalRecordCardActive]} onPress={() => chooseAnimalRecord(animal)} accessibilityRole="radio" accessibilityState={{ selected: selectedAnimalId === animal.id }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.animalRecordName}>{animal.name || animalType}</Text>
                  <Text style={s.animalRecordMeta}>{[animal.breed, `Quantity: ${animal.count || 1}`, animal.age ? `Age: ${animal.age} ${animal.ageUnit || 'years'}` : ''].filter(Boolean).join(' · ')}</Text>
                </View>
                {selectedAnimalId === animal.id && <Icon name="check" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            ))}</View> : <Text style={s.candidateHint}>No records found for this animal type.</Text>}
            {selectedAnimal && <>
              <Text style={s.fieldLabel}>Breed</Text>
              <View style={[s.selectRow, s.disabledRow]}><Text style={s.selectRowText}>{animalBreed || 'No breed recorded'}</Text></View>
              {!!animalBreed && animalBreedOptions.length > 0 && !animalBreedId && <Text style={s.errorHint}>This record’s breed is not in the approved list. Update the breed in My Animals first.</Text>}
              <Text style={s.fieldLabel}>Quantity</Text>
              <TextInput style={s.formInput} value={animalQuantity} onChangeText={value => setAnimalQuantity(value.replace(/[^0-9]/g, ''))} placeholder="Number of animals" placeholderTextColor={Colors.textLight} keyboardType="number-pad" />
              <Text style={s.candidateHint}>Maximum for this record: {selectedAnimal.count || 1}</Text>
            </>}
          </> : <Text style={s.candidateHint}>Select an animal type to see your registered animal records.</Text>}
          {!!catalogError && ['goat', 'horse'].includes(animalTypeId) && <Text style={s.errorHint}>Approved breed options could not be checked. Try again when online.</Text>}
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
          <TouchableOpacity style={s.selectRow} onPress={() => setTechnicianModal(true)} accessibilityRole="button" accessibilityLabel="Choose preferred technician">
            <View style={s.selectRowLeft}>
              {selectedTech ? (
                <Avatar name={selectedTech.displayName} imageUrl={selectedTech.photoURL} size={36} />
              ) : (
                <View style={[s.thumb, { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }]}><Icon name="profile" size={18} color={Colors.textLight} /></View>
              )}
              <View>
                <Text style={s.selectRowText}>{selectedTech?.displayName || 'All qualified technicians'}</Text>
                {selectedTech?.specialization ? <Text style={{ fontSize: 11, color: Colors.textSecondary }}>{selectedTech.specialization}</Text> : null}
              </View>
            </View>
            <Icon name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={{ color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: Spacing.sm }}>{selectedTech ? 'This request is directed to this qualified technician.' : 'Only technicians qualified for this animal and service can receive the request.'}</Text>
          {selectedTech && <Text style={{ color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: Spacing.sm }}>The technician has 1 day to accept. If they don’t, this request becomes available to all technicians.</Text>}
          {candidateLoading ? <Text style={s.candidateHint}>Checking technician qualifications and availability…</Text>
            : candidateError ? <Text style={s.errorHint}>{candidateError}</Text>
              : techniciansForSlot.length === 0 ? <Text style={s.errorHint}>No qualified technician is available at this date and time. Try another time or service.</Text>
                : <Text style={s.candidateHint}>{techniciansForSlot.length} qualified technician{techniciansForSlot.length === 1 ? '' : 's'} available.</Text>}
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
              <Text style={s.reviewValue}>{catalog.serviceTypes.find(service => service.id === selectedService)?.name || 'Service'}</Text>
            </View>
            <View style={s.reviewCard}>
              <View style={s.reviewHead}><Text style={s.reviewLabel}>ANIMAL DETAILS</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Edit animal details" onPress={() => moveToStep(1)}><Text style={s.reviewEdit}>Edit</Text></TouchableOpacity></View>
              <Text style={s.reviewValue}>{selectedAnimal?.name || animalType.trim()} · {animalType.trim()}{animalBreed ? ` · ${animalBreed.trim()}` : ''}</Text>
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

      <Modal visible={animalTypeModal} transparent animationType="slide" onRequestClose={() => setAnimalTypeModal(false)}>
        <View style={s.modalRoot}><TouchableOpacity style={s.modalBackdrop} onPress={() => setAnimalTypeModal(false)} /><View style={s.modalSheet}>
          <Text style={s.modalTitle}>Select from your animal records</Text>
          <ScrollView>{animalTypeOptions.map(type => <TouchableOpacity key={type.id} style={s.modalOption} onPress={() => chooseAnimalType(type.id)}>
            <Icon name={type.iconName as IconName} size={22} color={Colors.primary} /><Text style={s.modalOptionText}>{type.name}</Text>
          </TouchableOpacity>)}</ScrollView>
        </View></View>
      </Modal>
      <Modal visible={technicianModal} transparent animationType="slide" onRequestClose={() => setTechnicianModal(false)}>
        <View style={s.modalRoot}><TouchableOpacity style={s.modalBackdrop} onPress={() => setTechnicianModal(false)} /><View style={s.modalSheet}>
          <Text style={s.modalTitle}>Choose a technician</Text>
          <ScrollView>
            <TouchableOpacity style={s.modalOption} onPress={() => { setSelectedTech(null); setTechnicianModal(false); }}>
              <View><Text style={s.modalOptionText}>All qualified technicians</Text><Text style={s.modalOptionHint}>Send to every eligible technician</Text></View>{!selectedTech && <Icon name="check" size={20} color={Colors.primary} />}
            </TouchableOpacity>
            {candidateLoading ? <ActivityIndicator style={{ padding: Spacing.lg }} color={Colors.primary} />
              : !selectedTime ? <Text style={s.modalOptionHint}>Select a date and time to find available technicians.</Text>
                : candidateError ? <Text style={s.errorHint}>{candidateError}</Text>
                  : techniciansForSlot.length ? techniciansForSlot.map(tech => <TouchableOpacity key={tech.id} style={s.modalOption} onPress={() => { setSelectedTech(tech); setTechnicianModal(false); }}>
                    <Avatar name={tech.displayName} imageUrl={tech.photoURL} size={36} /><View style={{ flex: 1 }}><Text style={s.modalOptionText}>{tech.displayName}</Text>{!!tech.specialization && <Text style={s.modalOptionHint}>{tech.specialization}</Text>}</View>{selectedTech?.id === tech.id && <Icon name="check" size={20} color={Colors.primary} />}
                  </TouchableOpacity>)
                  : <Text style={s.errorHint}>No qualified technician is available for the selected animal, service, and time.</Text>}
          </ScrollView>
        </View></View>
      </Modal>

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
  disabledRow: { opacity: 0.65 },
  animalRecordList: { gap: Spacing.sm, marginTop: Spacing.xs },
  animalRecordCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 64, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, backgroundColor: Colors.white },
  animalRecordCardActive: { borderColor: Colors.primary, backgroundColor: '#EAF6EF' },
  animalRecordName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  animalRecordMeta: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
  candidateHint: { color: Colors.primary, fontSize: FontSize.xs, marginTop: Spacing.sm },
  errorHint: { color: Colors.error, fontSize: FontSize.xs, marginTop: Spacing.sm },
  emptyBox: { padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  inlineAction: { paddingTop: Spacing.sm },
  inlineActionText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { maxHeight: '75%', backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl, paddingBottom: Spacing.xl },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md },
  modalOption: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: Spacing.md },
  modalOptionText: { flex: 1, color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  modalOptionHint: { color: Colors.textSecondary, fontSize: FontSize.xs, paddingVertical: Spacing.sm },
});

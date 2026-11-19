import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import { AppText as Text } from '@/components/ui/FontScale';
import { Icon } from '@/components/ui';
import { modalAlert } from '@/components/ui/ModalAlert';
import { BorderRadius, Colors, FontSize, Shadow, Spacing } from '@/constants/theme';
import { acceptAppointment, declineAppointment } from '@/services/appointmentService';
import { Collections } from '@/services/firebase';
import type { ServiceRequest } from '@/utils/technicianRequests';

interface Props {
  request: ServiceRequest | null;
  technicianId: string;
  technicianName: string;
  onClose: () => void;
}

const Detail = ({ icon, label, value }: { icon: 'paw' | 'farmer' | 'calendar' | 'clock' | 'location' | 'clipboard'; label: string; value?: string | number | null }) => (
  <View style={s.detail}>
    <View style={s.detailIcon}><Icon name={icon} size={17} color={Colors.primary} /></View>
    <View style={s.detailText}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value === undefined || value === null || value === '' ? 'Not provided' : String(value)}</Text>
    </View>
  </View>
);

const isCoordinateText = (value: string) => /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim());

export default function ServiceRequestDetailsDrawer({ request, technicianId, technicianName, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [farmerLocation, setFarmerLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const actionInFlight = useRef(false);
  const handledRequestId = useRef<string | null>(null);

  useEffect(() => {
    let current = true;
    const savedLocation = request?.location?.trim() || '';
    if (savedLocation && !isCoordinateText(savedLocation)) {
      setFarmerLocation(savedLocation);
      return () => { current = false; };
    }
    setFarmerLocation('');
    if (!request?.farmerId) return () => { current = false; };
    void firestore().collection(Collections.USERS).doc(request.farmerId).get()
      .then(doc => {
        const location = doc.data()?.location;
        if (current && typeof location === 'string' && location.trim() && !isCoordinateText(location)) {
          setFarmerLocation(location.trim());
        }
      })
      .catch(error => console.warn('Farmer address load failed:', error.message));
    return () => { current = false; };
  }, [request?.id, request?.farmerId, request?.location]);

  const respond = (action: 'accept' | 'decline') => {
    if (!request || busy || actionInFlight.current || handledRequestId.current === request.id) return;
    const accept = action === 'accept';
    modalAlert(accept ? 'Accept request?' : 'Decline request?', `${request.serviceType} for ${request.animalType || request.animalName || 'the animal'} from ${request.farmerName || 'the farmer'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: accept ? 'Accept' : 'Decline', style: accept ? 'default' : 'destructive', onPress: async () => {
        if (actionInFlight.current || handledRequestId.current === request.id) return;
        actionInFlight.current = true;
        setBusy(true);
        try {
          let alreadyAccepted = false;
          if (accept) {
            const result = await acceptAppointment({
              appointmentId: request.id,
              serviceType: request.serviceType,
              animalName: request.animalName,
              date: request.date,
              time: request.time,
              farmerId: request.farmerId,
              farmerName: request.farmerName,
              technicianId,
              technicianName,
              location: request.location,
            });
            alreadyAccepted = result.alreadyAccepted;
          } else {
            await declineAppointment({
              appointmentId: request.id,
              serviceType: request.serviceType,
              animalName: request.animalName,
              farmerId: request.farmerId,
              farmerName: request.farmerName,
              technicianId,
              technicianName,
            });
          }
          handledRequestId.current = request.id;
          onClose();
          modalAlert(accept ? 'Request accepted' : 'Request declined', accept ? (alreadyAccepted ? 'This request was already accepted.' : 'The request is confirmed.') : 'The farmer has been notified.');
        } catch (error: any) {
          if (error?.message?.includes('no longer pending') || error?.message?.includes('no longer available')) onClose();
          modalAlert('Unable to update request', error?.message || 'Please try again.');
        } finally {
          actionInFlight.current = false;
          setBusy(false);
        }
      } },
    ]);
  };

  return (
    <Modal visible={!!request} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close request details" />
        <View style={[s.drawer, { paddingTop: Math.max(insets.top, Spacing.md), paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <View style={s.header}>
            <View style={s.headerCopy}>
              <Text style={s.kicker}>FARMER SERVICE REQUEST</Text>
              <Text style={s.title}>Request details</Text>
            </View>
            <TouchableOpacity style={s.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close request details" hitSlop={8}>
              <Icon name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {request ? <>
            <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
              <View style={s.serviceCard}>
                <View style={s.serviceIcon}><Icon name="services" size={22} color={Colors.primary} /></View>
                <View style={s.serviceCopy}>
                  <Text style={s.serviceTitle}>{request.serviceType || 'Service request'}</Text>
                  <Text style={s.status}>Pending response</Text>
                </View>
              </View>
              <Text style={s.sectionTitle}>Appointment</Text>
              <View style={s.detailCard}>
                <Detail icon="calendar" label="Preferred date" value={formatDate(request.date)} />
                <Detail icon="clock" label="Preferred time" value={request.time} />
              </View>
              <Text style={s.sectionTitle}>Animal</Text>
              <View style={s.detailCard}>
                {!!request.animalType && <Detail icon="paw" label="Animal type" value={request.animalType} />}
                <Detail icon="paw" label="Breed" value={request.animalBreed} />
                <Detail icon="paw" label="Quantity" value={request.animalQuantity} />
              </View>
              <Text style={s.sectionTitle}>Farmer and location</Text>
              <View style={s.detailCard}>
                <Detail icon="farmer" label="Farmer" value={request.farmerName} />
                <Detail icon="location" label="Farm location" value={farmerLocation || 'Address unavailable'} />
              </View>
              <Text style={s.sectionTitle}>Request notes</Text>
              <View style={s.notesCard}>
                <Text style={s.notes}>{request.description?.trim() || 'No additional notes from the farmer.'}</Text>
              </View>
            </ScrollView>
            <View style={s.actions}>
              <TouchableOpacity style={[s.declineButton, busy && s.disabled]} onPress={() => respond('decline')} disabled={busy} accessibilityRole="button" accessibilityLabel="Decline service request">
                <Icon name="close" size={18} color={Colors.error} /><Text style={s.declineText}>{busy ? 'Please wait…' : 'Decline'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.acceptButton, busy && s.disabled]} onPress={() => respond('accept')} disabled={busy} accessibilityRole="button" accessibilityLabel="Accept service request">
                <Icon name="check" size={18} color={Colors.white} /><Text style={s.acceptText}>{busy ? 'Please wait…' : 'Accept'}</Text>
              </TouchableOpacity>
            </View>
          </> : null}
        </View>
      </View>
    </Modal>
  );
}

const formatDate = (date: string) => {
  if (!date) return 'Not specified';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.48)' },
  drawer: { height: '92%', overflow: 'hidden', backgroundColor: Colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, ...Shadow.heavy },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerCopy: { flex: 1 },
  kicker: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.7 },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginTop: 3 },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: '#EAF8EF', marginBottom: Spacing.lg },
  serviceIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  serviceCopy: { flex: 1 },
  serviceTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  status: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600', marginTop: 3 },
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm, marginTop: Spacing.xs },
  detailCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, marginBottom: Spacing.md, ...Shadow.light },
  detail: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 64, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EAF8EF', alignItems: 'center', justifyContent: 'center' },
  detailText: { flex: 1 },
  label: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
  value: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600', marginTop: 2 },
  notesCard: { padding: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, ...Shadow.light },
  notes: { color: Colors.text, fontSize: FontSize.sm, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  declineButton: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: BorderRadius.lg, backgroundColor: '#FEE2E2' },
  declineText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '700' },
  acceptButton: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary },
  acceptText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  disabled: { opacity: 0.55 },
});

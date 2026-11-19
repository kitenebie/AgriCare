import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/ui/FontScale';
import { Icon } from '@/components/ui';
import { BorderRadius, Colors, FontSize, Shadow, Spacing } from '@/constants/theme';

export interface MapServiceRequest {
  id: string;
  serviceType: string;
  statusLabel: string;
  statusColor: string;
  statusBackground: string;
  animalName: string;
  animalType?: string;
  animalBreed?: string;
  animalQuantity?: string | number;
  farmerName?: string;
  technicianName?: string;
  date: string;
  time: string;
  location: string;
  description?: string;
}

export default function MapServiceRequestDetailsDrawer({ request, onClose }: { request: MapServiceRequest | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const animalDetails = [request?.animalBreed && `Breed: ${request.animalBreed}`, request?.animalQuantity && `Quantity: ${request.animalQuantity}`].filter(Boolean).join(' · ');
  const location = request?.location?.trim() || '';
  const isCoordinateLocation = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(location);

  return (
    <Modal visible={!!request} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close request details" />
        <View style={[s.drawer, { paddingTop: Math.max(insets.top, Spacing.md), paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <View style={s.header}>
            <View style={s.headerText}>
              <Text style={s.kicker}>AGRICARE • MAP REQUEST</Text>
              <Text style={s.title}>Service request details</Text>
            </View>
            <TouchableOpacity style={s.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close request details" hitSlop={8}>
              <Icon name="close" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
          {request ? (
            <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
              <View style={s.summary}>
                <View style={[s.statusBadge, { backgroundColor: request.statusBackground }]}>
                  <View style={[s.statusDot, { backgroundColor: request.statusColor }]} />
                  <Text style={[s.statusText, { color: request.statusColor }]}>{request.statusLabel}</Text>
                </View>
                <Text style={s.service}>{request.serviceType || 'Service request'}</Text>
                {!!request.animalType && <Text style={s.animal}>{request.animalType}</Text>}
              </View>
              {!!animalDetails && <Detail icon="paw" label="Animal details" value={animalDetails} />}
              <Detail icon="calendar" label="Preferred schedule" value={`${formatDate(request.date)} · ${request.time || 'Time not set'}`} />
              <Detail icon="farmer" label="Farmer" value={request.farmerName || 'Farmer'} />
              <Detail icon="technician" label="Technician" value={request.technicianName || 'Not assigned yet'} />
              <Detail icon="location" label="Farm location" value={location && !isCoordinateLocation ? location : 'Address unavailable'} />
              <View style={s.detailCard}>
                <View style={s.detailHeading}><View style={s.detailIcon}><Icon name="messages" size={18} color={Colors.primary} /></View><Text style={s.detailLabel}>Issue / request details</Text></View>
                <Text style={s.description}>{request.description?.trim() || 'No additional details provided.'}</Text>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function Detail({ icon, label, value }: { icon: 'paw' | 'calendar' | 'farmer' | 'technician' | 'location'; label: string; value: string }) {
  return (
    <View style={s.detailCard}>
      <View style={s.detailHeading}><View style={s.detailIcon}><Icon name={icon} size={18} color={Colors.primary} /></View><Text style={s.detailLabel}>{label}</Text></View>
      <Text style={s.description}>{value}</Text>
    </View>
  );
}

function formatDate(date: string) {
  if (!date) return 'Date not set';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9, 25, 17, 0.58)' },
  drawer: { height: '92%', overflow: 'hidden', backgroundColor: Colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, ...Shadow.heavy },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.primary },
  headerText: { flex: 1 },
  kicker: { color: '#D6F4DE', fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.7 },
  title: { color: Colors.white, fontSize: FontSize.xl, fontWeight: '800', marginTop: 3 },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
  summary: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.light },
  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: BorderRadius.full },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },
  service: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.md },
  animal: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600', marginTop: Spacing.xs },
  detailCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadow.light },
  detailHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  detailIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9' },
  detailLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },
  description: { color: Colors.text, fontSize: FontSize.md, lineHeight: 22 },
});

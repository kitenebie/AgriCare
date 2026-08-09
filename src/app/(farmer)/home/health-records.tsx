import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';

interface HealthRecord {
  id: string;
  animalId: string;
  animalName: string;
  recordType: string;
  diagnosis: string;
  symptoms: string[];
  treatment: string;
  medication: string;
  dosage: string;
  weight: number | null;
  temperature: number | null;
  technicianName: string;
  status: string;
  notes: string;
  date: any;
  nextFollowUp: any;
  requiresFollowUp: boolean;
  vaccineType?: string;
  createdAt: any;
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  checkup: { color: '#2196F3', bg: '#E3F2FD', icon: 'health-check' },
  vaccination: { color: '#4CAF50', bg: '#E8F5E9', icon: 'vaccination' },
  treatment: { color: '#FF9800', bg: '#FFF3E0', icon: 'treatment' },
  surgery: { color: '#9C27B0', bg: '#F3E5F5', icon: 'treatment' },
  deworming: { color: '#795548', bg: '#EFEBE9', icon: 'bug' },
  lab_test: { color: '#607D8B', bg: '#ECEFF1', icon: 'clipboard' },
  emergency: { color: '#F44336', bg: '#FFEBEE', icon: 'alert' },
  follow_up: { color: '#009688', bg: '#E0F2F1', icon: 'calendar' },
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  resolved: { color: '#4CAF50', bg: '#E8F5E9' },
  ongoing: { color: '#FF9800', bg: '#FFF3E0' },
  monitoring: { color: '#2196F3', bg: '#E3F2FD' },
};

export default function FarmerHealthRecordsPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const headerAnim = useFadeIn(100);
  const contentAnim = useFadeInUp(200);

  useEffect(() => {
    let unsub: () => void = () => {};
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }

      // Listen to health records for this farmer's animals
      unsub = firestore()
        .collection('healthRecords')
        .where('farmerId', '==', session.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot(
          (snap) => {
            setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as HealthRecord)));
            setLoading(false);
          },
          (err) => {
            console.warn('Health records error:', err);
            setLoading(false);
          }
        );
    };
    load();
    return () => unsub();
  }, []);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Health Records</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} style={s.content}>
        {records.length === 0 ? (
          <View style={s.empty}>
            <Icon name="clipboard" size={56} color={Colors.textLight} />
            <Text style={s.emptyText}>No health records yet</Text>
            <Text style={s.emptySubtext}>Health records from technician visits{'\n'}will appear here</Text>
          </View>
        ) : (
          <>
            <Text style={s.count}>{records.length} record{records.length !== 1 ? 's' : ''}</Text>
            {records.map((record) => {
              const typeConfig = TYPE_CONFIG[record.recordType] || TYPE_CONFIG.checkup;
              const statusConfig = STATUS_COLORS[record.status] || STATUS_COLORS.monitoring;
              const isExpanded = expandedId === record.id;

              return (
                <TouchableOpacity
                  key={record.id}
                  style={s.card}
                  activeOpacity={0.8}
                  onPress={() => setExpandedId(isExpanded ? null : record.id)}
                >
                  {/* Card Header */}
                  <View style={s.cardHeader}>
                    <View style={[s.typeIcon, { backgroundColor: typeConfig.bg }]}>
                      <Icon name={typeConfig.icon as any} size={20} color={typeConfig.color} />
                    </View>
                    <View style={s.cardHeaderInfo}>
                      <Text style={s.cardAnimal}>{record.animalName}</Text>
                      <Text style={s.cardType}>{record.recordType.replace('_', ' ')}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: statusConfig.bg }]}>
                      <Text style={[s.statusText, { color: statusConfig.color }]}>{record.status}</Text>
                    </View>
                  </View>

                  {/* Diagnosis */}
                  {record.diagnosis ? <Text style={s.diagnosis}>{record.diagnosis}</Text> : null}

                  {/* Date & Technician */}
                  <View style={s.metaRow}>
                    <View style={s.metaItem}>
                      <Icon name="calendar" size={12} color={Colors.textSecondary} />
                      <Text style={s.metaText}>{formatDate(record.date)}</Text>
                    </View>
                    <View style={s.metaItem}>
                      <Icon name="profile" size={12} color={Colors.textSecondary} />
                      <Text style={s.metaText}>{record.technicianName}</Text>
                    </View>
                  </View>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <View style={s.details}>
                      {/* Symptoms */}
                      {record.symptoms && record.symptoms.length > 0 && (
                        <View style={s.detailSection}>
                          <Text style={s.detailLabel}>Symptoms</Text>
                          <View style={s.chipRow}>
                            {record.symptoms.map((sym, i) => (
                              <View key={i} style={s.chip}><Text style={s.chipText}>{sym}</Text></View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Treatment */}
                      {record.treatment ? (
                        <View style={s.detailSection}>
                          <Text style={s.detailLabel}>Treatment</Text>
                          <Text style={s.detailValue}>{record.treatment}</Text>
                        </View>
                      ) : null}

                      {/* Medication & Dosage */}
                      {record.medication ? (
                        <View style={s.detailSection}>
                          <Text style={s.detailLabel}>Medication</Text>
                          <Text style={s.detailValue}>{record.medication}{record.dosage ? ` — ${record.dosage}` : ''}</Text>
                        </View>
                      ) : null}

                      {/* Vaccine Type */}
                      {record.vaccineType ? (
                        <View style={s.detailSection}>
                          <Text style={s.detailLabel}>Vaccine</Text>
                          <Text style={s.detailValue}>{record.vaccineType}</Text>
                        </View>
                      ) : null}

                      {/* Weight & Temperature */}
                      <View style={s.vitalRow}>
                        {record.weight ? (
                          <View style={s.vitalItem}>
                            <Text style={s.vitalLabel}>Weight</Text>
                            <Text style={s.vitalValue}>{record.weight} kg</Text>
                          </View>
                        ) : null}
                        {record.temperature ? (
                          <View style={s.vitalItem}>
                            <Text style={s.vitalLabel}>Temperature</Text>
                            <Text style={s.vitalValue}>{record.temperature}°C</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Notes */}
                      {record.notes ? (
                        <View style={s.detailSection}>
                          <Text style={s.detailLabel}>Notes</Text>
                          <Text style={s.detailValue}>{record.notes}</Text>
                        </View>
                      ) : null}

                      {/* Follow-up */}
                      {record.requiresFollowUp && record.nextFollowUp && (
                        <View style={s.followUpBanner}>
                          <Icon name="calendar" size={14} color="#F59E0B" />
                          <Text style={s.followUpText}>Follow-up scheduled: {formatDate(record.nextFollowUp)}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Expand hint */}
                  <View style={s.expandHint}>
                    <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={16} color={Colors.textLight} />
                    <Text style={s.expandText}>{isExpanded ? 'Tap to collapse' : 'Tap for details'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  // Content
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  count: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  // Empty
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.lg },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4, textAlign: 'center', lineHeight: 20 },
  // Card
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.light },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardHeaderInfo: { flex: 1, marginLeft: Spacing.md },
  cardAnimal: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardType: { fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  // Diagnosis
  diagnosis: { fontSize: FontSize.sm, color: Colors.text, marginTop: Spacing.sm, fontStyle: 'italic' },
  // Meta
  metaRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  // Expanded details
  details: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  detailSection: { marginBottom: Spacing.md },
  detailLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  chipText: { fontSize: FontSize.xs, color: '#E65100', fontWeight: '500' },
  // Vitals
  vitalRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  vitalItem: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  vitalLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  vitalValue: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  // Follow-up
  followUpBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: BorderRadius.md, padding: Spacing.md },
  followUpText: { fontSize: FontSize.sm, color: '#D97706', fontWeight: '600' },
  // Expand hint
  expandHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: Spacing.sm, paddingTop: Spacing.sm },
  expandText: { fontSize: FontSize.xs, color: Colors.textLight },
});

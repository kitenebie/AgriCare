import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { modalAlert } from '@/components/ui/ModalAlert';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { logCrud } from '@/services/logService';

interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  targetId: string | null;
  targetName: string | null;
  type: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: any;
  resolvedAt?: any;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');

  useEffect(() => {
    const unsubscribe = firestore()
      .collection(Collections.REPORTS)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const data: Report[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Report[];
          setReports(data);
          setLoading(false);
        },
        (error) => {
          console.warn('Reports listener error:', error.message);
          setLoading(false);
        }
      );
    return () => unsubscribe();
  }, []);

  const filteredReports = reports.filter((r) => filter === 'all' || r.status === filter);

  const handleUpdateStatus = (report: Report, newStatus: 'resolved' | 'dismissed') => {
    const label = newStatus === 'resolved' ? 'Resolve' : 'Dismiss';
    modalAlert(`${label} Report`, `Mark this report as ${newStatus}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        onPress: async () => {
          try {
            await firestore().collection(Collections.REPORTS).doc(report.id).set(
              {
                status: newStatus,
                resolvedAt: firestore.FieldValue.serverTimestamp(),
                updatedAt: firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            await logCrud('Report Status Updated', `Report ${newStatus}: ${report.description.slice(0, 50)}`, 'reports', report.id);
          } catch (err: any) {
            modalAlert('Error', err.message || 'Failed to update.');
          }
        },
      },
    ]);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#FEF3C7', color: '#D97706' };
      case 'resolved': return { bg: '#DCFCE7', color: '#15803D' };
      case 'dismissed': return { bg: '#F1F5F9', color: '#64748B' };
      default: return { bg: '#F1F5F9', color: '#64748B' };
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports & Complaints</Text>
        <Text style={styles.headerCount}>{reports.length}</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'resolved', 'dismissed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reports List */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filteredReports.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="clipboard" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No reports found</Text>
          </View>
        ) : (
          filteredReports.map((report) => {
            const statusStyle = getStatusStyle(report.status);
            return (
              <View key={report.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Avatar name={report.reporterName} size={36} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.reporterName}>{report.reporterName}</Text>
                      <Text style={styles.reporterRole}>{report.reporterRole}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>{report.status}</Text>
                  </View>
                </View>

                <View style={styles.typeBadge}>
                  <Icon name="alert" size={12} color={Colors.error} />
                  <Text style={styles.typeText}>{report.type}</Text>
                </View>

                <Text style={styles.description}>{report.description}</Text>

                {report.targetName && (
                  <Text style={styles.target}>Reported: {report.targetName}</Text>
                )}

                {/* Actions for pending reports */}
                {report.status === 'pending' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.resolveBtn}
                      onPress={() => handleUpdateStatus(report, 'resolved')}
                    >
                      <Icon name="health-check" size={14} color={Colors.white} />
                      <Text style={styles.resolveBtnText}>Resolve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dismissBtn}
                      onPress={() => handleUpdateStatus(report, 'dismissed')}
                    >
                      <Text style={styles.dismissBtnText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Colors.textSecondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  headerCount: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white, fontWeight: '700' },
  list: { flex: 1, paddingHorizontal: Spacing.lg },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.light },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardInfo: {},
  reporterName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  reporterRole: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.md, backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  typeText: { fontSize: 11, color: Colors.error, fontWeight: '600' },
  description: { fontSize: FontSize.md, color: Colors.text, marginTop: Spacing.md, lineHeight: 20 },
  target: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  resolveBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  dismissBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  dismissBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
});

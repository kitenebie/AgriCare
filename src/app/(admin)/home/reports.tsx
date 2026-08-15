import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { modalAlert } from '@/components/ui/ModalAlert';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { logCrud } from '@/services/logService';
import { sendPushNotification } from '@/services/pushService';
import { getSession } from '@/services/sessionService';

interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  targetId?: string | null;
  targetName?: string | null;
  reportedUserId?: string;
  reportedUserName?: string;
  type: string;
  description: string;
  postTitle?: string;
  postContent?: string;
  replyContent?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: any;
  resolvedAt?: any;
  adminResponse?: string;
}

// ─── Forum Ban Categories ───
type ForumBanCategory = 'account_suspension' | 'account_deactivation' | 'post_reply_suspension';

const FORUM_BAN_CATEGORIES: { value: ForumBanCategory; label: string; description: string; isLifetime: boolean }[] = [
  {
    value: 'account_suspension',
    label: 'Account Suspension',
    description: 'User cannot login for the specified number of days',
    isLifetime: false,
  },
  {
    value: 'account_deactivation',
    label: 'Account Deactivation',
    description: 'Lifetime ban — user permanently loses access',
    isLifetime: true,
  },
  {
    value: 'post_reply_suspension',
    label: 'Suspension to Reply & Post',
    description: 'User cannot create posts or replies for the specified number of days',
    isLifetime: false,
  },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [adminName, setAdminName] = useState('Admin');

  // Ban modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedBanCategory, setSelectedBanCategory] = useState<ForumBanCategory | null>(null);
  const [banDays, setBanDays] = useState('');
  const [adminResponse, setAdminResponse] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadAdmin = async () => {
      const session = await getSession();
      if (session) setAdminName(session.displayName || 'Admin');
    };
    loadAdmin();

    const unsubscribe = firestore()
      .collection(Collections.REPORTS)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const data: Report[] = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }) as Report)
            .filter((r) => r.type === 'forum_post' || r.type === 'forum_reply');
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

  // ─── Open Ban Modal ───
  const openBanModal = (report: Report) => {
    setSelectedReport(report);
    setSelectedBanCategory(null);
    setBanDays('');
    setAdminResponse('');
    setShowBanModal(true);
  };

  // ─── Apply Forum Ban ───
  const handleApplyBan = async () => {
    if (!selectedReport || !selectedBanCategory) {
      modalAlert('Error', 'Please select a ban category.');
      return;
    }

    const category = FORUM_BAN_CATEGORIES.find(c => c.value === selectedBanCategory)!;
    const reportedUserId = selectedReport.reportedUserId || selectedReport.targetId;
    const reportedUserName = selectedReport.reportedUserName || selectedReport.targetName || 'Unknown';

    if (!reportedUserId) {
      modalAlert('Error', 'Cannot identify the reported user.');
      return;
    }

    // Validate days for non-lifetime bans
    if (!category.isLifetime) {
      const days = parseInt(banDays);
      if (!days || days < 1) {
        modalAlert('Error', 'Please enter a valid number of days (minimum 1).');
        return;
      }
    }

    const days = category.isLifetime ? -1 : parseInt(banDays);
    const durationLabel = category.isLifetime ? 'Permanent (Lifetime)' : `${days} day${days > 1 ? 's' : ''}`;

    modalAlert(
      '⚠️ Confirm Ban',
      `Apply "${category.label}" (${durationLabel}) to ${reportedUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const banUntil = category.isLifetime
                ? null
                : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

              // Build user update based on category
              const userUpdate: any = {
                bannedAt: firestore.FieldValue.serverTimestamp(),
                bannedBy: adminName,
                banCategory: selectedBanCategory,
                banDuration: durationLabel,
                banReason: adminResponse.trim() || `Forum violation: ${selectedReport!.description?.substring(0, 100) || selectedReport!.postTitle || 'Reported content'}`,
              };

              if (selectedBanCategory === 'account_deactivation') {
                userUpdate.status = 'deactivated';
                userUpdate.banUntil = null;
              } else if (selectedBanCategory === 'account_suspension') {
                userUpdate.status = 'banned';
                userUpdate.banUntil = firestore.Timestamp.fromDate(banUntil!);
              } else if (selectedBanCategory === 'post_reply_suspension') {
                userUpdate.forumBanned = true;
                userUpdate.forumBanUntil = firestore.Timestamp.fromDate(banUntil!);
              }

              // Update user
              await firestore().collection(Collections.USERS).doc(reportedUserId).update(userUpdate);

              // Update report status
              await firestore().collection(Collections.REPORTS).doc(selectedReport!.id).update({
                status: 'resolved',
                adminAction: `forum_ban_${selectedBanCategory}`,
                adminResponse: adminResponse.trim() || `${category.label} applied for ${durationLabel}.`,
                adminName,
                resolvedAt: firestore.FieldValue.serverTimestamp(),
              });

              // Notify reported user
              const notifTitle = selectedBanCategory === 'account_deactivation'
                ? '🚫 Account Deactivated'
                : selectedBanCategory === 'account_suspension'
                  ? '⛔ Account Suspended'
                  : '🚫 Forum Posting Suspended';

              const notifBody = selectedBanCategory === 'account_deactivation'
                ? 'Your account has been permanently deactivated due to forum violation. Contact support for appeal.'
                : selectedBanCategory === 'account_suspension'
                  ? `Your account has been suspended for ${durationLabel} due to forum violation.`
                  : `You have been suspended from posting and replying in the forum for ${durationLabel}.`;

              await firestore().collection(Collections.NOTIFICATIONS).add({
                userId: reportedUserId,
                type: 'account_action',
                title: notifTitle,
                body: notifBody,
                read: false,
                data: { action: selectedBanCategory, duration: durationLabel },
                createdAt: firestore.FieldValue.serverTimestamp(),
              });

              await sendPushNotification(reportedUserId, {
                title: notifTitle,
                body: notifBody,
                data: { type: 'account_action', action: selectedBanCategory },
              });

              // Notify reporter that action was taken
              await firestore().collection(Collections.NOTIFICATIONS).add({
                userId: selectedReport!.reporterId,
                type: 'report_response',
                title: '✅ Action Taken on Your Report',
                body: `Action has been taken against ${reportedUserName}. Thank you for keeping the community safe.`,
                read: false,
                data: { reportId: selectedReport!.id },
                createdAt: firestore.FieldValue.serverTimestamp(),
              });

              await sendPushNotification(selectedReport!.reporterId, {
                title: '✅ Action Taken',
                body: `Action taken against ${reportedUserName} based on your report.`,
                data: { type: 'report_response', reportId: selectedReport!.id },
              });

              await logCrud('Forum Ban Applied', `${category.label} (${durationLabel}) applied to ${reportedUserName}`, 'reports', selectedReport!.id);

              setShowBanModal(false);
              setSelectedReport(null);
              modalAlert('Done', `${category.label} (${durationLabel}) applied to ${reportedUserName}.`);
            } catch (e: any) {
              modalAlert('Error', e.message || 'Failed to apply ban.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>Forum Reports</Text>
        <Text style={styles.headerCount}>{reports.filter(r => r.status === 'pending').length} pending</Text>
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
            const reportedName = report.reportedUserName || report.targetName || 'Unknown';
            return (
              <KeyboardAvoidingView style={styles.card} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                  <Text style={styles.typeText}>{report.type === 'forum_post' ? 'Post Report' : 'Reply Report'}</Text>
                </View>

                <Text style={styles.description}>{report.description || report.postTitle || report.replyContent || 'No details'}</Text>

                {reportedName && reportedName !== 'Unknown' && (
                  <Text style={styles.target}>Reported: {reportedName}</Text>
                )}

                {/* Admin response if already resolved */}
                {report.adminResponse && (
                  <View style={styles.adminResponseBox}>
                    <Text style={styles.adminResponseLabel}>Admin:</Text>
                    <Text style={styles.adminResponseText}>{report.adminResponse}</Text>
                  </View>
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
                    <TouchableOpacity
                      style={styles.banBtn}
                      onPress={() => openBanModal(report)}
                    >
                      <Icon name="lock" size={14} color={Colors.white} />
                      <Text style={styles.banBtnText}>Ban</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </KeyboardAvoidingView>
            );
          })
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ─── Ban Modal ─── */}
      <Modal visible={showBanModal} animationType="slide" transparent onRequestClose={() => setShowBanModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowBanModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Icon name="lock" size={20} color={Colors.error} />
              <Text style={styles.modalTitle}>Ban User</Text>
              <TouchableOpacity onPress={() => setShowBanModal(false)} style={styles.modalClose}>
                <Icon name="x" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalSubtitle}>
                  Applying ban to: <Text style={{ fontWeight: '700', color: Colors.error }}>{selectedReport.reportedUserName || selectedReport.targetName || 'Unknown'}</Text>
                </Text>

                {/* Ban Category Selection */}
                <Text style={styles.sectionLabel}>Ban Category:</Text>
                {FORUM_BAN_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.banCategoryOption, selectedBanCategory === cat.value && styles.banCategoryActive]}
                    onPress={() => setSelectedBanCategory(cat.value)}
                  >
                    <View style={styles.radioCircle}>
                      {selectedBanCategory === cat.value && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.banCategoryLabel, cat.isLifetime && { color: '#EF4444' }]}>
                        {cat.label}
                        {cat.isLifetime && ' ⚠️'}
                      </Text>
                      <Text style={styles.banCategoryDesc}>{cat.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Days Input (for non-lifetime bans) */}
                {selectedBanCategory && !FORUM_BAN_CATEGORIES.find(c => c.value === selectedBanCategory)?.isLifetime && (
                  <View style={styles.daysInputSection}>
                    <Text style={styles.sectionLabel}>Number of Days:</Text>
                    <TextInput
                      style={styles.daysInput}
                      value={banDays}
                      onChangeText={(t) => setBanDays(t.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      placeholder="e.g. 7"
                      placeholderTextColor={Colors.textLight}
                      maxLength={4}
                    />
                    {banDays ? (
                      <Text style={styles.daysPreview}>
                        Ban until: {new Date(Date.now() + parseInt(banDays || '0') * 24 * 60 * 60 * 1000).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Admin Response */}
                <View style={styles.responseSection}>
                  <Text style={styles.sectionLabel}>Admin Note (optional):</Text>
                  <TextInput
                    style={styles.responseInput}
                    value={adminResponse}
                    onChangeText={setAdminResponse}
                    placeholder="Reason for the ban..."
                    placeholderTextColor={Colors.textLight}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Apply Button */}
                <TouchableOpacity
                  style={[styles.applyBanBtn, (!selectedBanCategory || processing) && styles.applyBanBtnDisabled]}
                  onPress={handleApplyBan}
                  disabled={!selectedBanCategory || processing}
                >
                  {processing ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.applyBanText}>
                      {selectedBanCategory === 'account_deactivation' ? '🚫 Deactivate Account' : '⛔ Apply Ban'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
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
  adminResponseBox: { marginTop: Spacing.sm, backgroundColor: '#F0FFF4', borderRadius: BorderRadius.md, padding: Spacing.sm, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  adminResponseLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  adminResponseText: { fontSize: FontSize.sm, color: Colors.text, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  resolveBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  dismissBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  dismissBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  banBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  banBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },

  // ─── Ban Modal ───
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, flex: 1 },
  modalClose: { padding: 4 },
  modalSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.lg },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.md },
  banCategoryOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1.5,
    borderColor: Colors.border, marginBottom: Spacing.sm, backgroundColor: Colors.white,
  },
  banCategoryActive: { borderColor: Colors.primary, backgroundColor: '#E8F5E9' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.textLight, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  banCategoryLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  banCategoryDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  daysInputSection: { marginTop: Spacing.md },
  daysInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, textAlign: 'center',
  },
  daysPreview: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 6, textAlign: 'center' },
  responseSection: { marginTop: Spacing.md },
  responseInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, minHeight: 70, textAlignVertical: 'top',
  },
  applyBanBtn: {
    backgroundColor: '#EF4444', borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg,
    alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg,
  },
  applyBanBtnDisabled: { backgroundColor: Colors.textLight },
  applyBanText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
});

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { modalAlert } from '@/components/ui/ModalAlert';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { sendPushNotification } from '@/services/pushService';
import { getSession } from '@/services/sessionService';

interface ChatReport {
  id: string;
  type: string;
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  reportedUserId: string;
  reportedUserName: string;
  chatId: string;
  messageText: string;
  messageTimestamp: number;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminResponse?: string;
  adminAction?: string;
  createdAt: any;
  resolvedAt?: any;
}

type BanDuration = '1_day' | '3_days' | '1_week' | '2_weeks' | '1_month' | '3_months' | '6_months' | '1_year' | 'permanent';

const BAN_OPTIONS: { value: BanDuration; label: string; days: number }[] = [
  { value: '1_day', label: '1 Day', days: 1 },
  { value: '3_days', label: '3 Days', days: 3 },
  { value: '1_week', label: '1 Week', days: 7 },
  { value: '2_weeks', label: '2 Weeks', days: 14 },
  { value: '1_month', label: '1 Month', days: 30 },
  { value: '3_months', label: '3 Months', days: 90 },
  { value: '6_months', label: '6 Months', days: 180 },
  { value: '1_year', label: '1 Year', days: 365 },
  { value: 'permanent', label: 'Permanent (Deactivate)', days: -1 },
];

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending: { color: '#F59E0B', bg: '#FEF3C7' },
  reviewed: { color: '#2196F3', bg: '#E3F2FD' },
  resolved: { color: '#4CAF50', bg: '#E8F5E9' },
  dismissed: { color: '#9E9E9E', bg: '#F5F5F5' },
};

export default function MessageReportsPage() {
  const [reports, setReports] = useState<ChatReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');
  const [adminName, setAdminName] = useState('Admin');

  // Modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ChatReport | null>(null);
  const [responseText, setResponseText] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedBanDuration, setSelectedBanDuration] = useState<BanDuration | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadAdmin = async () => {
      const session = await getSession();
      if (session) setAdminName(session.displayName || 'Admin');
    };
    loadAdmin();

    // Listen to chat message reports
    const unsub = firestore()
      .collection('reports')
      .where('type', '==', 'chat_message')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snap) => {
          setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatReport)));
          setLoading(false);
        },
        (err) => { console.warn('Reports error:', err); setLoading(false); }
      );

    return () => unsub();
  }, []);

  const filteredReports = filter === 'all'
    ? reports
    : reports.filter(r => r.status === filter);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ─── Admin Reply / Resolve Report ───
  const handleReplyToReport = async (action: 'resolve' | 'dismiss') => {
    if (!selectedReport || !responseText.trim()) {
      modalAlert('Error', 'Please enter a response message.');
      return;
    }

    setProcessing(true);
    try {
      // Update report status
      await firestore().collection('reports').doc(selectedReport.id).update({
        status: action === 'resolve' ? 'resolved' : 'dismissed',
        adminResponse: responseText.trim(),
        adminAction: action,
        adminName,
        resolvedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Notify the reporter about the action
      await firestore().collection(Collections.NOTIFICATIONS).add({
        userId: selectedReport.reporterId,
        type: 'report_response',
        title: action === 'resolve' ? '✅ Report Resolved' : '📋 Report Reviewed',
        body: `Admin response regarding your report against ${selectedReport.reportedUserName}:\n"${responseText.trim()}"`,
        read: false,
        data: { reportId: selectedReport.id },
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // FCM push to reporter
      await sendPushNotification(selectedReport.reporterId, {
        title: action === 'resolve' ? '✅ Report Resolved' : '📋 Report Reviewed',
        body: `Admin responded to your report: "${responseText.trim().substring(0, 60)}..."`,
        data: { type: 'report_response', reportId: selectedReport.id },
      });

      setShowActionModal(false);
      setSelectedReport(null);
      setResponseText('');
      modalAlert('Done', `Report ${action === 'resolve' ? 'resolved' : 'dismissed'} and reporter notified.`);
    } catch (e: any) {
      modalAlert('Error', e.message || 'Failed to process report.');
    } finally {
      setProcessing(false);
    }
  };

  // ─── Ban / Deactivate User ───
  const handleBanUser = async () => {
    if (!selectedReport || !selectedBanDuration) {
      modalAlert('Error', 'Please select a ban duration.');
      return;
    }

    const banOption = BAN_OPTIONS.find(b => b.value === selectedBanDuration);
    if (!banOption) return;

    modalAlert(
      '⚠️ Confirm Ban',
      `Are you sure you want to ${banOption.value === 'permanent' ? 'permanently deactivate' : `ban for ${banOption.label}`} the account of ${selectedReport.reportedUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Ban',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const isPermanent = banOption.value === 'permanent';
              const banUntil = isPermanent
                ? null
                : new Date(Date.now() + banOption.days * 24 * 60 * 60 * 1000);

              // Update user account
              await firestore().collection(Collections.USERS).doc(selectedReport!.reportedUserId).update({
                status: isPermanent ? 'deactivated' : 'banned',
                banReason: `Reported message: "${selectedReport!.messageText.substring(0, 100)}"`,
                bannedAt: firestore.FieldValue.serverTimestamp(),
                bannedBy: adminName,
                banDuration: banOption.label,
                banUntil: banUntil ? firestore.Timestamp.fromDate(banUntil) : null,
              });

              // Update the report
              await firestore().collection('reports').doc(selectedReport!.id).update({
                status: 'resolved',
                adminAction: isPermanent ? 'account_deactivated' : `banned_${banOption.value}`,
                adminResponse: responseText.trim() || `User ${isPermanent ? 'permanently deactivated' : `banned for ${banOption.label}`} due to violation.`,
                adminName,
                resolvedAt: firestore.FieldValue.serverTimestamp(),
              });

              // Notify the banned user
              await firestore().collection(Collections.NOTIFICATIONS).add({
                userId: selectedReport!.reportedUserId,
                type: 'account_action',
                title: isPermanent ? '🚫 Account Deactivated' : `⛔ Account Suspended`,
                body: isPermanent
                  ? `Your account has been permanently deactivated due to violation of community guidelines. Contact support for appeal.`
                  : `Your account has been suspended for ${banOption.label} due to violation of community guidelines. You will be able to use the app again after the suspension period.`,
                read: false,
                data: { action: isPermanent ? 'deactivated' : 'banned', duration: banOption.label },
                createdAt: firestore.FieldValue.serverTimestamp(),
              });

              // FCM push to banned user
              await sendPushNotification(selectedReport!.reportedUserId, {
                title: isPermanent ? '🚫 Account Deactivated' : '⛔ Account Suspended',
                body: isPermanent
                  ? 'Your account has been deactivated due to policy violation.'
                  : `Your account has been suspended for ${banOption.label}.`,
                data: { type: 'account_action' },
              });

              // Notify the reporter that action was taken
              await firestore().collection(Collections.NOTIFICATIONS).add({
                userId: selectedReport!.reporterId,
                type: 'report_response',
                title: '✅ Action Taken',
                body: `Action has been taken against ${selectedReport!.reportedUserName} based on your report. Thank you for helping keep the community safe.`,
                read: false,
                data: { reportId: selectedReport!.id },
                createdAt: firestore.FieldValue.serverTimestamp(),
              });

              await sendPushNotification(selectedReport!.reporterId, {
                title: '✅ Action Taken',
                body: `Action taken against ${selectedReport!.reportedUserName} based on your report.`,
                data: { type: 'report_response', reportId: selectedReport!.id },
              });

              setShowBanModal(false);
              setShowActionModal(false);
              setSelectedReport(null);
              setSelectedBanDuration(null);
              setResponseText('');
              modalAlert('Done', `User ${isPermanent ? 'permanently deactivated' : `banned for ${banOption.label}`}.`);
            } catch (e: any) {
              modalAlert('Error', e.message || 'Failed to ban user.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Message Reports</Text>
        <Text style={s.headerCount}>{reports.filter(r => r.status === 'pending').length} pending</Text>
      </View>

      {/* Filter Tabs */}
      <View style={s.filterRow}>
        {(['pending', 'all', 'resolved', 'dismissed'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterTab, filter === f && s.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reports List */}
      <ScrollView showsVerticalScrollIndicator={false} style={s.content}>
        {filteredReports.length === 0 ? (
          <View style={s.empty}>
            <Icon name="check-circle" size={48} color={Colors.textLight} />
            <Text style={s.emptyText}>{filter === 'pending' ? 'No pending reports' : 'No reports found'}</Text>
          </View>
        ) : (
          filteredReports.map(report => {
            const statusConf = STATUS_COLORS[report.status] || STATUS_COLORS.pending;
            return (
              <TouchableOpacity
                key={report.id}
                style={s.card}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedReport(report);
                  setShowActionModal(true);
                  setResponseText('');
                }}
              >
                {/* Status Badge */}
                <View style={[s.statusBadge, { backgroundColor: statusConf.bg }]}>
                  <Text style={[s.statusText, { color: statusConf.color }]}>{report.status}</Text>
                </View>

                {/* Reporter Info */}
                <View style={s.cardRow}>
                  <Icon name="profile" size={14} color={Colors.textSecondary} />
                  <Text style={s.cardLabel}>Reporter:</Text>
                  <Text style={s.cardValue}>{report.reporterName} ({report.reporterRole})</Text>
                </View>

                {/* Reported User */}
                <View style={s.cardRow}>
                  <Icon name="shield-alert" size={14} color="#EF4444" />
                  <Text style={s.cardLabel}>Reported:</Text>
                  <Text style={[s.cardValue, { color: '#EF4444' }]}>{report.reportedUserName}</Text>
                </View>

                {/* Message Content */}
                <View style={s.messageBox}>
                  <Text style={s.messageContent} numberOfLines={3}>
                    "{report.messageText}"
                  </Text>
                </View>

                {/* Date */}
                <Text style={s.cardDate}>{formatDate(report.createdAt)}</Text>

                {/* Admin Response (if exists) */}
                {report.adminResponse && (
                  <View style={s.adminResponseBox}>
                    <Text style={s.adminResponseLabel}>Admin Response:</Text>
                    <Text style={s.adminResponseText}>{report.adminResponse}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Action Modal ─── */}
      <Modal visible={showActionModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Report Action</Text>
              <TouchableOpacity onPress={() => { setShowActionModal(false); setSelectedReport(null); }}>
                <Icon name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Report Details */}
                <View style={s.modalSection}>
                  <Text style={s.modalLabel}>Reported Message:</Text>
                  <View style={s.modalMessageBox}>
                    <Text style={s.modalMessageText}>"{selectedReport.messageText}"</Text>
                  </View>
                  <Text style={s.modalMeta}>
                    From: {selectedReport.reportedUserName} • Reported by: {selectedReport.reporterName}
                  </Text>
                </View>

                {/* Admin Response Input */}
                <View style={s.modalSection}>
                  <Text style={s.modalLabel}>Your Response (will be sent to reporter):</Text>
                  <TextInput
                    style={s.modalInput}
                    placeholder="e.g. 'Warning issued to the user' or 'Message does not violate guidelines'"
                    value={responseText}
                    onChangeText={setResponseText}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={Colors.textLight}
                  />
                </View>

                {/* Action Buttons */}
                <View style={s.modalActions}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionResolve]}
                    onPress={() => handleReplyToReport('resolve')}
                    disabled={processing}
                  >
                    <Icon name="check" size={16} color={Colors.white} />
                    <Text style={s.actionBtnText}>Resolve & Notify</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, s.actionDismiss]}
                    onPress={() => handleReplyToReport('dismiss')}
                    disabled={processing}
                  >
                    <Icon name="close" size={16} color={Colors.white} />
                    <Text style={s.actionBtnText}>Dismiss</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBan]}
                    onPress={() => setShowBanModal(true)}
                    disabled={processing}
                  >
                    <Icon name="lock" size={16} color={Colors.white} />
                    <Text style={s.actionBtnText}>Ban / Deactivate User</Text>
                  </TouchableOpacity>
                </View>

                {processing && <ActivityIndicator style={{ marginTop: Spacing.md }} color={Colors.primary} />}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Ban Duration Modal ─── */}
      <Modal visible={showBanModal} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.banModalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Ban Duration</Text>
              <TouchableOpacity onPress={() => setShowBanModal(false)}>
                <Icon name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={s.banSubtitle}>
              Select how long to ban {selectedReport?.reportedUserName}:
            </Text>

            <ScrollView style={{ maxHeight: 320 }}>
              {BAN_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[s.banOption, selectedBanDuration === option.value && s.banOptionActive]}
                  onPress={() => setSelectedBanDuration(option.value)}
                >
                  <View style={s.banRadio}>
                    {selectedBanDuration === option.value && <View style={s.banRadioInner} />}
                  </View>
                  <Text style={[
                    s.banOptionText,
                    option.value === 'permanent' && { color: '#EF4444', fontWeight: '700' },
                  ]}>
                    {option.label}
                  </Text>
                  {option.value === 'permanent' && (
                    <Text style={s.banPermanentWarning}>⚠️ Cannot login</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[s.banConfirmBtn, !selectedBanDuration && s.banConfirmBtnDisabled]}
              onPress={handleBanUser}
              disabled={!selectedBanDuration || processing}
            >
              {processing ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={s.banConfirmText}>
                  {selectedBanDuration === 'permanent' ? '🚫 Deactivate Account' : '⛔ Apply Ban'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg, paddingBottom: Spacing.xl,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white, flex: 1, marginLeft: Spacing.sm },
  headerCount: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: Spacing.lg },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.md },
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md, ...Shadow.light, borderLeftWidth: 4, borderLeftColor: '#F59E0B',
  },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginBottom: Spacing.sm },
  statusText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  cardValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, flex: 1 },
  messageBox: { backgroundColor: '#FFF3E0', borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm },
  messageContent: { fontSize: FontSize.sm, color: '#6D4C00', fontStyle: 'italic' },
  cardDate: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: Spacing.sm },
  adminResponseBox: { backgroundColor: '#E8F5E9', borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm },
  adminResponseLabel: { fontSize: FontSize.xs, fontWeight: '700', color: '#2E7D32', marginBottom: 2 },
  adminResponseText: { fontSize: FontSize.sm, color: '#1B5E20' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  modalSection: { marginBottom: Spacing.lg },
  modalLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  modalMessageBox: { backgroundColor: '#FFF3E0', borderRadius: BorderRadius.md, padding: Spacing.md },
  modalMessageText: { fontSize: FontSize.md, color: '#6D4C00', fontStyle: 'italic' },
  modalMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.sm },
  modalInput: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
    minHeight: 80, textAlignVertical: 'top',
  },
  modalActions: { gap: Spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg },
  actionResolve: { backgroundColor: '#4CAF50' },
  actionDismiss: { backgroundColor: '#9E9E9E' },
  actionBan: { backgroundColor: '#EF4444' },
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },

  // Ban Modal
  banModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, maxHeight: '80%' },
  banSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg },
  banOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, marginBottom: 4, gap: Spacing.md },
  banOptionActive: { backgroundColor: '#FFEBEE' },
  banRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  banRadioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' },
  banOptionText: { fontSize: FontSize.md, color: Colors.text, flex: 1 },
  banPermanentWarning: { fontSize: FontSize.xs, color: '#EF4444' },
  banConfirmBtn: { backgroundColor: '#EF4444', borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.lg },
  banConfirmBtnDisabled: { opacity: 0.5 },
  banConfirmText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
});

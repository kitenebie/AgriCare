import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Pressable,
  KeyboardAvoidingView,
  Platform,
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
  reportedUserRole?: string;
  chatId: string;
  messageText: string;
  messageTimestamp: number;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminResponse?: string;
  adminAction?: string;
  createdAt: any;
  resolvedAt?: any;
}

// ─── Chat Ban Categories ───
type ChatBanCategory =
  | 'farmer_reply_suspension'       // Farmer can't reply to the technician who reported them
  | 'technician_request_suspension' // Technician can't receive requests from the farmer who reported
  | 'technician_request_page_suspension'; // Technician can't open the available request page

interface ChatBanOption {
  value: ChatBanCategory;
  label: string;
  description: string;
  applicableTo: 'farmer' | 'technician';
}

const CHAT_BAN_CATEGORIES: ChatBanOption[] = [
  {
    value: 'farmer_reply_suspension',
    label: "Can't Reply to Reporter",
    description: "Farmer will be unable to reply/message the technician who reported them",
    applicableTo: 'farmer',
  },
  {
    value: 'technician_request_suspension',
    label: "Can't Receive Requests from Reporter",
    description: "Technician won't receive request list entries from the farmer who reported them",
    applicableTo: 'technician',
  },
  {
    value: 'technician_request_page_suspension',
    label: "Can't Open Available Requests Page",
    description: "Technician will be blocked from accessing the available request page entirely",
    applicableTo: 'technician',
  },
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

  // Action Modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ChatReport | null>(null);
  const [responseText, setResponseText] = useState('');
  const [processing, setProcessing] = useState(false);

  // Ban Modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedBanCategory, setSelectedBanCategory] = useState<ChatBanCategory | null>(null);
  const [banDays, setBanDays] = useState('');
  const [reportedUserRole, setReportedUserRole] = useState<'farmer' | 'technician' | ''>('');

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

  // ─── Open Ban Modal (fetch reported user role first) ───
  const openBanModal = async () => {
    if (!selectedReport) return;

    try {
      // Get the reported user's role
      const userDoc = await firestore().collection(Collections.USERS).doc(selectedReport.reportedUserId).get();
      const role = userDoc.data()?.role || '';
      setReportedUserRole(role === 'farmer' ? 'farmer' : role === 'technician' ? 'technician' : '');
    } catch (e) {
      // Fallback: try to infer from reportedUserRole field
      const role = selectedReport.reportedUserRole || '';
      setReportedUserRole(role === 'farmer' ? 'farmer' : role === 'technician' ? 'technician' : '');
    }

    setSelectedBanCategory(null);
    setBanDays('');
    setShowBanModal(true);
  };

  // ─── Apply Chat Ban ───
  const handleApplyBan = async () => {
    if (!selectedReport || !selectedBanCategory) {
      modalAlert('Error', 'Please select a ban category.');
      return;
    }

    const days = parseInt(banDays);
    if (!days || days < 1) {
      modalAlert('Error', 'Please enter a valid number of days (minimum 1).');
      return;
    }

    const category = CHAT_BAN_CATEGORIES.find(c => c.value === selectedBanCategory)!;
    const durationLabel = `${days} day${days > 1 ? 's' : ''}`;
    const banUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    modalAlert(
      '⚠️ Confirm Chat Ban',
      `Apply "${category.label}" (${durationLabel}) to ${selectedReport.reportedUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Ban',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const banEntry: any = {
                category: selectedBanCategory,
                banDays: days,
                banUntil: firestore.Timestamp.fromDate(banUntil),
                bannedAt: firestore.FieldValue.serverTimestamp(),
                bannedBy: adminName,
                reason: responseText.trim() || `Chat violation: "${selectedReport!.messageText.substring(0, 80)}"`,
                reportId: selectedReport!.id,
                reporterId: selectedReport!.reporterId,
                chatId: selectedReport!.chatId,
              };

              // Build Firestore update based on ban category
              if (selectedBanCategory === 'farmer_reply_suspension') {
                // Farmer can't reply to the specific technician (reporter)
                banEntry.blockedUserId = selectedReport!.reporterId; // The technician who reported
                banEntry.targetUserId = selectedReport!.reportedUserId; // The farmer being banned

                // Save to user's chatBans subcollection
                await firestore()
                  .collection(Collections.USERS)
                  .doc(selectedReport!.reportedUserId)
                  .collection('chatBans')
                  .add(banEntry);

              } else if (selectedBanCategory === 'technician_request_suspension') {
                // Technician can't receive requests from the specific farmer (reporter)
                banEntry.blockedFarmerId = selectedReport!.reporterId; // The farmer who reported
                banEntry.targetUserId = selectedReport!.reportedUserId; // The technician being banned

                await firestore()
                  .collection(Collections.USERS)
                  .doc(selectedReport!.reportedUserId)
                  .collection('chatBans')
                  .add(banEntry);

              } else if (selectedBanCategory === 'technician_request_page_suspension') {
                // Technician can't open the request page at all
                banEntry.targetUserId = selectedReport!.reportedUserId;

                await firestore()
                  .collection(Collections.USERS)
                  .doc(selectedReport!.reportedUserId)
                  .update({
                    requestPageBanned: true,
                    requestPageBanUntil: firestore.Timestamp.fromDate(banUntil),
                    requestPageBanReason: banEntry.reason,
                  });

                // Also save to chatBans for record
                await firestore()
                  .collection(Collections.USERS)
                  .doc(selectedReport!.reportedUserId)
                  .collection('chatBans')
                  .add(banEntry);
              }

              // Update the report as resolved
              await firestore().collection('reports').doc(selectedReport!.id).update({
                status: 'resolved',
                adminAction: `chat_ban_${selectedBanCategory}`,
                adminResponse: responseText.trim() || `${category.label} applied for ${durationLabel}.`,
                adminName,
                resolvedAt: firestore.FieldValue.serverTimestamp(),
              });

              // Notify the banned user
              let notifBody = '';
              if (selectedBanCategory === 'farmer_reply_suspension') {
                notifBody = `You have been suspended from replying to ${selectedReport!.reporterName} for ${durationLabel} due to a chat violation.`;
              } else if (selectedBanCategory === 'technician_request_suspension') {
                notifBody = `You will not receive service requests from ${selectedReport!.reporterName} for ${durationLabel} due to a chat violation.`;
              } else {
                notifBody = `You have been suspended from accessing the available requests page for ${durationLabel} due to a chat violation.`;
              }

              await firestore().collection(Collections.NOTIFICATIONS).add({
                userId: selectedReport!.reportedUserId,
                type: 'chat_ban',
                title: '⛔ Chat Restriction Applied',
                body: notifBody,
                read: false,
                data: { action: selectedBanCategory, duration: durationLabel, reportId: selectedReport!.id },
                createdAt: firestore.FieldValue.serverTimestamp(),
              });

              await sendPushNotification(selectedReport!.reportedUserId, {
                title: '⛔ Chat Restriction Applied',
                body: notifBody,
                data: { type: 'chat_ban', action: selectedBanCategory },
              });

              // Notify reporter that action was taken
              await firestore().collection(Collections.NOTIFICATIONS).add({
                userId: selectedReport!.reporterId,
                type: 'report_response',
                title: '✅ Action Taken',
                body: `Action has been taken against ${selectedReport!.reportedUserName} based on your report. Thank you for keeping the community safe.`,
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
              setSelectedBanCategory(null);
              setBanDays('');
              setResponseText('');
              modalAlert('Done', `${category.label} (${durationLabel}) applied to ${selectedReport!.reportedUserName}.`);
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

  // Filter ban categories based on reported user role
  const availableBanCategories = CHAT_BAN_CATEGORIES.filter(
    c => !reportedUserRole || c.applicableTo === reportedUserRole
  );

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Chat Reports</Text>
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
                    From: {selectedReport.reportedUserName} • Reported by: {selectedReport.reporterName} ({selectedReport.reporterRole})
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
                    onPress={openBanModal}
                    disabled={processing}
                  >
                    <Icon name="lock" size={16} color={Colors.white} />
                    <Text style={s.actionBtnText}>Apply Chat Ban</Text>
                  </TouchableOpacity>
                </View>

                {processing && <ActivityIndicator style={{ marginTop: Spacing.md }} color={Colors.primary} />}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Chat Ban Modal ─── */}
      <Modal visible={showBanModal} animationType="fade" transparent onRequestClose={() => setShowBanModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowBanModal(false)}>
          <View style={s.banModalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Chat Ban</Text>
              <TouchableOpacity onPress={() => setShowBanModal(false)}>
                <Icon name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={s.banSubtitle}>
              Applying chat restriction to: <Text style={{ fontWeight: '700', color: '#EF4444' }}>{selectedReport?.reportedUserName}</Text>
              {reportedUserRole ? (
                <Text style={{ color: Colors.primary }}> ({reportedUserRole})</Text>
              ) : null}
            </Text>

            {/* Role detection notice */}
            {reportedUserRole ? (
              <View style={s.roleNotice}>
                <Icon name={reportedUserRole === 'farmer' ? 'leaf' : 'stethoscope'} size={14} color={Colors.primary} />
                <Text style={s.roleNoticeText}>
                  Showing ban options for: {reportedUserRole === 'farmer' ? 'Farmer' : 'Technician'}
                </Text>
              </View>
            ) : null}

            {/* Ban Category Selection */}
            <Text style={s.banSectionLabel}>Ban Category:</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {availableBanCategories.length === 0 ? (
                <Text style={s.noCategoriesText}>No ban categories available for this user role.</Text>
              ) : (
                availableBanCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[s.banCategoryOption, selectedBanCategory === cat.value && s.banCategoryActive]}
                    onPress={() => setSelectedBanCategory(cat.value)}
                  >
                    <View style={s.banRadio}>
                      {selectedBanCategory === cat.value && <View style={s.banRadioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.banCategoryLabel}>{cat.label}</Text>
                      <Text style={s.banCategoryDesc}>{cat.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Days Input */}
            {selectedBanCategory && (
              <View style={s.daysSection}>
                <Text style={s.banSectionLabel}>Number of Days:</Text>
                <TextInput
                  style={s.daysInput}
                  value={banDays}
                  onChangeText={(t) => setBanDays(t.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="e.g. 7"
                  placeholderTextColor={Colors.textLight}
                  maxLength={4}
                />
                {banDays ? (
                  <Text style={s.daysPreview}>
                    Restriction until: {new Date(Date.now() + parseInt(banDays || '0') * 24 * 60 * 60 * 1000).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Apply Button */}
            <TouchableOpacity
              style={[s.banConfirmBtn, (!selectedBanCategory || !banDays || processing) && s.banConfirmBtnDisabled]}
              onPress={handleApplyBan}
              disabled={!selectedBanCategory || !banDays || processing}
            >
              {processing ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={s.banConfirmText}>⛔ Apply Chat Ban</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
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

  // Action Modal
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
  banModalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, maxHeight: '85%' },
  banSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.md },
  roleNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9',
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg,
  },
  roleNoticeText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  banSectionLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  noCategoriesText: { fontSize: FontSize.sm, color: Colors.textLight, fontStyle: 'italic', padding: Spacing.md },
  banCategoryOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1.5,
    borderColor: Colors.border, marginBottom: Spacing.sm, backgroundColor: Colors.white,
  },
  banCategoryActive: { borderColor: Colors.primary, backgroundColor: '#E8F5E9' },
  banRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.textLight, justifyContent: 'center', alignItems: 'center' },
  banRadioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  banCategoryLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  banCategoryDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  daysSection: { marginTop: Spacing.md },
  daysInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, textAlign: 'center',
  },
  daysPreview: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 6, textAlign: 'center' },
  banConfirmBtn: { backgroundColor: '#EF4444', borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.md },
  banConfirmBtnDisabled: { opacity: 0.5 },
  banConfirmText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
});

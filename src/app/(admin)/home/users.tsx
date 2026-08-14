import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Animated, Dimensions, Pressable, Linking } from 'react-native';
import { modalAlert } from '@/components/ui/ModalAlert';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { logCrud } from '@/services/logService';
import { sendPushNotification } from '@/services/pushService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  phoneNumber?: string;
  location?: string;
  photoURL?: string;
  idImageUrl?: string;
  proofImageUrl?: string;
  expertise?: string[];
  createdAt?: any;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  // Reject modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectUser, setRejectUser] = useState<User | null>(null);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    const unsub = firestore().collection(Collections.USERS).onSnapshot(
      (snap) => { setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const filtered = users.filter(u => {
    const matchFilter = filter === 'all' ? true : filter === 'pending' ? u.status === 'pending' : u.role === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const pendingCount = users.filter(u => u.status === 'pending').length;

  // ─── Drawer Controls ───
  const openDrawer = (user: User) => {
    setSelectedUser(user);
    setDrawerVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true
    }).start(() => {
      setDrawerVisible(false);
      setSelectedUser(null);
    });
  };

  // ─── APPROVE USER ───
  const handleApprove = (user: User) => {
    modalAlert(
      'Approve Account',
      `Approve ${user.displayName} (${user.role}) to use AgriCare?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await firestore().collection(Collections.USERS).doc(user.id).update({
                status: 'active',
                verifiedAt: firestore.FieldValue.serverTimestamp()
              });

              // Notify user via notification page
              await firestore().collection(Collections.NOTIFICATIONS).add({
                userId: user.id,
                type: 'account_approved',
                title: 'Account Approved!',
                body: `Welcome to AgriCare! Your ${user.role} account has been verified and activated. You can now log in and start using the app.`,
                read: false,
                data: { action: 'approved' },
                createdAt: firestore.FieldValue.serverTimestamp()
              });

              // FCM push notification
              await sendPushNotification(user.id, {
                title: 'Account Approved!',
                body: `Your AgriCare ${user.role} account has been verified. You can now log in!`,
                data: { type: 'account_approved' }
              });

              await logCrud('User Approved', `Approved ${user.role}: ${user.displayName}`, 'users', user.id, {
                old: { status: 'pending' },
                new: { status: 'active' }
              });
            } catch (e: any) {
              modalAlert('Error', e.message);
            }
          }
        },
      ]
    );
  };

  // ─── REJECT USER ───
  const handleReject = (user: User) => {
    setRejectUser(user);
    setRejectReasons([]);
    setRejectNote('');
    setRejectModalVisible(true);
  };

  const REJECT_REASON_OPTIONS = [
    { id: 'invalid_id', label: 'Invalid or unreadable ID' },
    { id: 'blurry_photo', label: 'Blurry or unclear photo' },
    { id: 'mismatch_name', label: 'Name does not match ID' },
    { id: 'expired_id', label: 'Expired ID document' },
    { id: 'fake_document', label: 'Suspected fake/edited document' },
    { id: 'no_face', label: 'Profile photo does not show face clearly' },
    { id: 'multiple_faces', label: 'Multiple faces detected in profile photo' },
    { id: 'wrong_person', label: 'Profile photo does not match ID photo' },
    { id: 'invalid_license', label: 'Invalid technician license/certificate' },
    { id: 'expired_license', label: 'Expired technician license/certificate' },
    { id: 'incomplete_info', label: 'Incomplete registration information' },
    { id: 'duplicate_account', label: 'Duplicate account detected' },
    { id: 'underage', label: 'Applicant does not meet age requirement' },
    { id: 'wrong_role', label: 'Registered under wrong role' },
    { id: 'invalid_phone', label: 'Invalid or unreachable phone number' },
    { id: 'invalid_location', label: 'Location is outside service area' },
    { id: 'inappropriate_content', label: 'Inappropriate or offensive content' },
    { id: 'spam', label: 'Suspected spam or bot registration' },
  ];

  const toggleRejectReason = (id: string) => {
    setRejectReasons(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const submitReject = async () => {
    if (!rejectUser) return;
    if (rejectReasons.length === 0 && !rejectNote.trim()) {
      modalAlert('Required', 'Please select at least one reason or add a note.');
      return;
    }
    const selectedLabels = REJECT_REASON_OPTIONS.filter(o => rejectReasons.includes(o.id)).map(o => o.label);
    const fullReason = [...selectedLabels, rejectNote.trim()].filter(Boolean).join('\n• ');
    const reason = selectedLabels.length > 0 ? `• ${fullReason}` : fullReason;
    setRejectModalVisible(false);
    await performReject(rejectUser, reason);
  };

  const performReject = async (user: User, reason: string) => {
    try {
      await firestore().collection(Collections.USERS).doc(user.id).update({
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: firestore.FieldValue.serverTimestamp()
      });

      // Notify user
      await firestore().collection(Collections.NOTIFICATIONS).add({
        userId: user.id,
        type: 'account_rejected',
        title: 'Registration Not Approved',
        body: `Your AgriCare registration was not approved.\n\nReason: ${reason}\n\nPlease re-register with valid documents.`,
        read: false,
        data: { action: 'rejected', reason },
        createdAt: firestore.FieldValue.serverTimestamp()
      });

      // FCM push
      await sendPushNotification(user.id, {
        title: 'Registration Not Approved',
        body: reason,
        data: { type: 'account_rejected' }
      });

      await logCrud('User Rejected', `Rejected ${user.role}: ${user.displayName}. Reason: ${reason}`, 'users', user.id, {
        old: { status: 'pending' },
        new: { status: 'rejected' }
      });
    } catch (e: any) {
      modalAlert('Error', e.message);
    }
  };

  // ─── DELETE USER ───
  const handleDelete = (id: string, name: string) => {
    modalAlert('Delete User', `Permanently delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await firestore().collection(Collections.USERS).doc(id).delete();
          await logCrud('User Deleted', `Deleted user: ${name}`, 'users', id);
        } catch (e: any) { modalAlert('Error', e.message); }
      }},
    ]);
  };

  const getStatusColor = (status: string) => {
    if (status === 'active' || status === 'verified') return '#4CAF50';
    if (status === 'pending') return '#FF9800';
    if (status === 'rejected') return '#EF4444';
    if (status === 'banned') return '#D32F2F';
    return '#9E9E9E';
  };

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /><Text style={s.loadText}>Loading users...</Text></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} /></TouchableOpacity>
        <Text style={s.headerTitle}>User Management</Text>
        <Text style={s.count}>{pendingCount > 0 ? `${pendingCount} pending` : `${users.length} total`}</Text>
      </View>

      <View style={s.searchRow}>
        <Icon name="search" size={16} color={Colors.textLight} />
        <TextInput style={s.searchInput} placeholder="Search users..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {[
          { key: 'pending', label: `Pending (${pendingCount})` },
          { key: 'all', label: 'All' },
          { key: 'farmer', label: 'Farmers' },
          { key: 'technician', label: 'Technicians' },
          { key: 'admin', label: 'Admins' },
        ].map(f => (
          <TouchableOpacity key={f.key} style={[s.filterBtn, filter === f.key && s.filterBtnActive]} onPress={() => setFilter(f.key)}>
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={s.empty}>
            <Icon name={filter === 'pending' ? 'check-circle' : 'profile'} size={48} color={Colors.textLight} />
            <Text style={s.emptyText}>{filter === 'pending' ? 'No pending accounts!' : 'No users found'}</Text>
          </View>
        )}
        {filtered.map(u => (
          <TouchableOpacity key={u.id} style={[s.card, u.status === 'pending' && s.cardPending]} onPress={() => openDrawer(u)} activeOpacity={0.7}>
            {/* User Avatar / Photo */}
            <View>
              {u.photoURL ? (
                <Image source={{ uri: u.photoURL }} style={s.avatar} contentFit="cover" />
              ) : (
                <Avatar name={u.displayName || u.email} size={46} />
              )}
            </View>

            <View style={s.cardInfo}>
              <Text style={s.userName}>{u.displayName || 'No name'}</Text>
              <Text style={s.userEmail}>{u.email}</Text>
              <View style={s.cardMeta}>
                <View style={[s.roleBadge, { backgroundColor: u.role === 'admin' ? '#E3F2FD' : u.role === 'farmer' ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Text style={[s.roleText, { color: u.role === 'admin' ? '#1565C0' : u.role === 'farmer' ? '#2E7D32' : '#E65100' }]}>{u.role}</Text>
                </View>
                <View style={[s.statusDot, { backgroundColor: getStatusColor(u.status) }]} />
                <Text style={s.statusLabel}>{u.status}</Text>
                {u.createdAt && <Text style={s.dateLabel}>{formatDate(u.createdAt)}</Text>}
              </View>

              {/* Show ID / Proof for pending users */}
              {u.status === 'pending' && (
                <View style={s.docsRow}>
                  {u.idImageUrl ? (
                    <TouchableOpacity style={s.docBadge}>
                      <Icon name="image" size={12} color="#1565C0" />
                      <Text style={s.docBadgeText}>ID Uploaded</Text>
                    </TouchableOpacity>
                  ) : null}
                  {u.proofImageUrl ? (
                    <TouchableOpacity style={s.docBadge}>
                      <Icon name="image" size={12} color="#E65100" />
                      <Text style={s.docBadgeText}>License/Cert</Text>
                    </TouchableOpacity>
                  ) : null}
                  {u.expertise && u.expertise.length > 0 ? (
                    <Text style={s.expertiseText}>{u.expertise.length} expertise</Text>
                  ) : null}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={s.actions}>
              {u.status === 'pending' ? (
                <>
                  <TouchableOpacity style={s.approveBtn} onPress={() => handleApprove(u)}>
                    <Icon name="check" size={16} color={Colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(u)}>
                    <Icon name="close" size={16} color={Colors.white} />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(u.id, u.displayName || u.email)}>
                  <Icon name="trash" size={14} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ─── USER DETAIL DRAWER ─── */}

      {/* ─── REJECT REASON MODAL ─── */}
      <Modal visible={rejectModalVisible} transparent animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
        <Pressable style={s.rejectModalOverlay} onPress={() => setRejectModalVisible(false)}>
          <Pressable style={s.rejectModalContainer} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="close" size={20} color="#EF4444" />
              <Text style={s.rejectModalTitle}>Reject {rejectUser?.displayName}</Text>
            </View>
            <Text style={s.rejectModalSubtitle}>Select the reason(s) for rejection:</Text>

            <ScrollView style={s.rejectModalScroll} showsVerticalScrollIndicator={false}>
              {REJECT_REASON_OPTIONS.map((option) => {
                const selected = rejectReasons.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[s.rejectCheckboxRow, selected && s.rejectCheckboxRowActive]}
                    onPress={() => toggleRejectReason(option.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.rejectCheckbox, selected && s.rejectCheckboxChecked]}>
                      {selected && <Icon name="check" size={12} color={Colors.white} />}
                    </View>
                    <Text style={[s.rejectCheckboxLabel, selected && { color: Colors.text, fontWeight: '600' }]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={[s.rejectModalSubtitle, { marginTop: 16 }]}>Additional notes (optional):</Text>
              <TextInput
                style={s.rejectTextArea}
                placeholder="Add more details about the rejection..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={rejectNote}
                onChangeText={setRejectNote}
              />
            </ScrollView>

            <View style={s.rejectModalActions}>
              <TouchableOpacity style={s.rejectModalCancelBtn} onPress={() => setRejectModalVisible(false)}>
                <Text style={s.rejectModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.rejectModalSubmitBtn} onPress={submitReject}>
                <Icon name="close" size={14} color={Colors.white} />
                <Text style={s.rejectModalSubmitText}>Reject Account</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={s.drawerOverlay}>
          <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
          <Animated.View style={[s.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>
            <View>
              {/* Drag Handle */}
              <View style={s.drawerHandle} />

              {selectedUser && (
                <ScrollView showsVerticalScrollIndicator={false} style={s.drawerScroll} contentContainerStyle={{ paddingBottom: 220 }}>
                  {/* Header */}
                  <View style={s.drawerHeader}>
                    {selectedUser.photoURL ? (
                      <Image source={{ uri: selectedUser.photoURL }} style={s.drawerAvatar} contentFit="cover" />
                    ) : (
                      <Avatar name={selectedUser.displayName || selectedUser.email} size={80} />
                    )}
                    <Text style={s.drawerName}>{selectedUser.displayName || 'No name'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <View style={[s.roleBadge, { backgroundColor: selectedUser.role === 'admin' ? '#E3F2FD' : selectedUser.role === 'farmer' ? '#E8F5E9' : '#FFF3E0' }]}>
                        <Text style={[s.roleText, { color: selectedUser.role === 'admin' ? '#1565C0' : selectedUser.role === 'farmer' ? '#2E7D32' : '#E65100', fontSize: 12 }]}>{selectedUser.role}</Text>
                      </View>
                      <View style={[s.statusDot, { backgroundColor: getStatusColor(selectedUser.status) }]} />
                      <Text style={{ fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize' }}>{selectedUser.status}</Text>
                    </View>
                  </View>

                  {/* Info Rows */}
                  <View style={s.drawerSection}>
                    <Text style={s.drawerSectionTitle}>Contact Information</Text>
                    <View style={s.drawerRow}>
                      <Icon name="messages" size={16} color={Colors.textSecondary} />
                      <Text style={s.drawerRowLabel}>Email</Text>
                      <Text style={s.drawerRowValue}>{selectedUser.email}</Text>
                    </View>
                    {selectedUser.phoneNumber ? (
                      <View style={s.drawerRow}>
                        <Icon name="phone" size={16} color={Colors.textSecondary} />
                        <Text style={s.drawerRowLabel}>Phone</Text>
                        <Text style={s.drawerRowValue}>{selectedUser.phoneNumber}</Text>
                      </View>
                    ) : null}
                    {selectedUser.location ? (
                      <View style={s.drawerRow}>
                        <Icon name="location" size={16} color={Colors.textSecondary} />
                        <Text style={s.drawerRowLabel}>Location</Text>
                        <Text style={s.drawerRowValue}>{selectedUser.location}</Text>
                      </View>
                    ) : null}
                    {selectedUser.createdAt ? (
                      <View style={s.drawerRow}>
                        <Icon name="calendar" size={16} color={Colors.textSecondary} />
                        <Text style={s.drawerRowLabel}>Registered</Text>
                        <Text style={s.drawerRowValue}>{formatDate(selectedUser.createdAt)}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Expertise (technician) */}
                  {selectedUser.expertise && selectedUser.expertise.length > 0 && (
                    <View style={s.drawerSection}>
                      <Text style={s.drawerSectionTitle}>Expertise</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {selectedUser.expertise.map((exp, idx) => (
                          <View key={idx} style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                            <Text style={{ fontSize: 11, color: '#E65100', fontWeight: '600' }}>{exp}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Documents */}
                  {(selectedUser.idImageUrl || selectedUser.proofImageUrl) && (
                    <View style={s.drawerSection}>
                      <Text style={s.drawerSectionTitle}>Uploaded Documents</Text>
                      {selectedUser.idImageUrl && (
                        <View style={s.drawerDocCard}>
                          <Text style={s.drawerDocLabel}>Valid ID</Text>
                          <Image source={{ uri: selectedUser.idImageUrl }} style={s.drawerDocImage} contentFit="contain" />
                        </View>
                      )}
                      {selectedUser.proofImageUrl && (
                        <View style={s.drawerDocCard}>
                          <Text style={s.drawerDocLabel}>License / Certificate</Text>
                          <Image source={{ uri: selectedUser.proofImageUrl }} style={s.drawerDocImage} contentFit="contain" />
                        </View>
                      )}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={s.drawerSection}>
                    {selectedUser.status === 'pending' && (
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity style={[s.drawerActionBtn, { backgroundColor: '#4CAF50', flex: 1 }]} onPress={() => { closeDrawer(); setTimeout(() => handleApprove(selectedUser), 300); }}>
                          <Icon name="check" size={16} color={Colors.white} />
                          <Text style={s.drawerActionText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.drawerActionBtn, { backgroundColor: '#EF4444', flex: 1 }]} onPress={() => { closeDrawer(); setTimeout(() => handleReject(selectedUser), 300); }}>
                          <Icon name="close" size={16} color={Colors.white} />
                          <Text style={s.drawerActionText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <TouchableOpacity style={[s.drawerActionBtn, { backgroundColor: '#EF444415', marginTop: selectedUser.status === 'pending' ? 12 : 0 }]} onPress={() => { closeDrawer(); setTimeout(() => handleDelete(selectedUser.id, selectedUser.displayName || selectedUser.email), 300); }}>
                      <Icon name="trash" size={16} color={Colors.error} />
                      <Text style={[s.drawerActionText, { color: Colors.error }]}>Delete User</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadText: { marginTop: 12, color: Colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  count: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm, ...Shadow.light },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  filterScroll: { maxHeight: 44, marginTop: Spacing.md },
  filterContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  filterBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white, fontWeight: '700' },
  list: { flex: 1, paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.light },
  cardPending: { borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: Colors.primary },
  cardInfo: { flex: 1, marginLeft: Spacing.md },
  userName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  userEmail: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleText: { fontSize: 10, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 10, color: Colors.textSecondary },
  dateLabel: { fontSize: 10, color: Colors.textLight },
  docsRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  docBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  docBadgeText: { fontSize: 9, color: '#1565C0', fontWeight: '600' },
  expertiseText: { fontSize: 9, color: '#E65100', fontWeight: '600' },
  actions: { gap: 6 },
  approveBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  delBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.error + '15', justifyContent: 'center', alignItems: 'center' },
  // Drawer
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawerContainer: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_HEIGHT * 0.92 },
  drawerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  drawerScroll: { paddingHorizontal: Spacing.xl },
  drawerHeader: { alignItems: 'center', paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  drawerAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: Colors.primary },
  drawerName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginTop: 12 },
  drawerSection: { paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  drawerSectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  drawerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  drawerRowLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 80 },
  drawerRowValue: { fontSize: FontSize.md, color: Colors.text, flex: 1, fontWeight: '500' },
  drawerDocCard: { marginBottom: 12 },
  drawerDocLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  drawerDocImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#F5F5F5' },
  drawerActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: BorderRadius.lg },
  drawerActionText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
  // Reject Modal
  rejectModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  rejectModalContainer: { backgroundColor: Colors.white, borderRadius: 20, padding: Spacing.xl, width: '100%', maxHeight: SCREEN_HEIGHT * 0.8 },
  rejectModalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  rejectModalSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 12 },
  rejectModalScroll: { maxHeight: SCREEN_HEIGHT * 0.45 },
  rejectCheckboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  rejectCheckboxRowActive: { backgroundColor: '#FEF2F2' },
  rejectCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  rejectCheckboxChecked: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  rejectCheckboxLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  rejectTextArea: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: FontSize.sm, color: Colors.text, minHeight: 80, marginTop: 8 },
  rejectModalActions: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  rejectModalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: BorderRadius.lg, backgroundColor: '#F3F4F6', alignItems: 'center' },
  rejectModalCancelText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
  rejectModalSubmitBtn: { flex: 1, flexDirection: 'row', paddingVertical: 13, borderRadius: BorderRadius.lg, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rejectModalSubmitText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white }
});

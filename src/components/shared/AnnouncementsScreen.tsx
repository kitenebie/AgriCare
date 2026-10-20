import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/FontScale';
import { modalAlert } from '@/components/ui/ModalAlert';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { logCrud } from '@/services/logService';
import { sendPushNotification } from '@/services/pushService';

interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: string;
  priority: string;
  createdAt?: any;
}

type Role = 'admin' | 'farmer' | 'technician';

interface Props {
  role: Role;
}

const AUDIENCES = ['all', 'farmers', 'technicians'];
const PRIORITIES = ['high', 'medium', 'low'];

export default function AnnouncementsScreen({ role }: Props) {
  const isAdmin = role === 'admin';
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Admin CRUD state
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('all');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    const unsub = firestore()
      .collection(Collections.ANNOUNCEMENTS)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snap) => {
          const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
          if (isAdmin) {
            setItems(all);
          } else {
            const audienceKey = role === 'farmer' ? 'farmers' : 'technicians';
            setItems(all.filter(a => a.audience === 'all' || a.audience === audienceKey));
          }
          setLoading(false);
        },
        () => setLoading(false)
      );
    return () => unsub();
  }, []);

  // Admin helpers
  const reset = () => { setTitle(''); setContent(''); setAudience('all'); setPriority('medium'); setEditId(null); };
  const openEdit = (a: Announcement) => { setTitle(a.title); setContent(a.content); setAudience(a.audience); setPriority(a.priority); setEditId(a.id); setModal(true); };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { modalAlert('Error', 'Title and content required.'); return; }
    setSaving(true);
    try {
      const isUpdate = Boolean(editId);
      if (editId) {
        await firestore().collection(Collections.ANNOUNCEMENTS).doc(editId).update({ title: title.trim(), content: content.trim(), audience, priority, updatedAt: firestore.FieldValue.serverTimestamp() });
        await logCrud('Announcement Updated', `Updated: ${title.trim()}`, 'announcements', editId);
      } else {
        await firestore().collection(Collections.ANNOUNCEMENTS).add({ title: title.trim(), content: content.trim(), audience, priority, createdBy: 'admin_001', createdAt: firestore.FieldValue.serverTimestamp() });
        await logCrud('Announcement Created', `Added: ${title.trim()}`, 'announcements');
      }

      // Notify active users selected by the announcement audience on create and edit.
      try {
        let query = firestore().collection(Collections.USERS).where('status', '==', 'active');
        if (audience === 'farmers') query = query.where('role', '==', 'farmer');
        else if (audience === 'technicians') query = query.where('role', '==', 'technician');
        const usersSnap = await query.get();
        await Promise.all(usersSnap.docs.map(doc =>
          sendPushNotification(doc.id, {
            title: `📢 ${isUpdate ? 'Announcement Updated' : title.trim()}`,
            body: content.trim().substring(0, 120),
            data: { type: 'announcement', priority }
          })
        ));
      } catch (pushErr) { console.warn('Push notification failed:', pushErr); }
      setModal(false); reset();
    } catch (e: any) { modalAlert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string, name: string, targetAudience: string) => {
    modalAlert('Delete', `Delete "${name}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
      try {
        await firestore().collection(Collections.ANNOUNCEMENTS).doc(id).delete();
        await logCrud('Announcement Deleted', `Deleted: ${name}`, 'announcements', id);
        try {
          let query = firestore().collection(Collections.USERS).where('status', '==', 'active');
          if (targetAudience === 'farmers') query = query.where('role', '==', 'farmer');
          else if (targetAudience === 'technicians') query = query.where('role', '==', 'technician');
          const usersSnap = await query.get();
          await Promise.all(usersSnap.docs.map(doc => sendPushNotification(doc.id, {
            title: '📢 Announcement Removed', body: name, data: { type: 'announcement' }
          })));
        } catch (pushErr) { console.warn('Announcement push failed:', pushErr); }
      } catch (e: any) { modalAlert('Error', e.message); }
    }}]);
  };

  // Shared helpers
  const getPriorityColor = (p: string) => p === 'high' ? '#F44336' : p === 'medium' ? '#FF9800' : '#4CAF50';
  const getPriorityIcon = (p: string) => p === 'high' ? 'alert' : p === 'medium' ? 'bell' : 'check';

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isAdmin ? 'Announcements' : 'Announcements & Bulletins'}</Text>
        {isAdmin ? (
          <TouchableOpacity onPress={() => { reset(); setModal(true); }}><Icon name="dots" size={20} color={Colors.white} /></TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Content */}
      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        <Text style={s.count}>{items.length} announcement{items.length !== 1 ? 's' : ''}</Text>

        {items.length === 0 && (
          <View style={s.empty}>
            <Icon name="bell" size={48} color={Colors.textLight} />
            <Text style={s.emptyTitle}>No Announcements</Text>
            <Text style={s.emptyText}>
              {isAdmin ? 'No announcements yet.' : 'Check back later for updates from the admin team.'}
            </Text>
          </View>
        )}

        {/* Admin card style */}
        {isAdmin && items.map(a => (
          <View key={a.id} style={s.adminCard}>
            <View style={s.adminCardTop}>
              <View style={s.cardInfo}>
                <Text style={s.cardTitle}>{a.title}</Text>
                <View style={s.cardMeta}>
                  <View style={[s.badge, { backgroundColor: getPriorityColor(a.priority) + '20' }]}>
                    <Text style={[s.badgeText, { color: getPriorityColor(a.priority) }]}>{a.priority}</Text>
                  </View>
                  <Text style={s.audience}>To: {a.audience}</Text>
                </View>
              </View>
              <View style={s.actions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(a)}><Icon name="edit" size={14} color={Colors.primary} /></TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(a.id, a.title, a.audience)}><Icon name="close" size={14} color={Colors.error} /></TouchableOpacity>
              </View>
            </View>
            <Text style={s.adminCardContent} numberOfLines={2}>{a.content}</Text>
          </View>
        ))}

        {/* Farmer/Technician card style */}
        {!isAdmin && items.map(a => (
          <TouchableOpacity
            key={a.id}
            style={s.card}
            onPress={() => setExpandedId(expandedId === a.id ? null : a.id)}
            activeOpacity={0.8}
          >
            {/* Priority indicator */}
            <View style={[s.priorityBar, { backgroundColor: getPriorityColor(a.priority) }]} />

            <View style={s.cardBody}>
              <View style={s.cardTop}>
                <View style={[s.priorityIcon, { backgroundColor: getPriorityColor(a.priority) + '15' }]}>
                  <Icon name={getPriorityIcon(a.priority) as any} size={16} color={getPriorityColor(a.priority)} />
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardTitle}>{a.title}</Text>
                  <View style={s.cardMeta}>
                    <View style={[s.badge, { backgroundColor: getPriorityColor(a.priority) + '20' }]}>
                      <Text style={[s.badgeText, { color: getPriorityColor(a.priority) }]}>{a.priority}</Text>
                    </View>
                    {a.createdAt && <Text style={s.dateText}>{formatDate(a.createdAt)}</Text>}
                  </View>
                </View>
                <Icon name={expandedId === a.id ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSecondary} />
              </View>

              {/* Expandable content */}
              {expandedId === a.id ? (
                <Text style={s.cardContent}>{a.content}</Text>
              ) : (
                <Text style={s.cardPreview} numberOfLines={2}>{a.content}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Admin Create/Edit Modal */}
      {isAdmin && (
        <Modal visible={modal} transparent animationType="slide">
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.overlay}><View style={s.modal}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>{editId ? 'Edit' : 'New'} Announcement</Text>
              <TouchableOpacity onPress={() => { setModal(false); reset(); }}><Icon name="close" size={22} color={Colors.text} /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
            <Text style={s.label}>Title</Text>
            <TextInput style={s.input} placeholder="Announcement title..." placeholderTextColor={Colors.textLight} value={title} onChangeText={setTitle} />
            <Text style={s.label}>Content</Text>
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Write content..." placeholderTextColor={Colors.textLight} value={content} onChangeText={setContent} multiline />
            <Text style={s.label}>Audience</Text>
            <View style={s.optRow}>{AUDIENCES.map(a => (<TouchableOpacity key={a} style={[s.optBtn, audience === a && s.optBtnActive]} onPress={() => setAudience(a)}><Text style={[s.optText, audience === a && s.optTextActive]}>{a}</Text></TouchableOpacity>))}</View>
            <Text style={s.label}>Priority</Text>
            <View style={s.optRow}>{PRIORITIES.map(p => (<TouchableOpacity key={p} style={[s.optBtn, priority === p && { borderColor: getPriorityColor(p), backgroundColor: getPriorityColor(p) + '10' }]} onPress={() => setPriority(p)}><Text style={[s.optText, priority === p && { color: getPriorityColor(p), fontWeight: '700' }]}>{p}</Text></TouchableOpacity>))}</View>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={s.saveBtnText}>{editId ? 'Update' : 'Post'} Announcement</Text>}
            </TouchableOpacity>
            </ScrollView>
          </View></View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  // List
  list: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  count: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  // Empty
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg },
  emptyText: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
  // Farmer/Tech card (with priority bar)
  card: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, overflow: 'hidden', ...Shadow.light },
  priorityBar: { width: 4, borderTopLeftRadius: BorderRadius.lg, borderBottomLeftRadius: BorderRadius.lg },
  cardBody: { flex: 1, padding: Spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  priorityIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  dateText: { fontSize: 11, color: Colors.textSecondary },
  cardContent: { fontSize: FontSize.sm, color: Colors.text, marginTop: Spacing.md, lineHeight: 20 },
  cardPreview: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18 },
  // Admin card (simpler style)
  adminCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadow.light },
  adminCardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  adminCardContent: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18 },
  audience: { fontSize: 11, color: Colors.textSecondary },
  actions: { flexDirection: 'row', gap: 6 },
  editBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  delBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.error + '15', justifyContent: 'center', alignItems: 'center' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40, maxHeight: '85%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  optRow: { flexDirection: 'row', gap: Spacing.sm },
  optBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  optBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  optText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  optTextActive: { color: Colors.primary, fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl },
  saveBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});

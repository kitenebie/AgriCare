import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { logCrud } from '@/services/logService';

interface Announcement { id: string; title: string; content: string; audience: string; priority: string; createdAt?: any; }
const AUDIENCES = ['all', 'farmers', 'technicians'];
const PRIORITIES = ['high', 'medium', 'low'];

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('all');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    const unsub = firestore().collection(Collections.ANNOUNCEMENTS).orderBy('createdAt', 'desc').onSnapshot(
      (snap) => { setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const reset = () => { setTitle(''); setContent(''); setAudience('all'); setPriority('medium'); setEditId(null); };
  const openEdit = (a: Announcement) => { setTitle(a.title); setContent(a.content); setAudience(a.audience); setPriority(a.priority); setEditId(a.id); setModal(true); };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { Alert.alert('Error', 'Title and content required.'); return; }
    setSaving(true);
    try {
      if (editId) {
        await firestore().collection(Collections.ANNOUNCEMENTS).doc(editId).update({ title: title.trim(), content: content.trim(), audience, priority, updatedAt: firestore.FieldValue.serverTimestamp() });
        await logCrud('Announcement Updated', `Updated: ${title.trim()}`, 'announcements', editId);
      } else {
        await firestore().collection(Collections.ANNOUNCEMENTS).add({ title: title.trim(), content: content.trim(), audience, priority, createdBy: 'admin_001', createdAt: firestore.FieldValue.serverTimestamp() });
        await logCrud('Announcement Created', `Added: ${title.trim()}`, 'announcements');
      }
      setModal(false); reset();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete', `Delete "${name}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await firestore().collection(Collections.ANNOUNCEMENTS).doc(id).delete(); await logCrud('Announcement Deleted', `Deleted: ${name}`, 'announcements', id); } catch (e: any) { Alert.alert('Error', e.message); }
    }}]);
  };

  const getPriorityColor = (p: string) => p === 'high' ? '#F44336' : p === 'medium' ? '#FF9800' : '#4CAF50';

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} /></TouchableOpacity>
        <Text style={s.headerTitle}>Announcements</Text>
        <TouchableOpacity onPress={() => { reset(); setModal(true); }}><Icon name="dots" size={20} color={Colors.white} /></TouchableOpacity>
      </View>
      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        <Text style={s.count}>{items.length} announcements</Text>
        {items.length === 0 && <View style={s.empty}><Icon name="bell" size={48} color={Colors.textLight} /><Text style={s.emptyText}>No announcements</Text></View>}
        {items.map(a => (
          <View key={a.id} style={s.card}>
            <View style={s.cardTop}>
              <View style={s.cardInfo}>
                <Text style={s.cardTitle}>{a.title}</Text>
                <View style={s.cardMeta}>
                  <View style={[s.badge, { backgroundColor: getPriorityColor(a.priority) + '20' }]}><Text style={[s.badgeText, { color: getPriorityColor(a.priority) }]}>{a.priority}</Text></View>
                  <Text style={s.audience}>To: {a.audience}</Text>
                </View>
              </View>
              <View style={s.actions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(a)}><Icon name="edit" size={14} color={Colors.primary} /></TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(a.id, a.title)}><Icon name="close" size={14} color={Colors.error} /></TouchableOpacity>
              </View>
            </View>
            <Text style={s.cardContent} numberOfLines={2}>{a.content}</Text>
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}><View style={s.modal}>
          <View style={s.modalHead}><Text style={s.modalTitle}>{editId ? 'Edit' : 'New'} Announcement</Text><TouchableOpacity onPress={() => { setModal(false); reset(); }}><Icon name="close" size={22} color={Colors.text} /></TouchableOpacity></View>
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
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  list: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  count: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadow.light },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  audience: { fontSize: 11, color: Colors.textSecondary },
  cardContent: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 6 },
  editBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  delBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.error + '15', justifyContent: 'center', alignItems: 'center' },
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

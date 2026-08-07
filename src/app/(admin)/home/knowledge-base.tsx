import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { logCrud } from '@/services/logService';

interface Article { id: string; title: string; category: string; content: string; authorName?: string; views?: number; }
const CATS = ['Cattle Care', 'Poultry', 'Goat Health', 'Parasite Control', 'Emergency', 'Breeding', 'General'];

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');

  useEffect(() => {
    const unsub = firestore().collection(Collections.KNOWLEDGE_BASE).onSnapshot(
      (snap) => { setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Article))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const reset = () => { setTitle(''); setCategory('General'); setContent(''); setEditId(null); };
  const openEdit = (a: Article) => { setTitle(a.title); setCategory(a.category); setContent(a.content); setEditId(a.id); setModal(true); };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { Alert.alert('Error', 'Title and content required.'); return; }
    setSaving(true);
    try {
      if (editId) {
        await firestore().collection(Collections.KNOWLEDGE_BASE).doc(editId).update({ title: title.trim(), category, content: content.trim(), updatedAt: firestore.FieldValue.serverTimestamp() });
        await logCrud('Article Updated', `Updated: ${title.trim()}`, 'knowledgeBase', editId);
      } else {
        await firestore().collection(Collections.KNOWLEDGE_BASE).add({ title: title.trim(), category, content: content.trim(), authorName: 'Admin', views: 0, createdAt: firestore.FieldValue.serverTimestamp() });
        await logCrud('Article Created', `Added: ${title.trim()}`, 'knowledgeBase');
      }
      setModal(false); reset();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete', `Delete "${name}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await firestore().collection(Collections.KNOWLEDGE_BASE).doc(id).delete(); await logCrud('Article Deleted', `Deleted: ${name}`, 'knowledgeBase', id); } catch (e: any) { Alert.alert('Error', e.message); }
    }}]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} /></TouchableOpacity>
        <Text style={s.headerTitle}>Knowledge Base</Text>
        <TouchableOpacity onPress={() => { reset(); setModal(true); }}><Icon name="dots" size={20} color={Colors.white} /></TouchableOpacity>
      </View>
      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        <Text style={s.count}>{articles.length} articles</Text>
        {articles.length === 0 && <View style={s.empty}><Icon name="clipboard" size={48} color={Colors.textLight} /><Text style={s.emptyText}>No articles yet</Text></View>}
        {articles.map(a => (
          <View key={a.id} style={s.card}>
            <View style={s.cardInfo}>
              <Text style={s.cardTitle}>{a.title}</Text>
              <Text style={s.cardCat}>{a.category} • {a.views || 0} views</Text>
              <Text style={s.cardContent} numberOfLines={2}>{a.content}</Text>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(a)}><Icon name="edit" size={14} color={Colors.primary} /></TouchableOpacity>
              <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(a.id, a.title)}><Icon name="close" size={14} color={Colors.error} /></TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}><View style={s.modal}>
          <View style={s.modalHead}><Text style={s.modalTitle}>{editId ? 'Edit' : 'Add'} Article</Text><TouchableOpacity onPress={() => { setModal(false); reset(); }}><Icon name="close" size={22} color={Colors.text} /></TouchableOpacity></View>
          <Text style={s.label}>Title</Text>
          <TextInput style={s.input} placeholder="Article title..." placeholderTextColor={Colors.textLight} value={title} onChangeText={setTitle} />
          <Text style={s.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}><View style={s.catRow}>
            {CATS.map(c => (<TouchableOpacity key={c} style={[s.catBtn, category === c && s.catBtnActive]} onPress={() => setCategory(c)}><Text style={[s.catBtnText, category === c && s.catBtnTextActive]}>{c}</Text></TouchableOpacity>))}
          </View></ScrollView>
          <Text style={s.label}>Content</Text>
          <TextInput style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]} placeholder="Write article content..." placeholderTextColor={Colors.textLight} value={content} onChangeText={setContent} multiline />
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={s.saveBtnText}>{editId ? 'Update' : 'Add'} Article</Text>}
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
  card: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadow.light },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardCat: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 2 },
  cardContent: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  actions: { justifyContent: 'center', gap: 6 },
  editBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  delBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.error + '15', justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40, maxHeight: '85%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  catRow: { flexDirection: 'row', gap: Spacing.sm },
  catBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  catBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catBtnText: { fontSize: 12, color: Colors.textSecondary },
  catBtnTextActive: { color: Colors.white, fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl },
  saveBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});

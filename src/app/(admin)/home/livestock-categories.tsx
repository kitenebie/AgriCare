import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { modalAlert } from '@/components/ui/ModalAlert';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { logCrud } from '@/services/logService';

interface Category { id: string; name: string; type: string; breeds: string[]; count: number; }

const TYPES = [
  { value: 'large', label: 'Large', color: '#4CAF50' },
  { value: 'small', label: 'Small', color: '#FF9800' },
  { value: 'poultry', label: 'Poultry', color: '#2196F3' },
];

export default function LivestockCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('large');
  const [breeds, setBreeds] = useState('');

  useEffect(() => {
    const unsub = firestore().collection(Collections.LIVESTOCK_CATEGORIES).onSnapshot(
      (snap) => { setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const reset = () => { setName(''); setType('large'); setBreeds(''); setEditId(null); };

  const openEdit = (c: Category) => { setName(c.name); setType(c.type); setBreeds((c.breeds || []).join(', ')); setEditId(c.id); setModal(true); };

  const handleSave = async () => {
    if (!name.trim()) { modalAlert('Error', 'Name is required.'); return; }
    const breedList = breeds.split(',').map(b => b.trim()).filter(b => b);
    setSaving(true);
    try {
      console.log('[DEBUG] Attempting Firestore write...');
      if (editId) {
        await firestore().collection(Collections.LIVESTOCK_CATEGORIES).doc(editId).update({ name: name.trim(), type, breeds: breedList, updatedAt: firestore.FieldValue.serverTimestamp() });
        await logCrud('Category Updated', `Updated: ${name.trim()}`, 'livestockCategories', editId);
        console.log('[DEBUG] ✅ Update success');
      } else {
        await firestore().collection(Collections.LIVESTOCK_CATEGORIES).add({ name: name.trim(), type, breeds: breedList, count: 0, createdAt: firestore.FieldValue.serverTimestamp(), updatedAt: firestore.FieldValue.serverTimestamp() });
        await logCrud('Category Created', `Added: ${name.trim()}`, 'livestockCategories');
        console.log('[DEBUG] ✅ Add success');
      }
      setModal(false); reset();
    } catch (e: any) {
      console.error('[DEBUG] ❌ Write failed:', e.code, e.message);
      modalAlert('Error', (e.code || '') + ': ' + (e.message || 'Failed'));
    } finally { setSaving(false); }
  };

  const handleDelete = (id: string, catName: string) => {
    modalAlert('Delete', `Delete "${catName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await firestore().collection(Collections.LIVESTOCK_CATEGORIES).doc(id).delete();
          await logCrud('Category Deleted', `Deleted: ${catName}`, 'livestockCategories', id);
        } catch (e: any) { modalAlert('Error', e.message || 'Failed'); }
      }},
    ]);
  };

  const getColor = (t: string) => TYPES.find(x => x.value === t)?.color || '#666';

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /><Text style={s.loadText}>Loading...</Text></View>;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} /></TouchableOpacity>
        <Text style={s.headerTitle}>Livestock Categories</Text>
        <TouchableOpacity onPress={() => { reset(); setModal(true); }}><Icon name="dots" size={20} color={Colors.white} /></TouchableOpacity>
      </View>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        <Text style={s.subtitle}>{categories.length} categories</Text>
        {categories.length === 0 && <View style={s.empty}><Icon name="hen" size={48} color={Colors.textLight} /><Text style={s.emptyText}>No categories. Tap + to add.</Text></View>}
        {categories.map(c => (
          <View key={c.id} style={s.card}>
            <View style={s.cardLeft}>
              <View style={[s.cardIcon, { backgroundColor: getColor(c.type) + '18' }]}><Icon name="hen" size={22} color={getColor(c.type)} /></View>
              <View style={s.cardInfo}>
                <Text style={s.cardName}>{c.name}</Text>
                <View style={s.meta}>
                  <View style={[s.badge, { backgroundColor: getColor(c.type) + '20' }]}><Text style={[s.badgeText, { color: getColor(c.type) }]}>{c.type}</Text></View>
                  <Text style={s.metaText}>{(c.breeds || []).length} breeds</Text>
                  <Text style={s.metaText}>{c.count || 0} animals</Text>
                </View>
                <Text style={s.breedsText} numberOfLines={1}>{(c.breeds || []).join(', ') || 'No breeds'}</Text>
              </View>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(c)}><Icon name="edit" size={14} color={Colors.primary} /></TouchableOpacity>
              <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(c.id, c.name)}><Icon name="close" size={14} color={Colors.error} /></TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHead}><Text style={s.modalTitle}>{editId ? 'Edit' : 'Add'} Category</Text><TouchableOpacity onPress={() => { setModal(false); reset(); }}><Icon name="close" size={22} color={Colors.text} /></TouchableOpacity></View>
            <Text style={s.label}>Category Name</Text>
            <TextInput style={s.input} placeholder="e.g. Cow, Goat..." placeholderTextColor={Colors.textLight} value={name} onChangeText={setName} />
            <Text style={s.label}>Animal Type</Text>
            <View style={s.typeRow}>
              {TYPES.map(t => (<TouchableOpacity key={t.value} style={[s.typeBtn, type === t.value && { borderColor: t.color, backgroundColor: t.color + '10' }]} onPress={() => setType(t.value)}><Text style={[s.typeBtnText, type === t.value && { color: t.color, fontWeight: '700' }]}>{t.label}</Text></TouchableOpacity>))}
            </View>
            <Text style={s.label}>Breeds (comma separated)</Text>
            <TextInput style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="e.g. Holstein, Brahman..." placeholderTextColor={Colors.textLight} value={breeds} onChangeText={setBreeds} multiline />
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={s.saveBtnText}>{editId ? 'Update' : 'Add'} Category</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadText: { marginTop: 12, color: Colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  list: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.light },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: Spacing.md },
  cardName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 3 },
  badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  metaText: { fontSize: 10, color: Colors.textSecondary },
  breedsText: { fontSize: 10, color: Colors.textLight, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  editBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  delBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.error + '15', justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40, maxHeight: '80%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  typeRow: { flexDirection: 'row', gap: Spacing.sm },
  typeBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  typeBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl, marginBottom: Spacing.xxl },
  saveBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' }
});

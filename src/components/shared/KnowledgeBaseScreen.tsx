/**
 * Shared Knowledge Base Screen
 * Used by: Admin, Farmer, Technician
 *
 * Permissions:
 * - All roles can ADD articles
 * - Author can EDIT/DELETE their own articles
 * - Admin can EDIT/DELETE ALL articles
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { modalAlert } from '@/components/ui/ModalAlert';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { getCurrentUserProfile } from '@/services/authService';
import { logCrud } from '@/services/logService';
import { sendPushNotification } from '@/services/pushService';

interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  views?: number;
  createdAt?: any;
}

const CATEGORIES = ['Cattle Care', 'Poultry', 'Goat Health', 'Swine', 'Parasite Control', 'Emergency', 'Breeding', 'Vaccination', 'Nutrition', 'General'];

export default function KnowledgeBaseScreen() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState({ id: '', name: '', role: '' });

  useEffect(() => {
    const load = async () => {
      const p = await getCurrentUserProfile();
      if (p) setCurrentUser({ id: (p as any).id || '', name: (p as any).displayName || '', role: (p as any).role || '' });
    };
    load();
  }, []);

  useEffect(() => {
    const unsub = firestore()
      .collection(Collections.KNOWLEDGE_BASE)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snap) => { setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Article))); setLoading(false); },
        () => setLoading(false)
      );
    return () => unsub();
  }, []);

  const filtered = articles.filter(a => {
    const matchCat = filter === 'All' || a.category === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const canEditDelete = (article: Article) => {
    return currentUser.role === 'admin' || article.authorId === currentUser.id;
  };

  const reset = () => { setTitle(''); setCategory('General'); setContent(''); setEditId(null); };

  const openEdit = (a: Article) => {
    setTitle(a.title);
    setCategory(a.category);
    setContent(a.content);
    setEditId(a.id);
    setModal(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { modalAlert('Error', 'Title and content required.'); return; }
    setSaving(true);
    try {
      if (editId) {
        await firestore().collection(Collections.KNOWLEDGE_BASE).doc(editId).update({
          title: title.trim(),
          category,
          content: content.trim(),
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
        await logCrud('Article Updated', `Updated: ${title.trim()}`, 'knowledgeBase', editId);
      } else {
        await firestore().collection(Collections.KNOWLEDGE_BASE).add({
          title: title.trim(),
          category,
          content: content.trim(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          views: 0,
          createdAt: firestore.FieldValue.serverTimestamp()
        });
        await logCrud('Article Created', `Added: ${title.trim()}`, 'knowledgeBase');

        // Send FCM push to all active users (except author)
        try {
          const usersSnap = await firestore().collection(Collections.USERS).where('status', '==', 'active').get();
          const pushPromises = usersSnap.docs
            .filter(doc => doc.id !== currentUser.id)
            .map(doc => sendPushNotification(doc.id, {
              title: `📚 New Knowledge Base Article`,
              body: `${currentUser.name} published: ${title.trim()}`,
              data: { type: 'knowledge_base', category }
            }));
          await Promise.all(pushPromises);
        } catch (pushErr) { console.warn('KB push failed:', pushErr); }
      }
      setModal(false);
      reset();
    } catch (e: any) { modalAlert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string, name: string) => {
    modalAlert('Delete Article', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await firestore().collection(Collections.KNOWLEDGE_BASE).doc(id).delete();
          await logCrud('Article Deleted', `Deleted: ${name}`, 'knowledgeBase', id);
        } catch (e: any) { modalAlert('Error', e.message); }
      }},
    ]);
  };

  const incrementViews = async (id: string) => {
    try {
      await firestore().collection(Collections.KNOWLEDGE_BASE).doc(id).update({
        views: firestore.FieldValue.increment(1)
      });
    } catch (e) {}
  };

  const openArticle = (articleId: string) => {
    // Determine route prefix based on current user's role
    let prefix = '/(farmer)/home';
    if (currentUser.role === 'admin') prefix = '/(admin)/home';
    else if (currentUser.role === 'technician') prefix = '/(technician)/dashboard';
    router.push({ pathname: `${prefix}/knowledge-base-view`, params: { id: articleId } } as any);
  };

  const getRoleColor = (role?: string) => role === 'admin' ? '#1565C0' : role === 'technician' ? '#2E7D32' : '#E65100';
  const formatDate = (ts: any) => { if (!ts) return ''; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Knowledge Base</Text>
        <TouchableOpacity onPress={() => { reset(); setModal(true); }}>
          <Icon name="edit" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Icon name="search" size={16} color={Colors.textLight} />
        <TextInput style={s.searchInput} placeholder="Search articles..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        <TouchableOpacity style={[s.filterBtn, filter === 'All' && s.filterBtnActive]} onPress={() => setFilter('All')}>
          <Text style={[s.filterText, filter === 'All' && s.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[s.filterBtn, filter === c && s.filterBtnActive]} onPress={() => setFilter(c)}>
            <Text style={[s.filterText, filter === c && s.filterTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Articles List */}
      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        <Text style={s.count}>{filtered.length} article{filtered.length !== 1 ? 's' : ''}</Text>
        {filtered.length === 0 && (
          <View style={s.empty}>
            <Icon name="clipboard" size={48} color={Colors.textLight} />
            <Text style={s.emptyText}>{search ? 'No articles match your search' : 'No articles yet'}</Text>
          </View>
        )}
        {filtered.map(a => (
          <TouchableOpacity key={a.id} style={s.card} onPress={() => openArticle(a.id)} activeOpacity={0.7}>
            <View style={s.cardHeader}>
              <View style={s.cardInfo}>
                <Text style={s.cardTitle}>{a.title}</Text>
                <View style={s.cardMeta}>
                  <View style={s.catBadge}><Text style={s.catText}>{a.category}</Text></View>
                  <Text style={s.metaText}>{a.views || 0} views</Text>
                  {a.createdAt && <Text style={s.metaText}>{formatDate(a.createdAt)}</Text>}
                </View>
                {a.authorName && (
                  <View style={s.authorRow}>
                    <Text style={s.authorLabel}>by </Text>
                    <Text style={[s.authorName, { color: getRoleColor(a.authorRole) }]}>{a.authorName}</Text>
                    {a.authorRole && (
                      <View style={[s.roleBadge, { backgroundColor: getRoleColor(a.authorRole) + '15' }]}>
                        <Text style={[s.roleText, { color: getRoleColor(a.authorRole) }]}>{a.authorRole}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              {canEditDelete(a) && (
                <View style={s.actions}>
                  <TouchableOpacity style={s.editBtn} onPress={() => openEdit(a)}>
                    <Icon name="edit" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(a.id, a.title)}>
                    <Icon name="close" size={14} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {expanded === a.id ? (
              <Text style={s.cardContent}>{a.content}</Text>
            ) : (
              <Text style={s.cardPreview} numberOfLines={2}>{a.content}</Text>
            )}
          </TouchableOpacity>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>{editId ? 'Edit' : 'New'} Article</Text>
              <TouchableOpacity onPress={() => { setModal(false); reset(); }}>
                <Icon name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Title</Text>
              <TextInput style={s.input} placeholder="Article title..." placeholderTextColor={Colors.textLight} value={title} onChangeText={setTitle} />
              <Text style={s.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}>
                <View style={s.catRow}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity key={c} style={[s.catBtn, category === c && s.catBtnActive]} onPress={() => setCategory(c)}>
                      <Text style={[s.catBtnText, category === c && s.catBtnTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={s.label}>Content</Text>
              <TextInput style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]} placeholder="Write article content..." placeholderTextColor={Colors.textLight} value={content} onChangeText={setContent} multiline />
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={s.saveBtnText}>{editId ? 'Update' : 'Publish'} Article</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: -12, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Shadow.light, gap: 8 },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  filterScroll: { maxHeight: 44, marginTop: Spacing.md },
  filterContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white, fontWeight: '700' },
  list: { flex: 1, paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  count: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.sm },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadow.light },
  cardHeader: { flexDirection: 'row' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  catBadge: { backgroundColor: Colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  catText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  metaText: { fontSize: 10, color: Colors.textLight },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  authorLabel: { fontSize: 11, color: Colors.textLight },
  authorName: { fontSize: 11, fontWeight: '600' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginLeft: 4 },
  roleText: { fontSize: 9, fontWeight: '700' },
  actions: { justifyContent: 'flex-start', gap: 6, marginLeft: 8 },
  editBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  delBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.error + '15', justifyContent: 'center', alignItems: 'center' },
  cardPreview: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 8, lineHeight: 18 },
  cardContent: { fontSize: FontSize.sm, color: Colors.text, marginTop: 8, lineHeight: 20 },
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
  saveBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' }
});

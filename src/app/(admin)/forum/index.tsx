import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { logCrud } from '@/services/logService';
import { getCurrentUserProfile } from '@/services/authService';

interface Post { id: string; title: string; category: string; content: string; authorId: string; authorName: string; authorRole: string; likes: number; replies: number; views: number; status: string; createdAt?: any; }
const CATS = ['All', 'Cattle', 'Swine', 'Poultry', 'Goat', 'Health Tips', 'General'];

export default function ForumPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');
  const [currentUser, setCurrentUser] = useState({ id: '', name: 'Admin', role: 'admin' });

  useEffect(() => {
    const load = async () => { const p = await getCurrentUserProfile(); if (p) setCurrentUser({ id: (p as any).id || '', name: (p as any).displayName || 'Admin', role: (p as any).role || 'admin' }); };
    load();
  }, []);

  useEffect(() => {
    const unsub = firestore().collection(Collections.COMMUNITY_FORUM).onSnapshot(
      (snap) => { setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const filtered = posts.filter(p => filter === 'All' || p.category === filter);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) { Alert.alert('Error', 'Title and content required.'); return; }
    setSaving(true);
    try {
      await firestore().collection(Collections.COMMUNITY_FORUM).add({ title: title.trim(), category, content: content.trim(), authorId: currentUser.id, authorName: currentUser.name, authorRole: currentUser.role, likes: 0, replies: 0, views: 0, status: 'active', createdAt: firestore.FieldValue.serverTimestamp() });
      await logCrud('Forum Post Created', `New post: ${title.trim()}`, 'communityForum');
      setModal(false); setTitle(''); setContent(''); setCategory('General');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string, postTitle: string) => {
    Alert.alert('Delete Post', `Delete "${postTitle}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await firestore().collection(Collections.COMMUNITY_FORUM).doc(id).delete(); await logCrud('Forum Post Deleted', `Deleted: ${postTitle}`, 'communityForum', id); } catch (e: any) { Alert.alert('Error', e.message); }
    }}]);
  };

  const getRoleColor = (role: string) => role === 'admin' ? '#1565C0' : role === 'technician' ? '#2E7D32' : '#E65100';

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Community Forum</Text>
        <TouchableOpacity style={s.newBtn} onPress={() => setModal(true)}><Icon name="edit" size={16} color={Colors.white} /><Text style={s.newBtnText}>New Post</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {CATS.map(c => (<TouchableOpacity key={c} style={[s.filterBtn, filter === c && s.filterBtnActive]} onPress={() => setFilter(c)}><Text style={[s.filterText, filter === c && s.filterTextActive]}>{c}</Text></TouchableOpacity>))}
      </ScrollView>
      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && <View style={s.empty}><Icon name="messages" size={48} color={Colors.textLight} /><Text style={s.emptyText}>No posts found</Text></View>}
        {filtered.map(p => (
          <View key={p.id} style={s.card}>
            <View style={s.cardTop}>
              <Avatar name={p.authorName} size={36} />
              <View style={s.cardAuthor}>
                <Text style={s.authorName}>{p.authorName}</Text>
                <View style={[s.roleBadge, { backgroundColor: getRoleColor(p.authorRole) + '15' }]}><Text style={[s.roleText, { color: getRoleColor(p.authorRole) }]}>{p.authorRole}</Text></View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(p.id, p.title)}><Icon name="close" size={16} color={Colors.textLight} /></TouchableOpacity>
            </View>
            <Text style={s.postTitle}>{p.title}</Text>
            <Text style={s.postContent} numberOfLines={3}>{p.content}</Text>
            <View style={s.postMeta}>
              <View style={s.catBadge}><Text style={s.catText}>{p.category}</Text></View>
              <Text style={s.metaText}>{p.likes} likes</Text>
              <Text style={s.metaText}>{p.replies} replies</Text>
              <Text style={s.metaText}>{p.views} views</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}><View style={s.modal}>
          <View style={s.modalHead}><Text style={s.modalTitle}>New Post</Text><TouchableOpacity onPress={() => setModal(false)}><Icon name="close" size={22} color={Colors.text} /></TouchableOpacity></View>
          <Text style={s.label}>Title</Text>
          <TextInput style={s.input} placeholder="Post title..." placeholderTextColor={Colors.textLight} value={title} onChangeText={setTitle} />
          <Text style={s.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}><View style={s.catRow}>
            {CATS.filter(c => c !== 'All').map(c => (<TouchableOpacity key={c} style={[s.catBtn, category === c && s.catBtnActive]} onPress={() => setCategory(c)}><Text style={[s.catBtnT, category === c && s.catBtnTActive]}>{c}</Text></TouchableOpacity>))}
          </View></ScrollView>
          <Text style={s.label}>Content</Text>
          <TextInput style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]} placeholder="Write your post..." placeholderTextColor={Colors.textLight} value={content} onChangeText={setContent} multiline />
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={s.saveBtnText}>Post</Text>}
          </TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  newBtnText: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm },
  filterScroll: { maxHeight: 44 },
  filterContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white, fontWeight: '700' },
  list: { flex: 1, paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.light },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  cardAuthor: { flex: 1, marginLeft: Spacing.sm },
  authorName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  roleText: { fontSize: 9, fontWeight: '700' },
  postTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  postContent: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  catBadge: { backgroundColor: Colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  catText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  metaText: { fontSize: 11, color: Colors.textLight },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40, maxHeight: '85%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  catRow: { flexDirection: 'row', gap: Spacing.sm },
  catBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  catBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catBtnT: { fontSize: 12, color: Colors.textSecondary },
  catBtnTActive: { color: Colors.white, fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl },
  saveBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});

/**
 * Shared Community Forum Screen
 * Used by: Admin, Farmer, Technician
 *
 * Permissions:
 * - All roles can CREATE posts and replies
 * - Author can EDIT/DELETE their own posts
 * - Admin can EDIT/DELETE ALL posts
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
import { sendPushNotification, sendPushNotificationToMany } from '@/services/pushService';

interface Post {
  id: string;
  title: string;
  category: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorPhotoURL?: string;
  authorPhotoURL?: string;
  likes: number;
  replies: number;
  views: number;
  status: string;
  createdAt?: any;
}

interface Reply {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt?: any;
}

const CATEGORIES = ['All', 'Cattle', 'Swine', 'Poultry', 'Goat', 'Health Tips', 'Breeding', 'General'];

export default function ForumScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');
  const [currentUser, setCurrentUser] = useState({ id: '', name: '', role: '', photoURL: '' });

  // Reply state
  const [replyModal, setReplyModal] = useState(false);
  const [replyPostId, setReplyPostId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

  useEffect(() => {
    const load = async () => {
      const p = await getCurrentUserProfile();
      if (p) setCurrentUser({ id: (p as any).id || '', name: (p as any).displayName || '', role: (p as any).role || '', photoURL: (p as any).photoURL || '' });
    };
    load();
  }, []);

  useEffect(() => {
    const unsub = firestore()
      .collection(Collections.COMMUNITY_FORUM)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        async (snap) => {
          const postsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
          // Fetch photoURL from users collection for posts missing authorPhotoURL
          const postsWithPhotos = await Promise.all(
            postsData.map(async (post) => {
              if (!post.authorPhotoURL && post.authorId) {
                try {
                  const userDoc = await firestore().collection(Collections.USERS).doc(post.authorId).get();
                  if (userDoc.exists) post.authorPhotoURL = userDoc.data()?.photoURL || '';
                } catch (e) {}
              }
              return post;
            })
          );
          setPosts(postsWithPhotos);
          setLoading(false);
        },
        () => setLoading(false)
      );
    return () => unsub();
  }, []);

  const filtered = posts.filter(p => {
    const matchCat = filter === 'All' || p.category === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const canEditDelete = (post: Post) => {
    return currentUser.role === 'admin' || post.authorId === currentUser.id;
  };

  const canDeleteReply = (reply: Reply) => {
    return currentUser.role === 'admin' || reply.authorId === currentUser.id;
  };

  const reset = () => { setTitle(''); setCategory('General'); setContent(''); setEditId(null); };

  const openEdit = (p: Post) => {
    setTitle(p.title);
    setCategory(p.category);
    setContent(p.content);
    setEditId(p.id);
    setModal(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { modalAlert('Error', 'Title and content required.'); return; }
    setSaving(true);
    try {
      if (editId) {
        await firestore().collection(Collections.COMMUNITY_FORUM).doc(editId).update({
          title: title.trim(),
          category,
          content: content.trim(),
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
        await logCrud('Forum Post Updated', `Updated: ${title.trim()}`, 'communityForum', editId);
      } else {
        await firestore().collection(Collections.COMMUNITY_FORUM).add({
          title: title.trim(),
          category,
          content: content.trim(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          authorPhotoURL: currentUser.photoURL,
          likes: 0,
          replies: 0,
          views: 0,
          status: 'active',
          createdAt: firestore.FieldValue.serverTimestamp()
        });
        await logCrud('Forum Post Created', `New post: ${title.trim()}`, 'communityForum');

        // Send FCM push to all active users (except author)
        try {
          const usersSnap = await firestore().collection(Collections.USERS).where('status', '==', 'active').get();
          const contentPreview = content.trim().substring(0, 180);
          const targetUserIds = usersSnap.docs
            .filter(doc => doc.id !== currentUser.id)
            .map(doc => doc.id);
          await sendPushNotificationToMany(targetUserIds, {
            title: `${currentUser.name} was posted on Forum`,
            body: `${title.trim()} - ${contentPreview}`,
            data: { type: 'forum_post' }
          });
        } catch (pushErr) { console.warn('Forum push failed:', pushErr); }
      }
      setModal(false);
      reset();
    } catch (e: any) { modalAlert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string, postTitle: string) => {
    modalAlert('Delete Post', `Delete "${postTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await firestore().collection(Collections.COMMUNITY_FORUM).doc(id).delete();
          await logCrud('Forum Post Deleted', `Deleted: ${postTitle}`, 'communityForum', id);
        } catch (e: any) { modalAlert('Error', e.message); }
      }},
    ]);
  };

  const handleLike = async (postId: string) => {
    try {
      await firestore().collection(Collections.COMMUNITY_FORUM).doc(postId).update({
        likes: firestore.FieldValue.increment(1)
      });

      // Send FCM push to post author for react
      const likedPost = posts.find(p => p.id === postId);
      if (likedPost && likedPost.authorId && likedPost.authorId !== currentUser.id) {
        try {
          await sendPushNotification(likedPost.authorId, {
            title: `${currentUser.name} was react on ${likedPost.authorName}'s post`,
            body: `❤️`,
            data: { type: 'forum_react', postId }
          });
        } catch (pushErr) { console.warn('React push failed:', pushErr); }
      }
    } catch (e) {}
  };

  // View post with replies
  const openPost = (post: Post) => {
    // Navigate to full view page
    let prefix = '/(farmer)/home';
    if (currentUser.role === 'admin') prefix = '/(admin)/home';
    else if (currentUser.role === 'technician') prefix = '/(technician)/dashboard';
    router.push({ pathname: `${prefix}/forum-view`, params: { id: post.id } } as any);
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !replyPostId) return;
    try {
      await firestore()
        .collection(Collections.COMMUNITY_FORUM)
        .doc(replyPostId)
        .collection('replies')
        .add({
          content: replyContent.trim(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorRole: currentUser.role,
          authorPhotoURL: currentUser.photoURL,
          createdAt: firestore.FieldValue.serverTimestamp()
        });
      // Update reply count
      await firestore().collection(Collections.COMMUNITY_FORUM).doc(replyPostId).update({
        replies: firestore.FieldValue.increment(1)
      });

      // Send FCM push to post author (if not replying to own post)
      if (viewingPost && viewingPost.authorId && viewingPost.authorId !== currentUser.id) {
        try {
          const replyPreview = replyContent.trim().substring(0, 180);
          await sendPushNotification(viewingPost.authorId, {
            title: `${currentUser.name} was posted on Forum ${viewingPost.title}`,
            body: replyPreview,
            data: { type: 'forum_reply', postId: viewingPost.id }
          });
        } catch (pushErr) { console.warn('Reply push failed:', pushErr); }
      }

      // Refresh replies
      const snap = await firestore()
        .collection(Collections.COMMUNITY_FORUM)
        .doc(replyPostId)
        .collection('replies')
        .orderBy('createdAt', 'asc')
        .get();
      setReplies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reply)));
      setReplyContent('');
    } catch (e: any) { modalAlert('Error', e.message); }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!replyPostId) return;
    modalAlert('Delete Reply', 'Delete this reply?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await firestore().collection(Collections.COMMUNITY_FORUM).doc(replyPostId).collection('replies').doc(replyId).delete();
          await firestore().collection(Collections.COMMUNITY_FORUM).doc(replyPostId).update({ replies: firestore.FieldValue.increment(-1) });
          setReplies(prev => prev.filter(r => r.id !== replyId));
        } catch (e: any) { modalAlert('Error', e.message); }
      }},
    ]);
  };

  const getRoleColor = (role: string) => role === 'admin' ? '#1565C0' : role === 'technician' ? '#2E7D32' : '#E65100';
  const formatDate = (ts: any) => { if (!ts) return ''; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }); };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Community Forum</Text>
        <TouchableOpacity onPress={() => { reset(); setModal(true); }}>
          <Icon name="edit" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Icon name="search" size={16} color={Colors.textLight} />
        <TextInput style={s.searchInput} placeholder="Search discussions..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[s.filterBtn, filter === c && s.filterBtnActive]} onPress={() => setFilter(c)}>
            <Text style={[s.filterText, filter === c && s.filterTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Posts */}
      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={s.empty}>
            <Icon name="messages" size={48} color={Colors.textLight} />
            <Text style={s.emptyText}>{search ? 'No posts match your search' : 'No discussions yet. Start one!'}</Text>
          </View>
        )}
        {filtered.map(p => (
          <TouchableOpacity key={p.id} style={s.card} onPress={() => openPost(p)} activeOpacity={0.7}>
            <View style={s.cardTop}>
              <Avatar name={p.authorName} imageUrl={p.authorPhotoURL} size={36} />
              <View style={s.cardAuthor}>
                <Text style={s.authorName}>{p.authorName}</Text>
                <View style={[s.roleBadge, { backgroundColor: getRoleColor(p.authorRole) + '15' }]}>
                  <Text style={[s.roleText, { color: getRoleColor(p.authorRole) }]}>{p.authorRole}</Text>
                </View>
              </View>
              {p.createdAt && <Text style={s.dateText}>{formatDate(p.createdAt)}</Text>}
            </View>
            <Text style={s.postTitle}>{p.title}</Text>
            <Text style={s.postContent} numberOfLines={3}>{p.content}</Text>
            <View style={s.postMeta}>
              <View style={s.catBadge}><Text style={s.catText}>{p.category}</Text></View>
              <TouchableOpacity style={s.likeBtn} onPress={() => handleLike(p.id)}>
                <Icon name="heart" size={12} color={Colors.error} />
                <Text style={s.metaText}>{p.likes}</Text>
              </TouchableOpacity>
              <View style={s.metaItem}>
                <Icon name="messages" size={12} color={Colors.textLight} />
                <Text style={s.metaText}>{p.replies}</Text>
              </View>
              <Text style={s.metaText}>{p.views} views</Text>
              {canEditDelete(p) && (
                <View style={s.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(p)}>
                    <Icon name="edit" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(p.id, p.title)}>
                    <Icon name="close" size={14} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Create/Edit Post Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>{editId ? 'Edit' : 'New'} Post</Text>
              <TouchableOpacity onPress={() => { setModal(false); reset(); }}>
                <Icon name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Title</Text>
              <TextInput style={s.input} placeholder="Post title..." placeholderTextColor={Colors.textLight} value={title} onChangeText={setTitle} />
              <Text style={s.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}>
                <View style={s.catRow}>
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <TouchableOpacity key={c} style={[s.catChip, category === c && s.catChipActive]} onPress={() => setCategory(c)}>
                      <Text style={[s.catChipText, category === c && s.catChipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={s.label}>Content</Text>
              <TextInput style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]} placeholder="Write your discussion..." placeholderTextColor={Colors.textLight} value={content} onChangeText={setContent} multiline />
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={s.saveBtnText}>{editId ? 'Update' : 'Post'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* View Post + Replies Modal */}
      <Modal visible={replyModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.modal, { maxHeight: '90%' }]}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle} numberOfLines={1}>{viewingPost?.title || 'Post'}</Text>
              <TouchableOpacity onPress={() => { setReplyModal(false); setViewingPost(null); setReplies([]); }}>
                <Icon name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {viewingPost && (
              <View style={s.postDetailHeader}>
                <Text style={s.postDetailContent}>{viewingPost.content}</Text>
                <Text style={s.postDetailAuthor}>— {viewingPost.authorName} ({viewingPost.authorRole})</Text>
              </View>
            )}
            <Text style={[s.label, { marginTop: Spacing.md }]}>Replies ({replies.length})</Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {loadingReplies ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
              ) : replies.length === 0 ? (
                <Text style={s.noReplies}>No replies yet. Be the first!</Text>
              ) : (
                replies.map(r => (
                  <View key={r.id} style={s.replyCard}>
                    <View style={s.replyHeader}>
                      <Avatar name={r.authorName} size={28} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={s.replyAuthor}>{r.authorName}</Text>
                        <Text style={[s.replyRole, { color: getRoleColor(r.authorRole) }]}>{r.authorRole}</Text>
                      </View>
                      {canDeleteReply(r) && (
                        <TouchableOpacity onPress={() => handleDeleteReply(r.id)}>
                          <Icon name="close" size={14} color={Colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={s.replyContent}>{r.content}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            {/* Reply Input */}
            <View style={s.replyInputRow}>
              <TextInput
                style={s.replyInput}
                placeholder="Write a reply..."
                placeholderTextColor={Colors.textLight}
                value={replyContent}
                onChangeText={setReplyContent}
                multiline
              />
              <TouchableOpacity style={s.replyBtn} onPress={handleReply} disabled={!replyContent.trim()}>
                <Icon name="send" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
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
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg, textAlign: 'center' },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.light },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  cardAuthor: { flex: 1, marginLeft: Spacing.sm },
  authorName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  roleText: { fontSize: 9, fontWeight: '700' },
  dateText: { fontSize: 10, color: Colors.textLight },
  postTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  postContent: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Spacing.md },
  catBadge: { backgroundColor: Colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  catText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: Colors.textLight },
  cardActions: { flexDirection: 'row', gap: 10, marginLeft: 'auto' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40, maxHeight: '85%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, flex: 1 },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  catRow: { flexDirection: 'row', gap: Spacing.sm },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: 12, color: Colors.textSecondary },
  catChipTextActive: { color: Colors.white, fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl },
  saveBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  // Post detail / replies
  postDetailHeader: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm },
  postDetailContent: { fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
  postDetailAuthor: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 8, fontStyle: 'italic' },
  noReplies: { fontSize: FontSize.sm, color: Colors.textLight, textAlign: 'center', paddingVertical: 20 },
  replyCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  replyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  replyAuthor: { fontSize: 12, fontWeight: '600', color: Colors.text },
  replyRole: { fontSize: 9, fontWeight: '600' },
  replyContent: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 18, marginLeft: 36 },
  replyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  replyInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm, borderWidth: 1, borderColor: Colors.border, maxHeight: 80, color: Colors.text },
  replyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }
});

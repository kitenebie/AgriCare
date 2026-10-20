/**
 * Forum Post Full View with Replies
 * Shows full post content + all replies + reply input
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { AppTextInput as TextInput, AppText as Text } from '@/components/ui/FontScale';
import { modalAlert } from '@/components/ui/ModalAlert';
import firestore from '@react-native-firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { getCurrentUserProfile } from '@/services/authService';
import { sendPushNotification } from '@/services/pushService';

interface Post {
  id: string;
  title: string;
  category: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorPhotoURL?: string;
  likes: number;
  replies: number;
  views: number;
  createdAt?: any;
}

interface Reply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorPhotoURL?: string;
  createdAt?: any;
}

export default function ForumViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState({ id: '', name: '', role: '', photoURL: '' });

  useEffect(() => {
    const load = async () => {
      const p = await getCurrentUserProfile();
      if (p) setCurrentUser({ id: (p as any).id || '', name: (p as any).displayName || '', role: (p as any).role || '', photoURL: (p as any).photoURL || '' });
    };
    load();
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      try {
        const doc = await firestore().collection(Collections.COMMUNITY_FORUM).doc(id).get();
        if (doc.exists) {
          const postData = { id: doc.id, ...doc.data() } as Post;
          // Fetch author photo from users collection if missing
          if (!postData.authorPhotoURL && postData.authorId) {
            try {
              const userDoc = await firestore().collection(Collections.USERS).doc(postData.authorId).get();
              if (userDoc.exists) postData.authorPhotoURL = userDoc.data()?.photoURL || '';
            } catch (e) {}
          }
          setPost(postData);
          // Increment views
          await firestore().collection(Collections.COMMUNITY_FORUM).doc(id).update({
            views: firestore.FieldValue.increment(1)
          });
        }
        // Load replies
        const snap = await firestore()
          .collection(Collections.COMMUNITY_FORUM)
          .doc(id)
          .collection('replies')
          .orderBy('createdAt', 'asc')
          .get();
        // Fetch author photos for replies
        const repliesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Reply));
        const repliesWithPhotos = await Promise.all(
          repliesData.map(async (reply) => {
            if (!reply.authorPhotoURL && reply.authorId) {
              try {
                const userDoc = await firestore().collection(Collections.USERS).doc(reply.authorId).get();
                if (userDoc.exists) reply.authorPhotoURL = userDoc.data()?.photoURL || '';
              } catch (e) {}
            }
            return reply;
          })
        );
        setReplies(repliesWithPhotos);
      } catch (e) {
        console.warn('Error fetching post:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const handleSendReply = async () => {
    if (!replyContent.trim() || !id) return;
    setSending(true);
    try {
      await firestore()
        .collection(Collections.COMMUNITY_FORUM)
        .doc(id)
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
      await firestore().collection(Collections.COMMUNITY_FORUM).doc(id).update({
        replies: firestore.FieldValue.increment(1)
      });
      // Refresh replies
      const snap = await firestore()
        .collection(Collections.COMMUNITY_FORUM)
        .doc(id)
        .collection('replies')
        .orderBy('createdAt', 'asc')
        .get();
      setReplies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reply)));
      setReplyContent('');

      // Send FCM push to post author (if not replying to own post)
      if (post && post.authorId && post.authorId !== currentUser.id) {
        try {
          const replyPreview = replyContent.trim().substring(0, 180);
          await sendPushNotification(post.authorId, {
            title: `${currentUser.name} was posted on Forum ${post.title}`,
            body: replyPreview,
            data: { type: 'forum_reply', postId: id || '' }
          });
        } catch (pushErr) { console.warn('Reply push failed:', pushErr); }
      }
    } catch (e: any) {
      modalAlert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteReply = (replyId: string) => {
    modalAlert('Delete Reply', 'Delete this reply?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await firestore().collection(Collections.COMMUNITY_FORUM).doc(id).collection('replies').doc(replyId).delete();
          await firestore().collection(Collections.COMMUNITY_FORUM).doc(id!).update({ replies: firestore.FieldValue.increment(-1) });
          setReplies(prev => prev.filter(r => r.id !== replyId));
        } catch (e: any) { modalAlert('Error', e.message); }
      }},
    ]);
  };

  const handleLike = async () => {
    if (!id) return;
    try {
      await firestore().collection(Collections.COMMUNITY_FORUM).doc(id).update({
        likes: firestore.FieldValue.increment(1)
      });
      if (post) setPost({ ...post, likes: post.likes + 1 });

      // Send FCM push to post author for react (if not own post)
      if (post && post.authorId && post.authorId !== currentUser.id) {
        try {
          await sendPushNotification(post.authorId, {
            title: `${currentUser.name} was react on ${post.authorName}'s post`,
            body: `❤️`,
            data: { type: 'forum_react', postId: id || '' }
          });
        } catch (pushErr) { console.warn('React push failed:', pushErr); }
      }
    } catch (e) {}
  };

  const canDeleteReply = (reply: Reply) => {
    return currentUser.role === 'admin' || reply.authorId === currentUser.id;
  };


  const getRoleColor = (role: string) => role === 'admin' ? '#1565C0' : role === 'technician' ? '#2E7D32' : '#E65100';
  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!post) return (
    <View style={s.center}>
      <Icon name="messages" size={48} color={Colors.textLight} />
      <Text style={s.emptyText}>Post not found</Text>
      <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
        <Text style={s.backLinkText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 25}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Discussion</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Post Card */}
        <View style={s.postCard}>
          {/* Author */}
          <View style={s.authorRow}>
            <Avatar name={post.authorName} imageUrl={post.authorPhotoURL} size={40} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.authorName}>{post.authorName}</Text>
              <View style={[s.roleBadge, { backgroundColor: getRoleColor(post.authorRole) + '15' }]}>
                <Text style={[s.roleText, { color: getRoleColor(post.authorRole) }]}>{post.authorRole}</Text>
              </View>
            </View>
            {post.createdAt && <Text style={s.dateText}>{formatDate(post.createdAt)}</Text>}
          </View>

          {/* Category */}
          <View style={s.catBadge}>
            <Text style={s.catText}>{post.category}</Text>
          </View>

          {/* Title & Content */}
          <Text style={s.postTitle}>{post.title}</Text>
          <Text style={s.postContent}>{post.content}</Text>

          {/* Stats */}
          <View style={s.statsRow}>
            <TouchableOpacity style={s.likeBtn} onPress={handleLike}>
              <Icon name="heart" size={16} color={Colors.error} />
              <Text style={s.statText}>{post.likes} likes</Text>
            </TouchableOpacity>
            <View style={s.statItem}>
              <Icon name="messages" size={14} color={Colors.textLight} />
              <Text style={s.statText}>{replies.length} replies</Text>
            </View>
            <Text style={s.statText}>{post.views || 0} views</Text>
          </View>
        </View>

        {/* Replies Section */}
        <View style={s.repliesSection}>
          <Text style={s.repliesTitle}>Replies ({replies.length})</Text>

          {replies.length === 0 ? (
            <View style={s.noReplies}>
              <Icon name="messages" size={32} color={Colors.textLight} />
              <Text style={s.noRepliesText}>No replies yet. Be the first to respond!</Text>
            </View>
          ) : (
            replies.map((r) => (
              <View key={r.id} style={s.replyCard}>
                <View style={s.replyHeader}>
                  <Avatar name={r.authorName} imageUrl={r.authorPhotoURL} size={32} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.replyAuthor}>{r.authorName}</Text>
                    <Text style={[s.replyRole, { color: getRoleColor(r.authorRole) }]}>{r.authorRole}</Text>
                  </View>
                  {r.createdAt && <Text style={s.replyDate}>{formatDate(r.createdAt)}</Text>}
                  {canDeleteReply(r) && (
                    <TouchableOpacity onPress={() => handleDeleteReply(r.id)} style={s.replyDeleteBtn}>
                      <Icon name="trash" size={14} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={s.replyContent}>{r.content}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Reply Input — Fixed at Bottom */}
      <View style={s.replyInputContainer}>
        <TextInput
          style={s.replyInput}
          placeholder="Write a reply..."
          placeholderTextColor={Colors.textLight}
          value={replyContent}
          onChangeText={setReplyContent}
          multiline
        />
        <TouchableOpacity
          style={[s.sendBtn, !replyContent.trim() && { opacity: 0.4 }]}
          onPress={handleSendReply}
          disabled={!replyContent.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Icon name="send" size={18} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  backLink: { marginTop: Spacing.lg },
  backLinkText: { color: Colors.primary, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white, flex: 1, textAlign: 'center' },
  scrollContent: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  // Post Card
  postCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, ...Shadow.light },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  authorName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginTop: 2 },
  roleText: { fontSize: 10, fontWeight: '700' },
  dateText: { fontSize: 10, color: Colors.textLight },
  catBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary + '15', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: Spacing.sm },
  catText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  postTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, lineHeight: 28 },
  postContent: { fontSize: FontSize.md, color: Colors.text, lineHeight: 24, marginTop: Spacing.md },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: Colors.textSecondary },
  // Replies
  repliesSection: { marginTop: Spacing.xl },
  repliesTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  noReplies: { alignItems: 'center', paddingVertical: Spacing.xxl },
  noRepliesText: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: Spacing.sm, textAlign: 'center' },
  replyCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadow.light },
  replyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  replyAuthor: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  replyRole: { fontSize: 9, fontWeight: '700' },
  replyDate: { fontSize: 9, color: Colors.textLight, marginRight: 8 },
  replyDeleteBtn: { padding: 4 },
  replyContent: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20, marginLeft: 42 },
  // Reply Input
  replyInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  replyInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSize.sm, borderWidth: 1, borderColor: Colors.border, maxHeight: 80, color: Colors.text },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { Collections } from '@/services/firebase';
import { getSession } from '@/services/sessionService';

export type ContentViewType = 'announcements' | 'knowledgeBase' | 'forum';

const viewedKey = (userId: string, type: ContentViewType, contentId: string) => `@agricare_viewed:${userId}:${type}:${contentId}`;

export const markContentViewed = async (userId: string, type: ContentViewType, contentId: string) => {
  if (!userId || !contentId) return;
  try {
    await AsyncStorage.setItem(viewedKey(userId, type, contentId), '1');
  } catch (error) {
    console.warn('Content view state save failed:', error);
  }
};

export const markCurrentContentViewed = async (type: ContentViewType, contentId: string) => {
  const session = await getSession();
  if (session) await markContentViewed(session.uid, type, contentId);
};

export const getUnviewedContentCounts = async (userId: string, role: 'farmer' | 'technician') => {
  const [announcements, articles, posts] = await Promise.all([
    firestore().collection(Collections.ANNOUNCEMENTS).get(),
    firestore().collection(Collections.KNOWLEDGE_BASE).get(),
    firestore().collection(Collections.COMMUNITY_FORUM).get(),
  ]);
  const [viewedAnnouncements, viewedArticles, viewedPosts] = await Promise.all([
    AsyncStorage.multiGet(announcements.docs.map(doc => viewedKey(userId, 'announcements', doc.id))),
    AsyncStorage.multiGet(articles.docs.map(doc => viewedKey(userId, 'knowledgeBase', doc.id))),
    AsyncStorage.multiGet(posts.docs.map(doc => viewedKey(userId, 'forum', doc.id))),
  ]);
  const unseenCount = (type: ContentViewType, docs: typeof announcements.docs, viewed: readonly (readonly [string, string | null])[]) => {
    const viewedKeys = new Set(viewed.filter(([, value]) => value !== null).map(([key]) => key));
    return docs.filter(doc => !viewedKeys.has(viewedKey(userId, type, doc.id))).length;
  };
  const audience = role === 'farmer' ? 'farmers' : 'technicians';
  const visibleAnnouncements = announcements.docs.filter(doc => {
    const item = doc.data();
    return item.audience === 'all' || item.audience === audience;
  });
  return {
    announcements: unseenCount('announcements', visibleAnnouncements, viewedAnnouncements),
    knowledgeBase: unseenCount('knowledgeBase', articles.docs, viewedArticles),
    forum: unseenCount('forum', posts.docs, viewedPosts),
  };
};

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import { getUserChatRooms, ChatRoom } from '@/services/chatService';
import { Collections } from '@/services/firebase';

type MessageTab = 'chats' | 'notifications';

interface UserInfo {
  id: string;
  displayName: string;
  photoURL?: string;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  type: string;
  createdAt: any;
}

export default function TechMessagesScreen() {
  const [activeTab, setActiveTab] = useState<MessageTab>('chats');
  const [chatRooms, setChatRooms] = useState<(ChatRoom & { otherName: string; otherPhoto?: string })[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');
  const headerAnim = useFadeIn(100);
  const contentAnim = useFadeInUp(200);

  useEffect(() => {
    let unsubChats: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;

    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);

      // Listen to chat rooms from Realtime Database
      unsubChats = getUserChatRooms(session.uid, async (rooms) => {
        // For each room, find the other participant's name
        const enrichedRooms = await Promise.all(
          rooms.map(async (room) => {
            const otherUserId = room.participants.find(p => p !== session.uid) || '';
            let otherName = 'Farmer';
            let otherPhoto = '';

            if (otherUserId) {
              try {
                const userDoc = await firestore().collection(Collections.USERS).doc(otherUserId).get();
                if (userDoc.exists) {
                  const data = userDoc.data();
                  otherName = data?.displayName || 'Farmer';
                  otherPhoto = data?.photoURL || '';
                }
              } catch (e) {
                // If user lookup fails, use ID-based name
                otherName = 'Farmer';
              }
            }

            return { ...room, otherName, otherPhoto };
          })
        );
        setChatRooms(enrichedRooms);
        setLoading(false);
      });

      // Listen to notifications from Firestore
      unsubNotifs = firestore()
        .collection(Collections.NOTIFICATIONS)
        .where('userId', '==', session.uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot(
          (snap) => {
            setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
          },
          (err) => {
            console.warn('Notifications listener error:', err);
          }
        );
    };
    load();

    return () => {
      if (unsubChats) unsubChats();
      if (unsubNotifs) unsubNotifs();
    };
  }, []);

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const markNotifRead = async (notifId: string) => {
    try {
      await firestore().collection(Collections.NOTIFICATIONS).doc(notifId).update({ read: true });
    } catch (e) {}
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const ms = typeof timestamp === 'number' ? timestamp : (timestamp?.toDate ? timestamp.toDate().getTime() : 0);
    if (!ms) return '';
    const date = new Date(ms);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return date.toLocaleDateString('en-PH', { weekday: 'short' });
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'appointment_accepted': return { icon: 'check-circle', color: '#10B981', bg: '#D1FAE5' };
      case 'appointment_declined': return { icon: 'close', color: '#EF4444', bg: '#FEE2E2' };
      case 'new_request': return { icon: 'clipboard', color: '#F59E0B', bg: '#FEF3C7' };
      case 'message': return { icon: 'messages', color: '#2196F3', bg: '#E3F2FD' };
      default: return { icon: 'bell', color: Colors.primary, bg: '#E8F5E9' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, headerAnim]}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chats' && styles.tabActive]}
            onPress={() => setActiveTab('chats')}
          >
            <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>Chats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'notifications' && styles.tabActive]}
            onPress={() => setActiveTab('notifications')}
          >
            <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
              Notifications{unreadNotifCount > 0 ? ` (${unreadNotifCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, contentAnim]}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : activeTab === 'chats' ? (
          /* CHATS TAB */
          chatRooms.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="messages" size={56} color={Colors.textLight} />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>When you accept a request, a chat{'\n'}will be created automatically</Text>
            </View>
          ) : (
            <FlatList
              data={chatRooms}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const unread = item.unreadCount?.[uid] || 0;
                return (
                  <TouchableOpacity style={styles.chatItem} activeOpacity={0.7} onPress={() => {
                    const otherUid = item.participants.find(p => p !== uid) || '';
                    router.push({ pathname: '/(technician)/messages/chat', params: { chatId: item.id, otherUserId: otherUid, otherUserName: item.otherName, otherPhoto: item.otherPhoto || '' } });
                  }}>
                    <Avatar name={item.otherName} imageUrl={item.otherPhoto} size={50} />
                    <View style={styles.chatContent}>
                      <View style={styles.chatHeader}>
                        <Text style={[styles.chatName, unread > 0 && styles.chatNameBold]}>{item.otherName}</Text>
                        <Text style={styles.chatTime}>{formatTime(item.lastMessageTime)}</Text>
                      </View>
                      <Text style={[styles.chatMessage, unread > 0 && styles.chatMessageBold]} numberOfLines={1}>
                        {item.lastSenderId === uid ? 'You: ' : ''}{item.lastMessage || 'Start a conversation'}
                      </Text>
                    </View>
                    {unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          /* NOTIFICATIONS TAB */
          notifications.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="bell" size={56} color={Colors.textLight} />
              <Text style={styles.emptyText}>No notifications</Text>
              <Text style={styles.emptySubtext}>You're all caught up!</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const notifStyle = getNotifIcon(item.type);
                return (
                  <TouchableOpacity
                    style={[styles.notifItem, !item.read && styles.notifUnread]}
                    activeOpacity={0.7}
                    onPress={() => { if (!item.read) markNotifRead(item.id); }}
                  >
                    <View style={[styles.notifIcon, { backgroundColor: notifStyle.bg }]}>  
                      <Icon name={notifStyle.icon as any} size={20} color={notifStyle.color} />
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifTitle, !item.read && styles.notifTitleBold]}>{item.title}</Text>
                      <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                      <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
                    </View>
                    {!item.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          )
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white, marginBottom: Spacing.md },
  tabs: { flexDirection: 'row', gap: Spacing.xl },
  tab: { paddingBottom: Spacing.sm },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.white },
  tabText: { fontSize: FontSize.lg, color: Colors.accent },
  tabTextActive: { color: Colors.white, fontWeight: '700' },
  content: { flex: 1 },
  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyText: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.lg },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4, textAlign: 'center', lineHeight: 20 },
  // Chat Items
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  chatContent: { flex: 1, marginLeft: Spacing.md },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text },
  chatNameBold: { fontWeight: '700' },
  chatTime: { fontSize: FontSize.xs, color: Colors.textLight },
  chatMessage: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 3 },
  chatMessageBold: { color: Colors.text, fontWeight: '600' },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  // Notifications
  notifItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  notifUnread: { backgroundColor: '#F0FFF4' },
  notifIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  notifContent: { flex: 1, marginLeft: Spacing.md },
  notifTitle: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text },
  notifTitleBold: { fontWeight: '700' },
  notifBody: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
});

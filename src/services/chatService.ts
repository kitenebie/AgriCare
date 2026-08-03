/**
 * Chat Service — Realtime Database (Modular API)
 */

import {
  ref,
  set,
  push,
  onValue,
  update,
  remove,
  query as rtdbQuery,
  orderByChild,
  equalTo,
  limitToLast,
  onDisconnect,
  serverTimestamp,
  get,
} from '@react-native-firebase/database';
import { rtdb, RealtimeDB } from './firebase';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  timestamp: number;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: number;
  lastSenderId: string;
  unreadCount: Record<string, number>;
}

// ─── CHAT ROOMS ───

export const getOrCreateChatRoom = async (userId1: string, userId2: string): Promise<string> => {
  const chatId = [userId1, userId2].sort().join('_');
  const chatRef = ref(rtdb, `${RealtimeDB.CHATS}/${chatId}`);
  const snapshot = await get(chatRef);

  if (!snapshot.exists()) {
    await set(chatRef, {
      participants: [userId1, userId2],
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      lastSenderId: '',
      unreadCount: { [userId1]: 0, [userId2]: 0 },
      createdAt: serverTimestamp(),
    });
  }

  return chatId;
};

export const getUserChatRooms = (userId: string, callback: (rooms: ChatRoom[]) => void) => {
  const chatsRef = ref(rtdb, RealtimeDB.CHATS);

  const unsubscribe = onValue(chatsRef, (snapshot) => {
    const rooms: ChatRoom[] = [];
    snapshot.forEach((child) => {
      const data = child.val();
      if (data.participants && data.participants.includes(userId)) {
        rooms.push({ id: child.key!, ...data });
      }
      return undefined;
    });
    rooms.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
    callback(rooms);
  });

  return unsubscribe;
};

// ─── MESSAGES ───

export const sendMessage = async (chatId: string, senderId: string, text: string, imageUrl?: string) => {
  const messagesRef = ref(rtdb, `${RealtimeDB.MESSAGES}/${chatId}`);
  const newMsgRef = push(messagesRef);

  await set(newMsgRef, {
    senderId,
    text,
    imageUrl: imageUrl || null,
    timestamp: serverTimestamp(),
    read: false,
  });

  const chatRef = ref(rtdb, `${RealtimeDB.CHATS}/${chatId}`);
  await update(chatRef, {
    lastMessage: text || 'Image',
    lastMessageTime: serverTimestamp(),
    lastSenderId: senderId,
  });

  return newMsgRef.key;
};

export const listenToMessages = (chatId: string, callback: (messages: ChatMessage[]) => void) => {
  const messagesRef = rtdbQuery(
    ref(rtdb, `${RealtimeDB.MESSAGES}/${chatId}`),
    orderByChild('timestamp'),
    limitToLast(50)
  );

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((child) => {
      messages.push({ id: child.key!, ...child.val() });
      return undefined;
    });
    callback(messages);
  });

  return unsubscribe;
};

export const markMessagesAsRead = async (chatId: string, userId: string) => {
  const messagesRef = ref(rtdb, `${RealtimeDB.MESSAGES}/${chatId}`);
  const messagesQuery = rtdbQuery(messagesRef, orderByChild('read'), equalTo(false));
  const snapshot = await get(messagesQuery);

  const updates: Record<string, any> = {};
  snapshot.forEach((child) => {
    if (child.val().senderId !== userId) {
      updates[`${child.key}/read`] = true;
    }
    return undefined;
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(rtdb, `${RealtimeDB.MESSAGES}/${chatId}`), updates);
  }

  await set(ref(rtdb, `${RealtimeDB.CHATS}/${chatId}/unreadCount/${userId}`), 0);
};

// ─── TYPING INDICATOR ───

export const setTyping = (chatId: string, userId: string, isTyping: boolean) => {
  set(ref(rtdb, `${RealtimeDB.TYPING}/${chatId}/${userId}`), isTyping);
};

export const listenToTyping = (chatId: string, otherUserId: string, callback: (isTyping: boolean) => void) => {
  const typingRef = ref(rtdb, `${RealtimeDB.TYPING}/${chatId}/${otherUserId}`);
  return onValue(typingRef, (snapshot) => {
    callback(snapshot.val() === true);
  });
};

// ─── ONLINE STATUS ───

export const setOnlineStatus = (userId: string, isOnline: boolean) => {
  const statusRef = ref(rtdb, `${RealtimeDB.ONLINE_STATUS}/${userId}`);
  set(statusRef, { online: isOnline, lastSeen: serverTimestamp() });

  if (isOnline) {
    onDisconnect(statusRef).set({ online: false, lastSeen: serverTimestamp() });
  }
};

export const listenToOnlineStatus = (userId: string, callback: (isOnline: boolean) => void) => {
  const statusRef = ref(rtdb, `${RealtimeDB.ONLINE_STATUS}/${userId}/online`);
  return onValue(statusRef, (snapshot) => {
    callback(snapshot.val() === true);
  });
};

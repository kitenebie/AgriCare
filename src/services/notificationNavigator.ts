/**
 * Notification Navigator — Deep-link routing when user taps a push notification
 *
 * Maps FCM notification data.type → appropriate screen route based on user role.
 *
 * Notification types handled:
 * - new_chat_message     → 1-on-1 chat conversation
 * - appointment_accepted → appointments screen
 * - appointment_declined → appointments screen
 * - forum_react          → forum post view
 * - forum_reply          → forum post view
 * - announcement         → announcements screen
 * - knowledge_base       → knowledge base screen
 * - health_record        → health records screen
 * - rate_request         → chat (rating happens inside chat)
 * - rating_received      → chat
 * - account_approved     → login (re-auth)
 * - account_rejected     → login
 * - account_action       → login
 */

import { router } from 'expo-router';
import { getSession } from './sessionService';import firestore from '@react-native-firebase/firestore';import { Collections } from './firebase';import { isDirectRequestForTechnician, isGlobalRequestForTechnician } from '../../functions/shared/technicianServiceMatching';import type { ServiceRequest } from '@/utils/technicianRequests';

type NotificationData = Record<string, string | undefined>;

/**
 * Get the role-based route prefix for the current user
 */
const getPrefix = (role: string): string => {
  switch (role) {
    case 'admin': return '/(admin)';
    case 'technician': return '/(technician)';
    default: return '/(farmer)';
  }
};

/**
 * Navigate to the correct screen based on notification type and data.
 * Called when user taps a notification from the status bar (background/quit state).
 */
export const handleNotificationNavigation = async (data: NotificationData): Promise<void> => {


  const session = await getSession();
  if (!session) {
    // Not logged in — go to login, app will handle redirect after auth
    router.replace('/(auth)/login' as any);
    return;
  }

  const { role } = session;
  const prefix = getPrefix(role);
  if (!data?.type) {
    if (role === 'admin') router.push('/(admin)/home' as any);    else if (role === 'technician') router.push('/(technician)/messages?tab=notifications' as any);    else router.push('/(farmer)/messages?tab=notifications' as any);    return;
  }

      switch (data.type) {
    // ─── Chat message → open the 1-on-1 conversation ───

    case 'new_chat_message': {
      const chatId = data.chatId || '';
      const otherUserId = data.senderId || '';
      const otherUserName = data.senderName || '';

      if (role === 'technician') {
        router.push({
          pathname: '/(technician)/messages/chat',
          params: { chatId, otherUserId, otherUserName, otherPhoto: '' },
        } as any);
      } else {
        router.push({
          pathname: '/(farmer)/messages/chat',
          params: { chatId, otherUserId, otherUserName, otherPhoto: '' },
        } as any);
      }
      break;
    }

    // ─── Appointment notifications → appointments screen ───
    case 'appointment_accepted':
    case 'appointment_declined':
    case 'appointment_confirmed':
    case 'new_appointment':
    case 'new_request': {
      if (role === 'technician') {
        router.push('/(technician)/appointments' as any);
      } else {
        router.push(`${prefix}/home/appointments` as any);
      }
      break;
    }

    // ─── Forum react/reply → forum post view ───
    case 'forum_react':
    case 'forum_reply':
    case 'forum_post': {
      const postId = data.postId || '';
      if (postId) {
        if (role === 'admin') {
          router.push({ pathname: '/(admin)/home/forum-view', params: { id: postId } } as any);
        } else if (role === 'technician') {
          router.push({ pathname: '/(technician)/dashboard/forum-view', params: { id: postId } } as any);
        } else {
          router.push({ pathname: '/(farmer)/home/forum-view', params: { id: postId } } as any);
        }
      } else {
        // No postId — go to forum list
        if (role === 'admin') {
          router.push('/(admin)/forum' as any);
        } else if (role === 'technician') {
          router.push('/(technician)/dashboard/forum' as any);
        } else {
          router.push('/(farmer)/home/forum' as any);
        }
      }
      break;
    }

    // ─── Announcement → announcements screen ───
    case 'announcement': {
      if (role === 'technician') {
        router.push({ pathname: '/(technician)/dashboard/announcements' as any, params: data.announcementId ? { announcementId: data.announcementId } : {} } as any);
      } else {
        router.push({ pathname: `${prefix}/home/announcements` as any, params: data.announcementId ? { announcementId: data.announcementId } : {} } as any);
      }
      break;
    }    case 'service_request': {      if (role !== 'technician') break;      const dashboard = '/(technician)/dashboard' as any;      try {        const appointmentId = data.appointmentId;        if (!appointmentId) { router.push(dashboard); break; }        const [requestSnapshot, technicianSnapshot] = await Promise.all([          firestore().collection(Collections.APPOINTMENTS).doc(appointmentId).get(),          firestore().collection(Collections.USERS).doc(session.uid).get(),        ]);        const request = { id: requestSnapshot.id, ...requestSnapshot.data() } as ServiceRequest;        const technician = technicianSnapshot.data();        if (requestSnapshot.exists && isDirectRequestForTechnician(request, session.uid)) {          router.push('/(technician)/appointments' as any);        } else if (requestSnapshot.exists && isGlobalRequestForTechnician(request, session.uid, technician)) {          router.push(dashboard);        } else if (requestSnapshot.exists && request.technicianId === session.uid && ['confirmed', 'upcoming'].includes(request.status)) {          router.push('/(technician)/schedule' as any);        } else {          router.push(dashboard);        }      } catch (error) {        console.warn('Service request notification is no longer available:', error);        router.push(dashboard);      }      break;    }

    // ─── Knowledge base → knowledge base screen ───
    case 'knowledge_base': {
      const screen = role === 'technician' ? '/(technician)/dashboard' : `${prefix}/home`;
      router.push(data.articleId
        ? { pathname: `${screen}/knowledge-base-view` as any, params: { id: data.articleId } }
        : `${screen}/knowledge-base` as any);
      break;
    }

    // ─── Health record → health records screen ───
    case 'health_record':
    case 'health_record_created':
    case 'vaccination_reminder': {
      if (role === 'technician') {
        router.push({ pathname: '/(technician)/dashboard/health-records' as any, params: data.healthRecordId ? { healthRecordId: data.healthRecordId } : {} } as any);
      } else {
        router.push({ pathname: `${prefix}/home/health-records` as any, params: data.healthRecordId ? { healthRecordId: data.healthRecordId } : {} } as any);
      }
      break;
    }

    // ─── Rate request / Rating received → go to the chat ───
    case 'rate_request':
    case 'rating_received': {
      const chatId = data.chatId || '';
      const otherUserId = data.technicianId || data.farmerId || '';

      if (chatId) {
        if (role === 'technician') {
          router.push({
            pathname: '/(technician)/messages/chat',
            params: { chatId, otherUserId, otherUserName: '', otherPhoto: '' },
          } as any);
        } else {
          router.push({
            pathname: '/(farmer)/messages/chat',
            params: { chatId, otherUserId, otherUserName: '', otherPhoto: '' },
          } as any);
        }
      } else {
        // Fallback to messages list
        if (role === 'technician') {
          router.push('/(technician)/messages' as any);
        } else {
          router.push('/(farmer)/messages' as any);
        }
      }
      break;
    }


    // ─── Account actions → re-login ───
    case 'message': {
      if (role === 'technician') router.push('/(technician)/messages' as any);
      else if (role === 'farmer') router.push('/(farmer)/messages' as any);
      else router.push('/(admin)/home' as any);
      break;
    }
    case 'emergency': {
      if (role === 'technician') router.push('/(technician)/map' as any);
      else if (role === 'farmer') router.push('/(farmer)/map' as any);
      else router.push('/(admin)/home' as any);
      break;
    }
    case 'verification_request': {
      router.push(role === 'admin' ? '/(admin)/home/users' as any : `${prefix}/home` as any);
      break;
    }
    case 'livestock_category': {
      if (role === 'admin') router.push('/(admin)/home/livestock-categories' as any);
      else if (role === 'farmer') router.push('/(farmer)/home/my-animals' as any);
      else router.push('/(technician)/dashboard' as any);
      break;
    }
    case 'account_rejected':
    case 'account_action': {
      router.replace('/(auth)/login' as any);
      break;
    }
    case 'account_approved': {
      if (role === 'admin') router.replace('/(admin)/home' as any);
      else if (role === 'technician') router.replace('/(technician)/dashboard' as any);
      else router.replace('/(farmer)/home' as any);
      break;
    }

    // ─── Default fallback → home screen for role ───
    default: {
      if (role === 'admin') {
        router.replace('/(admin)/home' as any);
      } else if (role === 'technician') {
        router.push('/(technician)/messages?tab=notifications' as any);
      } else {
        router.push('/(farmer)/messages?tab=notifications' as any);
      }
      break;
    }
  }
};

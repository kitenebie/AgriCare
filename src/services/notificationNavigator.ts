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
import { getSession } from './sessionService';

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
        router.push('/(technician)/dashboard/announcements' as any);
      } else {
        router.push(`${prefix}/home/announcements` as any);
      }
      break;
    }

    // ─── Knowledge base → knowledge base screen ───
    case 'knowledge_base': {
      if (role === 'technician') {
        router.push('/(technician)/dashboard/knowledge-base' as any);
      } else {
        router.push(`${prefix}/home/knowledge-base` as any);
      }
      break;
    }

    // ─── Health record → health records screen ───
    case 'health_record':
    case 'health_record_created':
    case 'vaccination_reminder': {
      if (role === 'technician') {
        router.push('/(technician)/dashboard/health-records' as any);
      } else {
        router.push(`${prefix}/home/health-records` as any);
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
    case 'account_approved':
    case 'account_rejected':
    case 'account_action': {
      router.replace('/(auth)/login' as any);
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

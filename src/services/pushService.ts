/**
 * Push Notification Sender — triggers FCM notifications
 * 
 * FCM tokens stay server-side; the authenticated Cloud Function validates and sends.
 */

import { callBackend } from './backendApi';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sound?: string;
}

/**
 * Send a push through the authenticated Cloud Function without exposing FCM tokens.
 */
export const sendPushNotification = async (
  targetUserId: string,
  payload: PushPayload
): Promise<string> => {
  try {
    const result = await callBackend<{ sent: boolean }>('sendPushNotification', { targetUserId, payload });
    return result.sent ? 'sent' : '';
  } catch (error: any) {
    console.error('Push notification queue error:', error.message);
    return '';
  }
};

/**
 * Send push notification to multiple users
 */
export const sendPushNotificationToMany = async (
  targetUserIds: string[],
  payload: PushPayload
): Promise<void> => {
  const promises = targetUserIds.map(uid => sendPushNotification(uid, payload));
  await Promise.all(promises);
};

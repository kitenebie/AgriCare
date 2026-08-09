/**
 * Push Notification Sender — triggers FCM notifications
 * 
 * In production, FCM push notifications are sent via Cloud Functions.
 * This service creates a Firestore trigger document that a Cloud Function
 * picks up and sends as an actual FCM push.
 * 
 * Cloud Function pattern:
 * - Listens to `pushQueue/{docId}` writes
 * - Reads target user's FCM tokens from `users/{userId}.fcmTokens`
 * - Sends FCM message via Admin SDK
 * - Marks document as sent
 */

import firestore from '@react-native-firebase/firestore';
import { Collections } from './firebase';
import { supabase } from '../../utils/supabase';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

/**
 * Queue a push notification for a user.
 * A Cloud Function will pick this up and send via FCM Admin SDK.
 */
export const sendPushNotification = async (
  targetUserId: string,
  payload: PushPayload
): Promise<string> => {
  try {
    // Get user's FCM tokens
    const userDoc = await firestore().collection(Collections.USERS).doc(targetUserId).get();
    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken || '';

    if (!fcmToken) {
      console.warn(`No FCM token found for user ${targetUserId}`);
      return '';
    }

    // Call Supabase Edge Function to send FCM
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        fcmTokens: [fcmToken],
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      },
    });

    if (error) {
      console.error('Push notification error:', error.message);
      return '';
    }

    console.log(`Push sent to ${targetUserId}:`, data);
    return 'sent';
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

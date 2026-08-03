/**
 * Push Notification Service — Firebase Cloud Messaging
 * Uses instance methods (compatible with RN Firebase v21)
 */

import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import { Collections } from './firebase';

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  } catch (error: any) {
    console.warn('Notification permission error:', error.message);
    return false;
  }
};

/**
 * Get device FCM token and save to user's Firestore doc
 */
export const registerDeviceToken = async (userId: string): Promise<string | null> => {
  try {
    const token = await messaging().getToken();
    if (token) {
      await firestore().collection(Collections.USERS).doc(userId).update({
        fcmTokens: firestore.FieldValue.arrayUnion(token),
        lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
        platform: Platform.OS,
      });
    }
    return token;
  } catch (error: any) {
    console.warn('FCM token registration failed:', error.message);
    return null;
  }
};

/**
 * Remove device token on logout
 */
export const unregisterDeviceToken = async (userId: string): Promise<void> => {
  try {
    const token = await messaging().getToken();
    await firestore().collection(Collections.USERS).doc(userId).update({
      fcmTokens: firestore.FieldValue.arrayRemove(token),
    });
    await messaging().deleteToken();
  } catch (error: any) {
    console.warn('FCM token unregister failed:', error.message);
  }
};

/**
 * Listen for token refresh
 */
export const onTokenRefresh = (userId: string) => {
  return messaging().onTokenRefresh(async (newToken) => {
    try {
      await firestore().collection(Collections.USERS).doc(userId).update({
        fcmTokens: firestore.FieldValue.arrayUnion(newToken),
      });
    } catch (e) {}
  });
};

/**
 * Handle foreground notifications
 */
export const onForegroundNotification = (callback: (notification: any) => void) => {
  return messaging().onMessage(async (remoteMessage) => {
    callback(remoteMessage);
  });
};

/**
 * Handle background/quit notification tap
 */
export const setupNotificationHandlers = (callback: (notification: any) => void) => {
  messaging().onNotificationOpenedApp((remoteMessage) => {
    callback(remoteMessage);
  });

  messaging().getInitialNotification().then((remoteMessage) => {
    if (remoteMessage) {
      callback(remoteMessage);
    }
  });
};

/**
 * Subscribe to a topic
 */
export const subscribeToNotificationTopic = async (topic: string): Promise<void> => {
  await messaging().subscribeToTopic(topic);
};

/**
 * Unsubscribe from a topic
 */
export const unsubscribeFromNotificationTopic = async (topic: string): Promise<void> => {
  await messaging().unsubscribeFromTopic(topic);
};

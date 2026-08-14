/**
 * Permission Service — Request all required permissions on first app launch
 * Ensures Notifications are granted for core features.
 * Called on app start for all roles (admin, farmer, technician).
 * 
 * Calendar permission is NOT requested here — it's handled silently
 * in calendarService.ts only when needed (on appointment accept).
 */

import { Platform, Linking } from 'react-native';
import messaging from '@react-native-firebase/messaging';

export interface PermissionStatus {
  calendar: boolean;
  notifications: boolean;
}

/**
 * Request critical permissions on app launch.
 * Only notifications — calendar is optional and handled lazily.
 */
export const requestAllPermissions = async (): Promise<PermissionStatus> => {
  const results: PermissionStatus = {
    calendar: true, // Not checked here — handled by calendarService when needed
    notifications: false,
  };

  // Notification Permission (FCM) — required for push notifications
  try {
    const authStatus = await messaging().requestPermission();
    results.notifications =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  } catch (e: any) {
    console.warn('Notification permission request failed:', e.message);
  }

  return results;
};

/**
 * Check if all permissions are already granted (no popup)
 */
export const checkPermissions = async (): Promise<PermissionStatus> => {
  const results: PermissionStatus = {
    calendar: true,
    notifications: false,
  };

  try {
    const authStatus = await messaging().hasPermission();
    results.notifications =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  } catch (e) {}

  return results;
};

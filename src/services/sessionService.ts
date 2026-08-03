/**
 * Session Service — Persist user credentials via AsyncStorage
 * 
 * Saves user session after login/register so the app auto-routes
 * on next open without requiring login again.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_SESSION: '@agricare_session',
};

export interface UserSession {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'farmer' | 'technician';
}

/**
 * Save session after login/register
 */
export const saveSession = async (session: UserSession): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.USER_SESSION, JSON.stringify(session));
    console.log('Session saved:', session.email, session.role);
  } catch (error) {
    console.warn('Failed to save session:', error);
  }
};

/**
 * Get saved session (returns null if not logged in)
 */
export const getSession = async (): Promise<UserSession | null> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.USER_SESSION);
    if (data) {
      return JSON.parse(data) as UserSession;
    }
    return null;
  } catch (error) {
    console.warn('Failed to get session:', error);
    return null;
  }
};

/**
 * Clear session on logout
 */
export const clearSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEYS.USER_SESSION);
    console.log('Session cleared');
  } catch (error) {
    console.warn('Failed to clear session:', error);
  }
};

/**
 * Get the route path for a given role
 */
export const getRouteForRole = (role: string): string => {
  switch (role) {
    case 'admin': return '/(admin)/home';
    case 'technician': return '/(technician)/dashboard';
    default: return '/(farmer)/home';
  }
};

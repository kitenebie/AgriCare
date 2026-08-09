/**
 * Session Service — Persist user credentials via AsyncStorage
 * 
 * Saves user session after login/register so the app auto-routes
 * on next open without requiring login again.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const KEYS = {
  USER_SESSION: '@agricare_session',
  BIOMETRICS_ENABLED: '@agricare_biometrics_enabled',
  BIOMETRICS_ASKED: '@agricare_biometrics_asked',
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

// ─── Biometrics ───

/**
 * Check if biometrics is enabled by user
 */
export const isBiometricsEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.BIOMETRICS_ENABLED);
    return value === 'true';
  } catch {
    return false;
  }
};

/**
 * Set biometrics enabled/disabled
 */
export const setBiometricsEnabled = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(KEYS.BIOMETRICS_ENABLED, enabled ? 'true' : 'false');
};

/**
 * Check if user has been asked about biometrics already
 */
export const hasBiometricsBeenAsked = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.BIOMETRICS_ASKED);
    return value === 'true';
  } catch {
    return false;
  }
};

/**
 * Mark that biometrics setup has been shown
 */
export const markBiometricsAsked = async (): Promise<void> => {
  await AsyncStorage.setItem(KEYS.BIOMETRICS_ASKED, 'true');
};

/**
 * Authenticate with biometrics — returns true if success
 */
export const authenticateWithBiometrics = async (promptMessage?: string): Promise<boolean> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || 'Verify your identity',
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
    });

    return result.success;
  } catch {
    return false;
  }
};

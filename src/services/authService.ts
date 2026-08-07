/**
 * Authentication Service — Firebase Auth
 * Uses instance methods (compatible with RN Firebase v21)
 */

import firestore from '@react-native-firebase/firestore';
import { authInstance, Collections } from './firebase';
import { requestNotificationPermission, registerDeviceToken, unregisterDeviceToken } from './notificationService';
import { saveSession, clearSession } from './sessionService';
import { logAuth, logError } from './logService';

export type AuthUser = any;

/**
 * Register FCM token after authentication
 */
const registerFCM = async (uid: string) => {
  try {
    const permissionGranted = await requestNotificationPermission();
    if (permissionGranted) {
      await registerDeviceToken(uid);
    }
  } catch (error: any) {
    console.warn('FCM registration skipped:', error.message);
  }
};

/**
 * Find user document by email
 */
const findUserByEmail = async (email: string) => {
  const snapshot = await firestore()
    .collection(Collections.USERS)
    .where('email', '==', email)
    .limit(1)
    .get();
  if (!snapshot.empty) {
    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
};

/**
 * Sign up with email
 */
export const signUp = async (
  email: string,
  pass: string,
  displayName: string,
  role: 'farmer' | 'technician',
  extraData?: {
    expertise?: string[];
    proofImageUrl?: string;
    idImageUrl?: string;
    phoneNumber?: string;
    location?: string;
  }
) => {
  console.log('signUp called:', email);
  const credential = await authInstance.createUserWithEmailAndPassword(email, pass);
  const user = credential.user;
  await user.updateProfile({ displayName });

  const specializationStr = extraData?.expertise && extraData.expertise.length > 0
    ? extraData.expertise.join(', ')
    : '';

  // Create user document using Auth UID as doc ID
  await firestore().collection(Collections.USERS).doc(user.uid).set({
    email,
    displayName,
    role,
    phoneNumber: extraData?.phoneNumber || '',
    location: extraData?.location || '',
    photoURL: '',
    proofImageUrl: extraData?.proofImageUrl || '',
    idImageUrl: extraData?.idImageUrl || '',
    expertise: extraData?.expertise || [],
    specialization: specializationStr,
    status: 'pending',
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  await registerFCM(user.uid);

  // Log activity
  await logAuth('User Registration', `New ${role} registered: ${displayName} (${email})`, user.uid, displayName);

  // Save session for auto-login
  await saveSession({
    uid: user.uid,
    email,
    displayName,
    role,
  });

  return user;
};

/**
 * Sign in with email
 */
export const signIn = async (email: string, pass: string) => {
  console.log('signIn called:', email);
  const credential = await authInstance.signInWithEmailAndPassword(email, pass);
  const user = credential.user;
  console.log('Auth success, UID:', user.uid);

  // Try to find existing user doc by UID first
  const authDoc = await firestore().collection(Collections.USERS).doc(user.uid).get();

  if (!authDoc.exists) {
    console.log('No doc at UID, searching by email...');
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      console.log('Found doc by email, copying to UID key');
      const { id, ...data } = existingUser;
      await firestore().collection(Collections.USERS).doc(user.uid).set({
        ...data,
        uid: user.uid,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } else {
      console.log('No doc found, creating new');
      await firestore().collection(Collections.USERS).doc(user.uid).set({
        email: user.email,
        displayName: user.displayName || email.split('@')[0],
        role: 'farmer',
        phoneNumber: '',
        location: '',
        photoURL: '',
        status: 'active',
        uid: user.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  await registerFCM(user.uid);

  // Log activity
  await logAuth('User Login', `${user.email} logged in`, user.uid, user.displayName || '');

  // Save session for auto-login on next app open
  const sessDoc = await firestore().collection(Collections.USERS).doc(user.uid).get();
  const userData = sessDoc.exists ? sessDoc.data() : null;
  await saveSession({
    uid: user.uid,
    email: user.email || email,
    displayName: user.displayName || userData?.displayName || '',
    role: userData?.role || 'farmer',
  });

  return user;
};

/**
 * Sign out
 */
export const signOut = async () => {
  const user = authInstance.currentUser;
  if (user) {
    try { await unregisterDeviceToken(user.uid); } catch (e) {}
  }
  await logAuth('User Logout', `${user?.email || 'User'} logged out`, user?.uid, user?.displayName || '');
  await authInstance.signOut();
  await clearSession();
};

/**
 * Send reset email
 */
export const sendResetEmail = async (email: string) => {
  await authInstance.sendPasswordResetEmail(email);
};

/**
 * Get current user
 */
export const getCurrentUser = (): AuthUser | null => {
  return authInstance.currentUser;
};

/**
 * Get user by UID from Firestore
 */
export const getUser = async (uid: string) => {
  const snapshot = await firestore().collection(Collections.USERS).doc(uid).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
};

/**
 * Get current user profile
 */
export const getCurrentUserProfile = async () => {
  const user = authInstance.currentUser;
  if (!user) return null;
  return getUser(user.uid);
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChanged = (callback: (user: AuthUser | null) => void) => {
  return authInstance.onAuthStateChanged(callback);
};

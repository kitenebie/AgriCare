/**
 * Authentication Service — Firebase Auth
 * Uses instance methods (compatible with RN Firebase v21)
 */

import firestore from '@react-native-firebase/firestore';
import { authInstance, Collections } from './firebase';
import { requestNotificationPermission, registerDeviceToken, unregisterDeviceToken } from './notificationService';
import { saveSession, clearSession } from './sessionService';
import { logAuth, logError } from './logService';
import { completeRegistrationEmailVerification } from './emailVerificationService';
import { updateTechnicianQualifications } from './technicianQualificationService';
import { callBackend } from './backendApi';
import { uploadRegistrationDocuments } from './storage';

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
 * Sign up with email
 */
export const signUp = async (
  email: string,
  pass: string,
  displayName: string,
  role: 'farmer' | 'technician',
  verificationTicket: string,
  extraData?: {
    expertise?: string[];
    specializationIds?: string[];
    subSpecializationIds?: string[];
    idImageLocalUri?: string;
    proofImageLocalUri?: string;
    phoneNumber?: string;
    location?: string;
    photoURL?: string;
  }
) => {
  console.log('signUp called:', email);
  console.info('[Registration] signUp ticket metadata', { length: verificationTicket?.length || 0 });
  const credential = await authInstance.createUserWithEmailAndPassword(email, pass);
  const user = credential.user;
  try {
    await completeRegistrationEmailVerification(email, await user.getIdToken(), verificationTicket);
    await user.reload();
  } catch (error) {
    try { await user.delete(); } catch (cleanupError) { console.warn('Failed to remove unverified account:', cleanupError); }
    throw error;
  }
  await user.updateProfile({ displayName });

  const specializationStr = extraData?.expertise && extraData.expertise.length > 0
    ? extraData.expertise.join(', ')
    : '';

  // Create user document using Auth UID as doc ID
  const userRef = firestore().collection(Collections.USERS).doc(user.uid);
  try {
    await userRef.set({
      uid: user.uid,
      email,
      displayName,
      role,
      phoneNumber: extraData?.phoneNumber || '',
      location: extraData?.location || '',
      photoURL: extraData?.photoURL || '',
      proofImageUrl: '',
      idImageUrl: '',
      expertise: extraData?.expertise || [],
      specialization: specializationStr,
      specializationIds: [],
      subSpecializationIds: [],
      qualificationKeys: [],
      qualificationVerified: false,
      status: role === 'technician' ? 'pending' : 'active',
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    if (role === 'technician') {
      await updateTechnicianQualifications(
        extraData?.specializationIds || [],
        extraData?.subSpecializationIds || [],
        await user.getIdToken(),
      );
    }
    if (!extraData?.idImageLocalUri) throw new Error('Your registration ID is required.');
    if (role === 'technician' && !extraData.proofImageLocalUri) throw new Error('Your qualification proof is required.');
    const documents = await uploadRegistrationDocuments(extraData.idImageLocalUri, extraData.proofImageLocalUri);
    if (!documents.identityPath || (role === 'technician' && !documents.proofPath)) throw new Error(documents.error || 'Could not securely upload your registration documents.');
  } catch (error) {
    await userRef.delete().catch(cleanupError => console.warn('Failed to remove incomplete registration:', cleanupError));
    await user.delete().catch(cleanupError => console.warn('Failed to remove incomplete auth account:', cleanupError));
    throw error;
  }

  // Save the session before optional notification and activity logging work.
  await saveSession({
    uid: user.uid,
    email,
    displayName,
    role,
  });

  void registerFCM(user.uid);
  void logAuth('User Registration', `New ${role} registered: ${displayName} (${email})`, user.uid, displayName);

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
    console.log('No doc at UID, migrating legacy profile through backend...');
    const migration = await callBackend<{ found: boolean }>('migrateLegacyUserProfile');
    if (!migration.found) {
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

/**
 * Activity Log Service
 * 
 * Tracks all save/update/delete operations to Firebase.
 * Logs are stored in Firestore 'logs' collection.
 */

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { getSession } from './sessionService';

export type LogType = 'auth' | 'crud' | 'system' | 'error';

interface LogPayload {
  action: string;
  details: string;
  type: LogType;
  collection?: string;
  documentId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  changes?: { old: Record<string, any>; new: Record<string, any> } | null;
}

/**
 * Write an activity log entry to Firestore 'logs' collection
 */
export const logActivity = async (payload: LogPayload): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    const session = await getSession();
    console.log('[LOG] Writing log:', payload.action, '|', payload.details);

    const logData = {
      action: payload.action,
      details: payload.details,
      type: payload.type,
      collection: payload.collection || '',
      documentId: payload.documentId || '',
      userId: payload.userId || currentUser?.uid || session?.uid || 'system',
      userName: payload.userName || currentUser?.displayName || session?.displayName || 'System',
      userRole: payload.userRole || session?.role || 'unknown',
      changes: payload.changes || null,
      timestamp: firestore.FieldValue.serverTimestamp(),
    };

    await firestore().collection('logs').add(logData);
    console.log('[LOG] ✅ Log saved successfully');
  } catch (error: any) {
    console.error('[LOG] ❌ Log write failed:', error.message || error);
  }
};

// ─── Convenience Wrappers ───

export const logAuth = (action: string, details: string, userId?: string, userName?: string) =>
  logActivity({ action, details, type: 'auth', userId, userName, userRole: 'user' });

export const logCrud = (action: string, details: string, collection?: string, documentId?: string, changes?: { old: Record<string, any>; new: Record<string, any> } | null) =>
  logActivity({ action, details, type: 'crud', collection, documentId, changes });

export const logSystem = (action: string, details: string) =>
  logActivity({ action, details, type: 'system' });

export const logError = (action: string, details: string) =>
  logActivity({ action, details, type: 'error' });

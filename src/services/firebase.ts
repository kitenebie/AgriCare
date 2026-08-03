/**
 * Firebase Configuration & Initialization (Modular API)
 */

import { getApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';
import { getDatabase } from '@react-native-firebase/database';
import { getMessaging } from '@react-native-firebase/messaging';

// Initialize instances
export const app = getApp();
export const authInstance = auth();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export const messaging = getMessaging(app);

/**
 * Database Structure:
 * 
 * users/              ← All user accounts (shared fields)
 * admin/              ← Admin-specific data (FK: userId → users.id)
 * farmer/             ← Farmer-specific data (FK: userId → users.id)
 * technician/         ← Technician-specific data (FK: userId → users.id)
 * 
 * Sub-collections under each role:
 * admin/{adminId}/knowledgeBase, announcements, reports, etc.
 * farmer/{farmerId}/animals, appointments, healthRecords, etc.
 * technician/{techId}/appointments, schedule, reviews, etc.
 */

// Top-level collections
export const Collections = {
  USERS: 'users',
  ADMIN: 'admin',
  FARMER: 'farmer',
  TECHNICIAN: 'technician',
  // Shared collections (accessible by all roles)
  APPOINTMENTS: 'appointments',
  CONSULTATIONS: 'consultations',
  KNOWLEDGE_BASE: 'knowledgeBase',
  COMMUNITY_FORUM: 'communityForum',
  LIVESTOCK_CATEGORIES: 'livestockCategories',
  REVIEWS: 'reviews',
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
  ANNOUNCEMENTS: 'announcements',
  EMERGENCY_REQUESTS: 'emergencyRequests',
} as const;

// Realtime Database Paths (Chat)
export const RealtimeDB = {
  CHATS: 'chats',
  MESSAGES: 'messages',
  TYPING: 'typing',
  ONLINE_STATUS: 'onlineStatus',
} as const;

// Storage Paths
export const StoragePaths = {
  PROFILE_IMAGES: 'profileImages',
  ANIMAL_IMAGES: 'animalImages',
  CHAT_IMAGES: 'chatImages',
  DOCUMENTS: 'documents',
} as const;

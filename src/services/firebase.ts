/**
 * Firebase Configuration & Initialization (Modular API)
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storageModule from '@react-native-firebase/storage';
import database from '@react-native-firebase/database';
import messagingModule from '@react-native-firebase/messaging';

// Initialize instances (v21 instance method pattern)
export const app = null; // Not needed with instance methods
export const authInstance = auth();
export const db = firestore(); // Instance method — safe on Android
export const storage = storageModule(); // Instance method
export const rtdb = database();
export const messaging = messagingModule();

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

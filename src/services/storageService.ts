/**
 * Storage Service — Firebase Storage (Modular API)
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from '@react-native-firebase/storage';
import { storage, StoragePaths } from './firebase';

/**
 * Upload an image to Firebase Storage
 */
export const uploadImage = async (uri: string, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  // Convert URI to blob for upload
  const response = await fetch(uri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
};

/**
 * Upload profile image
 */
export const uploadProfileImage = async (userId: string, uri: string): Promise<string> => {
  const path = `${StoragePaths.PROFILE_IMAGES}/${userId}_${Date.now()}.jpg`;
  return uploadImage(uri, path);
};

/**
 * Upload animal image
 */
export const uploadAnimalImage = async (animalId: string, uri: string): Promise<string> => {
  const path = `${StoragePaths.ANIMAL_IMAGES}/${animalId}_${Date.now()}.jpg`;
  return uploadImage(uri, path);
};

/**
 * Upload chat image
 */
export const uploadChatImage = async (chatId: string, senderId: string, uri: string): Promise<string> => {
  const path = `${StoragePaths.CHAT_IMAGES}/${chatId}/${senderId}_${Date.now()}.jpg`;
  return uploadImage(uri, path);
};

/**
 * Delete an image from storage
 */
export const deleteImage = async (url: string): Promise<void> => {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn('Failed to delete image:', error);
  }
};

/**
 * Get download URL from storage path
 */
export const getFileDownloadUrl = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
};

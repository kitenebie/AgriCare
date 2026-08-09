/**
 * Location Service — Real-time location updates saved to Firebase Realtime Database
 * 
 * Realtime DB structure:
 *   locations/{userId} = {
 *     latitude: number,
 *     longitude: number,
 *     heading: number,
 *     speed: number,
 *     accuracy: number,
 *     timestamp: number,
 *     role: 'farmer' | 'technician',
 *     displayName: string,
 *     isActive: boolean
 *   }
 */

import { ref, set, onValue, remove, serverTimestamp, get } from '@react-native-firebase/database';
import { rtdb } from './firebase';
import firestore from '@react-native-firebase/firestore';
import { Collections } from './firebase';

export interface UserLocation {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy: number;
  timestamp: number;
  role: string;
  displayName: string;
  isActive: boolean;
}

const LOCATIONS_PATH = 'locations';

/**
 * Update the current user's location in Realtime Database
 */
export const updateLocation = async (
  userId: string,
  location: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  },
  role: string,
  displayName: string
) => {
  const locationRef = ref(rtdb, `${LOCATIONS_PATH}/${userId}`);
  await set(locationRef, {
    latitude: location.latitude,
    longitude: location.longitude,
    heading: location.heading || 0,
    speed: location.speed || 0,
    accuracy: location.accuracy || 0,
    timestamp: Date.now(),
    role,
    displayName,
    isActive: true,
  });

  // Also update Firestore user document with latest coordinates
  try {
    await firestore().collection(Collections.USERS).doc(userId).update({
      latitude: location.latitude,
      longitude: location.longitude,
      lastLocationUpdate: firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    // Silently fail — Firestore update is secondary
  }
};

/**
 * Listen to a specific user's location (real-time)
 */
export const listenToUserLocation = (
  userId: string,
  callback: (location: UserLocation | null) => void
) => {
  const locationRef = ref(rtdb, `${LOCATIONS_PATH}/${userId}`);
  return onValue(locationRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as UserLocation);
    } else {
      callback(null);
    }
  });
};

/**
 * Listen to all active locations by role (e.g., all active technicians or farmers)
 */
export const listenToLocationsByRole = (
  role: string,
  callback: (locations: Record<string, UserLocation>) => void
) => {
  const locationsRef = ref(rtdb, LOCATIONS_PATH);
  return onValue(locationsRef, (snapshot) => {
    const allLocations: Record<string, UserLocation> = {};
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const data = child.val() as UserLocation;
        if (data.role === role && data.isActive) {
          allLocations[child.key!] = data;
        }
        return undefined;
      });
    }
    callback(allLocations);
  });
};

/**
 * Listen to multiple specific users' locations
 */
export const listenToUsersLocations = (
  userIds: string[],
  callback: (locations: Record<string, UserLocation>) => void
) => {
  const locationsRef = ref(rtdb, LOCATIONS_PATH);
  return onValue(locationsRef, (snapshot) => {
    const locations: Record<string, UserLocation> = {};
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        if (userIds.includes(child.key!) && child.val().isActive) {
          locations[child.key!] = child.val() as UserLocation;
        }
        return undefined;
      });
    }
    callback(locations);
  });
};

/**
 * Mark user as inactive (stop sharing location)
 */
export const clearLocation = async (userId: string) => {
  const locationRef = ref(rtdb, `${LOCATIONS_PATH}/${userId}`);
  const snapshot = await get(locationRef);
  if (snapshot.exists()) {
    await set(locationRef, { ...snapshot.val(), isActive: false });
  }
};

/**
 * Remove user's location entirely
 */
export const removeLocation = async (userId: string) => {
  const locationRef = ref(rtdb, `${LOCATIONS_PATH}/${userId}`);
  await remove(locationRef);
};

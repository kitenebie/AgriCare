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
 *     heartbeatTimestamp: number,
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
export const LOCATION_ONLINE_TIMEOUT_MS = 60_000;
export const isLocationFresh = (location: { timestamp?: number }, now = Date.now(), timeout = LOCATION_ONLINE_TIMEOUT_MS) => {
  const timestamp = location.timestamp;
  const age = now - (timestamp ?? NaN);
  return typeof timestamp === 'number' && Number.isFinite(timestamp) && age >= -5_000 && age < timeout;
};

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
  displayName: string,
  updateProfile = true
) => {
  const locationRef = ref(rtdb, `${LOCATIONS_PATH}/${userId}`);
  await set(locationRef, {
    latitude: location.latitude,
    longitude: location.longitude,
    heading: location.heading || 0,
    speed: location.speed || 0,
    accuracy: location.accuracy || 0,
    timestamp: serverTimestamp(),
    heartbeatTimestamp: serverTimestamp(),
    role,
    displayName,
    isActive: true,
  });

  // Also update Firestore user document with latest coordinates
  if (updateProfile) {
    try {
      await firestore().collection(Collections.USERS).doc(userId).update({
        latitude: location.latitude,
        longitude: location.longitude,
        lastLocationUpdate: firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      // Silently fail — Firestore update is secondary
    }
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
const listenToLocations = (
  include: (userId: string, location: UserLocation) => boolean,
  callback: (locations: Record<string, UserLocation>) => void
) => {
  const locationsRef = ref(rtdb, LOCATIONS_PATH);
  let locations: Record<string, UserLocation> = {};
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  const publishFreshLocations = () => {
    if (expiryTimer) clearTimeout(expiryTimer);
    const now = Date.now();
    const activeLocations = Object.fromEntries(
      Object.entries(locations).filter(([, location]) => location.isActive && isLocationFresh(location, now))
    );
    callback(activeLocations);
    const nextExpiry = Math.min(...Object.values(activeLocations).map(location => location.timestamp + LOCATION_ONLINE_TIMEOUT_MS));
    if (Number.isFinite(nextExpiry)) expiryTimer = setTimeout(publishFreshLocations, Math.max(1, nextExpiry - now + 1));
  };
  const unsubscribe = onValue(locationsRef, (snapshot) => {
    locations = {};
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const data = child.val() as UserLocation;
        if (include(child.key!, data)) locations[child.key!] = data;
        return undefined;
      });
    }
    publishFreshLocations();
  }, error => console.warn('Live location listener failed:', error.message));
  return () => {
    unsubscribe();
    if (expiryTimer) clearTimeout(expiryTimer);
  };
};

/**
 * Listen to multiple specific users' locations
 */
export const listenToUsersLocations = (
  userIds: string[],
  callback: (locations: Record<string, UserLocation>) => void
) => listenToLocations(userId => userIds.includes(userId), callback);

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

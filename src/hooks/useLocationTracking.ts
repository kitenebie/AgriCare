/**
 * useLocationTracking Hook
 * 
 * Handles:
 * 1. Request location permission (Android)
 * 2. Start GPS watch (foreground)
 * 3. Push location updates to Firebase Realtime DB
 * 4. Clean up on unmount
 * 
 * Usage:
 *   const { location, isTracking, error, startTracking, stopTracking } = useLocationTracking();
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert, AppState } from 'react-native';
import * as Location from 'expo-location';
import { updateLocation, clearLocation } from '@/services/locationService';
import { getSession } from '@/services/sessionService';

interface LocationData {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy: number;
}

interface UseLocationTrackingResult {
  location: LocationData | null;
  isTracking: boolean;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}

// Update interval in milliseconds (every 10 seconds)
const UPDATE_INTERVAL = 10000;
// Minimum distance change to trigger update (in meters)
const DISTANCE_FILTER = 10;

export const useLocationTracking = (): UseLocationTrackingResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<{ uid: string; role: string; displayName: string } | null>(null);

  // Get session on mount
  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession();
      if (session) {
        sessionRef.current = {
          uid: session.uid,
          role: session.role || 'farmer',
          displayName: session.displayName || 'User',
        };
      }
    };
    loadSession();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Mark location as inactive
      if (sessionRef.current) {
        clearLocation(sessionRef.current.uid);
      }
    };
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' && sessionRef.current) {
        clearLocation(sessionRef.current.uid);
      }
    });
    return () => subscription.remove();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        Alert.alert(
          'Location Permission',
          'AgriCare needs access to your location to show your position on the map and help connect you with nearby services.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to request permission');
      return false;
    }
  };

  const pushLocationToFirebase = useCallback(async (loc: LocationData) => {
    if (!sessionRef.current) return;
    try {
      await updateLocation(
        sessionRef.current.uid,
        {
          latitude: loc.latitude,
          longitude: loc.longitude,
          heading: loc.heading,
          speed: loc.speed,
          accuracy: loc.accuracy,
        },
        sessionRef.current.role,
        sessionRef.current.displayName
      );
    } catch (e: any) {
      console.warn('Location push error:', e.message);
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (isTracking) return;

    // Wait for session if not ready
    if (!sessionRef.current) {
      const session = await getSession();
      if (!session) {
        setError('Not logged in');
        return;
      }
      sessionRef.current = {
        uid: session.uid,
        role: session.role || 'farmer',
        displayName: session.displayName || 'User',
      };
    }

    // Request permission
    const granted = await requestPermission();
    if (!granted) return;

    setError(null);
    setIsTracking(true);

    try {
      // Get initial location
      const initialLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const initialData: LocationData = {
        latitude: initialLoc.coords.latitude,
        longitude: initialLoc.coords.longitude,
        heading: initialLoc.coords.heading || 0,
        speed: initialLoc.coords.speed || 0,
        accuracy: initialLoc.coords.accuracy || 0,
      };
      setLocation(initialData);
      await pushLocationToFirebase(initialData);

      // Start watching position
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: UPDATE_INTERVAL,
          distanceInterval: DISTANCE_FILTER,
        },
        (loc) => {
          const locData: LocationData = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading || 0,
            speed: loc.coords.speed || 0,
            accuracy: loc.coords.accuracy || 0,
          };
          setLocation(locData);
          pushLocationToFirebase(locData);
        }
      );
    } catch (e: any) {
      setError(e.message || 'Failed to start tracking');
      setIsTracking(false);
    }
  }, [isTracking, pushLocationToFirebase]);

  const stopTracking = useCallback(async () => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);

    // Mark as inactive in Firebase
    if (sessionRef.current) {
      await clearLocation(sessionRef.current.uid);
    }
  }, []);

  return { location, isTracking, error, startTracking, stopTracking };
};

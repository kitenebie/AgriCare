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
import { Platform, PermissionsAndroid, AppState } from 'react-native';
import { modalAlert } from '@/components/ui/ModalAlert';
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

// Keep live map positions responsive while limiting GPS polling.
const UPDATE_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 30000;
// Minimum distance change to trigger update (in meters)
const DISTANCE_FILTER = 5;

const toLocationData = (location: Location.LocationObject): LocationData => ({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
  heading: location.coords.heading || 0,
  speed: location.coords.speed || 0,
  accuracy: location.coords.accuracy || 0,
});

export const useLocationTracking = (): UseLocationTrackingResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const locationRef = useRef<LocationData | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const sessionRef = useRef<{ uid: string; role: string; displayName: string } | null>(null);

  // Get session on mount
  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession();
      if (session) {
        sessionRef.current = {
          uid: session.uid,
          role: session.role || 'farmer',
          displayName: session.displayName || 'User'
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

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        modalAlert(
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

  const pushLocationToFirebase = useCallback(async (loc: LocationData, updateProfile = true) => {
    if (!sessionRef.current) return;
    try {
      await updateLocation(
        sessionRef.current.uid,
        {
          latitude: loc.latitude,
          longitude: loc.longitude,
          heading: loc.heading,
          speed: loc.speed,
          accuracy: loc.accuracy
        },
        sessionRef.current.role,
        sessionRef.current.displayName,
        updateProfile
      );
    } catch (e: any) {
      console.warn('Location push error:', e.message);
    }
  }, []);

  // Refresh the location on return to foreground so paused GPS callbacks do not leave users offline.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      appStateRef.current = nextState;
      if (nextState !== 'active' && sessionRef.current) {
        void clearLocation(sessionRef.current.uid);
      } else if (nextState === 'active' && sessionRef.current) {
        void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
          .then(location => {
            const current = toLocationData(location);
            locationRef.current = current;
            setLocation(current);
            return pushLocationToFirebase(current);
          })
          .catch(error => console.warn('Location refresh error:', error.message));
      }
    });
    return () => subscription.remove();
  }, [pushLocationToFirebase]);

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
        displayName: session.displayName || 'User'
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
        accuracy: Location.Accuracy.High
      });
      const initialData = toLocationData(initialLoc);
      setLocation(initialData);
      locationRef.current = initialData;
      await pushLocationToFirebase(initialData);

      // Start watching position
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: UPDATE_INTERVAL,
          distanceInterval: DISTANCE_FILTER
        },
        (loc) => {
          if (appStateRef.current !== 'active') return;
          const locData = toLocationData(loc);
          setLocation(locData);
          locationRef.current = locData;
          pushLocationToFirebase(locData);
        }
      );
      intervalRef.current = setInterval(() => {
        if (appStateRef.current === 'active' && locationRef.current) {
          void pushLocationToFirebase(locationRef.current, false);
        }
      }, HEARTBEAT_INTERVAL);
    } catch (e: any) {
      setError(e.message || 'Failed to start tracking');
      setIsTracking(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
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
    locationRef.current = null;
    setIsTracking(false);

    // Mark as inactive in Firebase
    if (sessionRef.current) {
      await clearLocation(sessionRef.current.uid);
    }
  }, []);

  return { location, isTracking, error, startTracking, stopTracking };
};

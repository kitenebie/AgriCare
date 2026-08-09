/**
 * LocationTracker — Invisible component that starts GPS tracking
 * 
 * Place in layout to auto-track user location:
 *   <LocationTracker />
 * 
 * Starts tracking on mount, stops on unmount.
 * Saves location to Firebase Realtime Database every 10 seconds or 10m movement.
 */

import React, { useEffect } from 'react';
import { useLocationTracking } from '@/hooks/useLocationTracking';

export const LocationTracker: React.FC = () => {
  const { startTracking, stopTracking } = useLocationTracking();

  useEffect(() => {
    // Auto-start tracking when component mounts
    startTracking();

    return () => {
      stopTracking();
    };
  }, []);

  // This component renders nothing — it just runs the tracking logic
  return null;
};

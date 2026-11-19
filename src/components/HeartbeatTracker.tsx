import React, { useEffect } from 'react';
import { getSession } from '@/services/sessionService';
import { startHeartbeat } from '@/services/heartbeat';

export const HeartbeatTracker: React.FC = () => {
  useEffect(() => {
    let active = true;
    let stopHeartbeat: (() => void) | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const start = async () => {
      const session = await getSession();
      if (!active) return;
      if (session) stopHeartbeat = startHeartbeat(session.uid, session.role, session.displayName || 'User');
      else retryTimer = setTimeout(start, 1000);
    };
    void start().catch(error => console.warn('Heartbeat session load failed:', error.message));
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      stopHeartbeat?.();
    };
  }, []);

  return null;
};

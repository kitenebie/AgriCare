import { AppState } from 'react-native';
import { onValue, ref, serverTimestamp, update } from '@react-native-firebase/database';
import { rtdb } from './firebase';

export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_TIMEOUT_MS = 60_000;

export interface UserHeartbeat {
  role: string;
  displayName: string;
  heartbeatTimestamp: number;
  timestamp?: number;
  isActive?: boolean;
  latitude?: number;
  longitude?: number;
}

export const isHeartbeatFresh = (heartbeatTimestamp: number, now = Date.now()) => {
  const age = now - heartbeatTimestamp;
  return Number.isFinite(heartbeatTimestamp) && age >= -5_000 && age < HEARTBEAT_TIMEOUT_MS;
};

export const startHeartbeat = (userId: string, role: string, displayName: string) => {
  let stopped = false;
  const beat = () => {
    if (stopped || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
    void update(ref(rtdb, `locations/${userId}`), {
      role,
      displayName,
      heartbeatTimestamp: serverTimestamp(),
    }).catch(error => console.warn('Heartbeat update failed:', error.message));
  };

  beat();
  const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
  const appState = AppState.addEventListener('change', state => {
    if (state === 'active') beat();
  });

  return () => {
    stopped = true;
    clearInterval(interval);
    appState.remove();
  };
};

export const listenToHeartbeatsByRole = (
  role: string,
  callback: (users: Record<string, UserHeartbeat>) => void
) => {
  const usersRef = ref(rtdb, 'locations');
  let users: Record<string, UserHeartbeat> = {};
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  const publishOnlineUsers = () => {
    if (expiryTimer) clearTimeout(expiryTimer);
    const now = Date.now();
    const online = Object.fromEntries(Object.entries(users).filter(([, user]) => isHeartbeatFresh(user.heartbeatTimestamp, now)));
    callback(online);
    const nextExpiry = Math.min(...Object.values(online).map(user => user.heartbeatTimestamp + HEARTBEAT_TIMEOUT_MS));
    if (Number.isFinite(nextExpiry)) expiryTimer = setTimeout(publishOnlineUsers, Math.max(1, nextExpiry - now + 1));
  };

  const unsubscribe = onValue(usersRef, snapshot => {
    users = {};
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const user = child.val() as UserHeartbeat;
        if (user.role === role) users[child.key!] = user;
        return undefined;
      });
    }
    publishOnlineUsers();
  }, error => console.warn('Heartbeat listener failed:', error.message));

  return () => {
    unsubscribe();
    if (expiryTimer) clearTimeout(expiryTimer);
  };
};

export const listenToUserOnlineStatus = (userId: string, callback: (online: boolean) => void) => {
  let heartbeatTimestamp = 0;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  const publish = () => {
    if (expiryTimer) clearTimeout(expiryTimer);
    const online = isHeartbeatFresh(heartbeatTimestamp);
    callback(online);
    if (online) expiryTimer = setTimeout(publish, Math.max(1, heartbeatTimestamp + HEARTBEAT_TIMEOUT_MS - Date.now() + 1));
  };
  const unsubscribe = onValue(ref(rtdb, `locations/${userId}`), snapshot => {
    heartbeatTimestamp = (snapshot.val() as UserHeartbeat | null)?.heartbeatTimestamp ?? 0;
    publish();
  }, error => {
    heartbeatTimestamp = 0;
    publish();
    console.warn('Heartbeat listener failed:', error.message);
  });
  return () => {
    unsubscribe();
    if (expiryTimer) clearTimeout(expiryTimer);
  };
};

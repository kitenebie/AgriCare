/**
 * BanGuard — Real-time account status monitor
 * 
 * Listens to the user's Firestore document for status changes.
 * If the user gets banned or deactivated (even mid-session), it:
 * 1. Shows an alert explaining the ban
 * 2. Clears the session
 * 3. Redirects to login screen
 * 
 * Add this to both (farmer)/_layout.tsx and (technician)/_layout.tsx
 */

import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { getSession, clearSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';

export const BanGuard: React.FC = () => {
  const hasShownAlert = useRef(false);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    const init = async () => {
      const session = await getSession();
      if (!session) return;

      // Listen to user's document for status changes
      unsub = firestore()
        .collection(Collections.USERS)
        .doc(session.uid)
        .onSnapshot((doc) => {
          if (!doc.exists) return;
          const data = doc.data();
          if (!data) return;

          const { status, banUntil, banDuration } = data;

          // Check if deactivated
          if (status === 'deactivated' && !hasShownAlert.current) {
            hasShownAlert.current = true;
            Alert.alert(
              '🚫 Account Deactivated',
              'Your account has been permanently deactivated due to violation of community guidelines. Contact support for appeal.',
              [{
                text: 'OK',
                onPress: async () => {
                  await clearSession();
                  router.replace('/(auth)/login');
                },
              }],
              { cancelable: false }
            );
          }

          // Check if banned (and ban hasn't expired)
          if (status === 'banned' && banUntil && !hasShownAlert.current) {
            const banUntilDate = banUntil.toDate ? banUntil.toDate() : new Date(banUntil);
            if (banUntilDate > new Date()) {
              hasShownAlert.current = true;
              const formattedDate = banUntilDate.toLocaleDateString('en-PH', {
                month: 'long', day: 'numeric', year: 'numeric',
              });
              Alert.alert(
                '⛔ Account Suspended',
                `Your account has been suspended${banDuration ? ` for ${banDuration}` : ''} until ${formattedDate} due to violation of community guidelines.`,
                [{
                  text: 'OK',
                  onPress: async () => {
                    await clearSession();
                    router.replace('/(auth)/login');
                  },
                }],
                { cancelable: false }
              );
            }
          }
        });
    };

    init();
    return () => { if (unsub) unsub(); };
  }, []);

  // Invisible component — just listens
  return null;
};

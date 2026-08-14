/**
 * Sound Service — In-app notification sounds using expo-audio
 *
 * assets/app/new-chat.mp3    → plays when a new chat message arrives (foreground + push)
 * assets/app/notification.mp3 → plays for non-chat push notifications (foreground)
 * assets/app/typing.mp3      → loops while the other user is typing in 1-on-1 chat
 */

import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

// ——— Sound sources ———
const SOUND_NEW_CHAT = require('../../assets/app/new-chat.mp3');
const SOUND_NOTIFICATION = require('../../assets/app/notification.mp3');
const SOUND_TYPING = require('../../assets/app/typing.mp3');

// ——— Sound instances (cached for reuse) ———
let newChatPlayer: AudioPlayer | null = null;
let notificationPlayer: AudioPlayer | null = null;
let typingPlayer: AudioPlayer | null = null;
let typingPlaying = false;
let audioModeSet = false;

// ——— Helpers ———

/** Ensure audio mode allows playback even in silent mode (important for notifications) */
const ensureAudioMode = async () => {
  if (audioModeSet) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
    audioModeSet = true;
  } catch (e) {
    console.warn('[SoundService] setAudioModeAsync failed:', e);
  }
};

/** Helper to play a sound with a cached player */
const playWithPlayer = async (
  source: any,
  getPlayer: () => AudioPlayer | null,
  setPlayer: (p: AudioPlayer) => void,
  loop: boolean = false
): Promise<void> => {
  await ensureAudioMode();
  let player = getPlayer();
  if (!player) {
    player = createAudioPlayer(source);
    player.loop = loop;
    setPlayer(player);
  }
  // Replace source to reset position and play from beginning
  player.replace(source);
  player.play();
};

// ——— Public API ———

/**
 * Play new-chat.mp3 — called when a new chat message notification arrives
 * (works both when the app is open and from push notification foreground handler)
 */
export const playNewChatSound = async (): Promise<void> => {
  try {
    await playWithPlayer(
      SOUND_NEW_CHAT,
      () => newChatPlayer,
      (p) => { newChatPlayer = p; }
    );
  } catch (error) {
    console.warn('[SoundService] Failed to play new-chat sound:', error);
  }
};

/**
 * Play notification.mp3 — called for push notifications that are NOT chat messages
 * (e.g. admin approvals, service updates, reminders)
 */
export const playNotificationSound = async (): Promise<void> => {
  try {
    await playWithPlayer(
      SOUND_NOTIFICATION,
      () => notificationPlayer,
      (p) => { notificationPlayer = p; }
    );
  } catch (error) {
    console.warn('[SoundService] Failed to play notification sound:', error);
  }
};

/**
 * Start looping typing.mp3 — called when the other user starts typing
 * in a 1-on-1 chat conversation (typing indicator / 3 dots visible)
 */
export const startTypingSound = async (): Promise<void> => {
  try {
    if (typingPlaying) return; // already playing
    await ensureAudioMode();
    if (!typingPlayer) {
      typingPlayer = createAudioPlayer(SOUND_TYPING);
      typingPlayer.loop = true;
    }
    typingPlayer.replace(SOUND_TYPING);
    typingPlayer.play();
    typingPlaying = true;
  } catch (error) {
    console.warn('[SoundService] Failed to start typing sound:', error);
  }
};

/**
 * Stop the typing sound loop — called when the other user stops typing
 */
export const stopTypingSound = async (): Promise<void> => {
  try {
    if (!typingPlaying || !typingPlayer) return;
    typingPlayer.pause();
    typingPlaying = false;
  } catch (error) {
    console.warn('[SoundService] Failed to stop typing sound:', error);
  }
};

/**
 * Release all cached players — call on app unmount to free resources
 */
export const unloadSounds = async (): Promise<void> => {
  try {
    if (newChatPlayer) { newChatPlayer.remove(); newChatPlayer = null; }
    if (notificationPlayer) { notificationPlayer.remove(); notificationPlayer = null; }
    if (typingPlayer) { typingPlayer.remove(); typingPlayer = null; }
    typingPlaying = false;
    audioModeSet = false;
  } catch (error) {
    console.warn('[SoundService] Failed to unload sounds:', error);
  }
};

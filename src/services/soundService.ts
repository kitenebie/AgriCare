/**
 * Sound Service — In-app notification sounds
 * 
 * Uses expo-av to play sounds when the app is in foreground.
 * For background notifications, Android uses the sound files
 * placed in android/app/src/main/res/raw/
 * 
 * Sounds:
 * - new_chat.mp3 → new chat messages
 * - notification.mp3 → all other notifications (announcements, forum, knowledge base, etc.)
 * - typing.mp3 → typing indicator loop (plays while other user is typing)
 */

import { Audio } from 'expo-av';

let chatSound: Audio.Sound | null = null;
let notifSound: Audio.Sound | null = null;
let typingSound: Audio.Sound | null = null;

/**
 * Play the new chat message sound (in-app / foreground)
 */
export const playNewChatSound = async (): Promise<void> => {
  try {
    if (chatSound) {
      await chatSound.unloadAsync();
      chatSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/app/new-chat.mp3'),
      { shouldPlay: true, volume: 1.0 }
    );
    chatSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        chatSound = null;
      }
    });
  } catch (error: any) {
    console.warn('[Sound] Failed to play new chat sound:', error.message);
  }
};

/**
 * Play the general notification sound (in-app / foreground)
 * Used for: announcements, forum posts, knowledge base articles, approvals, etc.
 */
export const playNotificationSound = async (): Promise<void> => {
  try {
    if (notifSound) {
      await notifSound.unloadAsync();
      notifSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/app/notification.mp3'),
      { shouldPlay: true, volume: 1.0 }
    );
    notifSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        notifSound = null;
      }
    });
  } catch (error: any) {
    console.warn('[Sound] Failed to play notification sound:', error.message);
  }
};

/**
 * Start playing the typing indicator sound on loop
 * Loops until stopTypingSound() is called
 */
export const startTypingSound = async (): Promise<void> => {
  try {
    // Don't restart if already playing
    if (typingSound) {
      const status = await typingSound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) return;
      await typingSound.unloadAsync();
      typingSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/app/typing.mp3'),
      { shouldPlay: true, isLooping: true, volume: 0.6 }
    );
    typingSound = sound;
  } catch (error: any) {
    console.warn('[Sound] Failed to start typing sound:', error.message);
  }
};

/**
 * Stop the typing indicator sound loop
 */
export const stopTypingSound = async (): Promise<void> => {
  try {
    if (typingSound) {
      await typingSound.stopAsync();
      await typingSound.unloadAsync();
      typingSound = null;
    }
  } catch (error: any) {
    console.warn('[Sound] Failed to stop typing sound:', error.message);
  }
};

/**
 * Cleanup — call on app unmount if needed
 */
export const unloadSounds = async (): Promise<void> => {
  if (chatSound) {
    await chatSound.unloadAsync();
    chatSound = null;
  }
  if (notifSound) {
    await notifSound.unloadAsync();
    notifSound = null;
  }
  if (typingSound) {
    await typingSound.stopAsync();
    await typingSound.unloadAsync();
    typingSound = null;
  }
};

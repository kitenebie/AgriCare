import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  runOnJS, withDelay, Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Avatar } from './Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_HEIGHT = 88;
const MAX_MESSAGE_CHARS = 320;
const AUTO_DISMISS_MS = 5000;

// ─── Types ───
interface ToastConfig {
  senderName: string;
  message: string;
  senderPhoto?: string;
  onPress?: () => void;
}

interface ToastState {
  visible: boolean;
  config: ToastConfig | null;
}

// ─── Global state ───
let _setToastState: ((state: ToastState) => void) | null = null;
let _dismissTimer: NodeJS.Timeout | null = null;

/**
 * Show a top-toast notification for incoming chat messages.
 * Displays sender name + message (max 320 chars).
 * Auto-dismisses after 5 seconds or on tap.
 * 
 * Usage: showChatToast({ senderName: 'Juan', message: 'Hello!', onPress: () => navigateToChat() })
 */
export function showChatToast(config: ToastConfig) {
  // Truncate message to MAX_MESSAGE_CHARS
  const truncatedMessage = config.message.length > MAX_MESSAGE_CHARS
    ? config.message.substring(0, MAX_MESSAGE_CHARS) + '...'
    : config.message;

  if (_setToastState) {
    _setToastState({ visible: true, config: { ...config, message: truncatedMessage } });
  }
}

export function dismissChatToast() {
  if (_setToastState) {
    _setToastState({ visible: false, config: null });
  }
}

// ─── Provider Component (place in _layout.tsx) ───
export const ToastNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<ToastState>({ visible: false, config: null });
  const translateY = useSharedValue(-TOAST_HEIGHT - 60);
  const opacity = useSharedValue(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    _setToastState = setState;
    return () => { _setToastState = null; };
  }, []);

  useEffect(() => {
    if (state.visible && state.config) {
      // Slide in from top
      translateY.value = withSpring(0, { damping: 16, stiffness: 140 });
      opacity.value = withTiming(1, { duration: 250 });

      // Auto dismiss after 5s
      if (_dismissTimer) clearTimeout(_dismissTimer);
      _dismissTimer = setTimeout(() => {
        handleDismiss();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (_dismissTimer) clearTimeout(_dismissTimer);
    };
  }, [state.visible, state.config]);

  const handleDismiss = useCallback(() => {
    if (_dismissTimer) clearTimeout(_dismissTimer);
    translateY.value = withTiming(-TOAST_HEIGHT - 60, { duration: 250, easing: Easing.out(Easing.ease) });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(setState)({ visible: false, config: null });
    });
  }, []);

  const handlePress = useCallback(() => {
    if (state.config?.onPress) {
      state.config.onPress();
    }
    handleDismiss();
  }, [state.config]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <>
      {children}
      {state.config && (
        <Animated.View
          style={[
            styles.toastContainer,
            { top: insets.top + Spacing.sm },
            animatedStyle,
          ]}
          pointerEvents={state.visible ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.toastContent}
            onPress={handlePress}
            activeOpacity={0.85}
          >
            {/* App badge + avatar */}
            <View style={styles.avatarSection}>
              <Avatar
                name={state.config.senderName}
                size={44}
                imageUrl={state.config.senderPhoto || undefined}
              />
              {/* Online dot indicator */}
              <View style={styles.onlineDot} />
            </View>

            {/* Text content */}
            <View style={styles.textSection}>
              <View style={styles.headerRow}>
                <Text style={styles.senderName} numberOfLines={1}>
                  {state.config.senderName}
                </Text>
                <Text style={styles.timeLabel}>Now</Text>
              </View>
              <Text style={styles.messageText} numberOfLines={3}>
                {state.config.message}
              </Text>
            </View>

            {/* Dismiss X */}
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.dismissX}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Swipe-up hint bar */}
          <View style={styles.swipeHint} />
        </Animated.View>
      )}
    </>
  );
};

// ─── Styles ───
const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    elevation: 9999,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    ...Shadow.heavy,
  },
  avatarSection: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  textSection: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  senderName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  timeLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginLeft: Spacing.sm,
  },
  messageText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  dismissBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
    marginTop: -2,
  },
  dismissX: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '600',
  },
  swipeHint: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.xs,
  },
});

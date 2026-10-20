import { Avatar, Icon } from "@/components/ui";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/ui/FontScale";
import { modalAlert } from "@/components/ui/ModalAlert";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "@/constants/theme";
import {
  ChatMessage,
  addReaction,
  listenToMessages,
  listenToTyping,
  markMessagesAsRead,
  removeReaction,
  sendMessage,
  sendReplyMessage,
  setTyping,
} from "@/services/chatService";
import { Collections } from "@/services/firebase";
import { sendPushNotification } from "@/services/pushService";
import {
  getCompletedAppointment,
  getPendingRateRequest,
  hasExistingRateRequest,
  sendRateRequest,
  submitRating,
} from "@/services/ratingService";
import { getSession } from "@/services/sessionService";
import { startTypingSound, stopTypingSound } from "@/services/soundService";
import firestore from "@react-native-firebase/firestore";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { MoreVertical } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TextInput as NativeTextInput } from "react-native";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = -60; // swipe left threshold
const REACTION_EMOJIS = ["💓", "👍", "😆", "😟", "💢"];

// ─── Animated typing dot ───
const TypingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
        false,
      ),
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  return <Animated.View style={[s.typingDot, animStyle]} />;
};

// ─── Star Rating Component (clickable) ───
const StarRating: React.FC<{
  rating: number;
  onRate: (r: number) => void;
  size?: number;
}> = ({ rating, onRate, size = 40 }) => {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onRate(star)}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontSize: size,
              color: star <= rating ? "#FFD700" : "#DDD",
            }}
          >
            {star <= rating ? "★" : "☆"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Rating Floating Card (appears in chat for farmer) ───
const RatingCard: React.FC<{
  visible: boolean;
  technicianName: string;
  animalName?: string;
  animalPhoto?: string;
  serviceType?: string;
  onSubmit: (rating: number) => void;
  onDismiss: () => void;
}> = ({
  visible,
  technicianName,
  animalName,
  animalPhoto,
  serviceType,
  onSubmit,
  onDismiss,
}) => {
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  if (!visible) return null;

  const handleSubmit = async () => {
    if (selectedRating === 0) return;
    setSubmittingRating(true);
    await onSubmit(selectedRating);
    setSubmittingRating(false);
    setSelectedRating(0);
  };

  return (
    <View style={s.ratingCardContainer}>
      <View style={s.ratingCard}>
        <View style={s.ratingCardHeader}>
          <Icon name="star" size={24} color="#FFD700" />
          <Text style={s.ratingCardTitle}>Rate Your Experience</Text>
          <TouchableOpacity onPress={onDismiss} style={s.ratingDismiss}>
            <Icon name="close" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {/* Animal Info */}
        {animalName ? (
          <View style={s.ratingAnimalRow}>
            {animalPhoto ? (
              <Image
                source={{ uri: animalPhoto }}
                style={s.ratingAnimalImg}
                contentFit="cover"
              />
            ) : (
              <View style={s.ratingAnimalIcon}>
                <Icon name="paw" size={20} color={Colors.primary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.ratingAnimalName}>{animalName}</Text>
              {serviceType ? (
                <Text style={s.ratingAnimalService}>{serviceType}</Text>
              ) : null}
            </View>
          </View>
        ) : null}
        <Text style={s.ratingCardSubtitle}>
          How was your experience with {technicianName}?
        </Text>
        <StarRating
          rating={selectedRating}
          onRate={setSelectedRating}
          size={40}
        />
        {selectedRating > 0 && (
          <Text style={s.ratingLabel}>
            {selectedRating === 1
              ? "😞 Poor"
              : selectedRating === 2
                ? "😐 Fair"
                : selectedRating === 3
                  ? "🙂 Good"
                  : selectedRating === 4
                    ? "😊 Very Good"
                    : "🤩 Excellent!"}
          </Text>
        )}
        <TouchableOpacity
          style={[
            s.ratingSubmitBtn,
            selectedRating === 0 && s.ratingSubmitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={selectedRating === 0 || submittingRating}
          activeOpacity={0.7}
        >
          {submittingRating ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={s.ratingSubmitText}>Submit Rating</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Pre-built Message Suggestion (Technician side) ───
const MessageSuggestion: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={s.suggestionBtn}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name="star" size={14} color="#FFD700" />
      <Text style={s.suggestionText}>Send a rate request</Text>
    </TouchableOpacity>
  );
};

// ─── Reaction Popup ───
const ReactionPopup: React.FC<{
  visible: boolean;
  position: { x: number; y: number };
  onSelect: (emoji: string) => void;
  onClose: () => void;
}> = ({ visible, position, onSelect, onClose }) => {
  const scale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    } else {
      scale.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={s.reactionOverlay} onPress={onClose}>
        <Animated.View
          style={[
            s.reactionPopup,
            animStyle,
            {
              top: position.y - 60,
              left: Math.max(
                10,
                Math.min(position.x - 100, SCREEN_WIDTH - 220),
              ),
            },
          ]}
        >
          {REACTION_EMOJIS.map((emoji, index) => (
            <TouchableOpacity
              key={emoji}
              style={s.reactionEmojiBtn}
              onPress={() => {
                onSelect(emoji);
                onClose();
              }}
              activeOpacity={0.6}
            >
              <Text style={s.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// ─── Reactions Display (below bubble) ───
const ReactionsDisplay: React.FC<{
  reactions: Record<string, string[]> | undefined;
  onPress: (emoji: string) => void;
  uid: string;
}> = ({ reactions, onPress, uid }) => {
  if (!reactions || Object.keys(reactions).length === 0) return null;

  return (
    <View style={s.reactionsContainer}>
      {Object.entries(reactions).map(([emoji, userIds]) => {
        if (!userIds || userIds.length === 0) return null;
        const iReacted = userIds.includes(uid);
        return (
          <TouchableOpacity
            key={emoji}
            style={[s.reactionChip, iReacted && s.reactionChipActive]}
            onPress={() => onPress(emoji)}
            activeOpacity={0.7}
          >
            <Text style={s.reactionChipEmoji}>{emoji}</Text>
            {userIds.length > 1 && (
              <Text style={s.reactionChipCount}>{userIds.length}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Reply Preview Bar (in input area) ───
const ReplyPreview: React.FC<{
  replyTo: { id: string; text: string; senderId: string } | null;
  otherUserName: string;
  myName: string;
  uid: string;
  onCancel: () => void;
}> = ({ replyTo, otherUserName, myName, uid, onCancel }) => {
  if (!replyTo) return null;

  const isReplyToMe = replyTo.senderId === uid;

  return (
    <View style={s.replyPreviewBar}>
      <View style={s.replyPreviewLine} />
      <View style={s.replyPreviewContent}>
        <Text style={s.replyPreviewName}>
          {isReplyToMe ? "You" : otherUserName}
        </Text>
        <Text style={s.replyPreviewText} numberOfLines={1}>
          {replyTo.text}
        </Text>
      </View>
      <TouchableOpacity onPress={onCancel} style={s.replyPreviewClose}>
        <Icon name="close" size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

// ─── Swipeable Message Row ───
const SwipeableMessage: React.FC<{
  children: React.ReactNode;
  onSwipeReply: () => void;
  onLongPress: (x: number, y: number) => void;
}> = ({ children, onSwipeReply, onLongPress }) => {
  const translateX = useSharedValue(0);
  const replyIconOpacity = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10000])
    .onUpdate((event) => {
      "worklet";
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -80);
        replyIconOpacity.value = Math.min(Math.abs(event.translationX) / 60, 1);
      }
    })
    .onEnd((event) => {
      "worklet";
      if (event.translationX < SWIPE_THRESHOLD) {
        runOnJS(onSwipeReply)();
      }
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      replyIconOpacity.value = withTiming(0, { duration: 200 });
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart((event) => {
      "worklet";
      runOnJS(onLongPress)(event.absoluteX, event.absoluteY);
    });

  const composedGesture = Gesture.Race(panGesture, longPressGesture);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const replyIconStyle = useAnimatedStyle(() => ({
    opacity: replyIconOpacity.value,
    transform: [{ scale: replyIconOpacity.value }],
  }));

  return (
    <View style={s.swipeableContainer}>
      {/* Reply icon behind the message */}
      <Animated.View style={[s.swipeReplyIcon, replyIconStyle]}>
        <View style={s.swipeReplyIconCircle}>
          <Icon name="corner-up-left" size={16} color={Colors.primary} />
        </View>
      </Animated.View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={animStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN CHAT SCREEN
// ═══════════════════════════════════════════════════════════
export default function ChatScreen() {
  const params = useLocalSearchParams<{
    chatId: string;
    otherUserId: string;
    otherUserName: string;
    otherPhoto?: string;
  }>();
  const { chatId, otherUserId, otherUserName } = params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uid, setUid] = useState("");
  const [myName, setMyName] = useState("");
  const [myPhoto, setMyPhoto] = useState("");
  const [otherPhoto, setOtherPhoto] = useState(params.otherPhoto || "");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [userRole, setUserRole] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const uidRef = useRef("");
  const inputRef = useRef<NativeTextInput>(null);

  // Rating state (farmer side)
  const [showRatingCard, setShowRatingCard] = useState(false);
  const [pendingRateRequest, setPendingRateRequest] = useState<any>(null);

  // Rate request sending state (technician side)
  const [sendingRateRequest, setSendingRateRequest] = useState(false);

  // Whether a rate request already exists (technician side — hide button if true)
  const [rateRequestAlreadySent, setRateRequestAlreadySent] = useState(false);

  // Reply state
  const [replyTo, setReplyTo] = useState<{
    id: string;
    text: string;
    senderId: string;
  } | null>(null);

  // Reaction popup state
  const [reactionPopup, setReactionPopup] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    message: ChatMessage | null;
  }>({ visible: false, position: { x: 0, y: 0 }, message: null });

  // Profile info modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [otherUserRole, setOtherUserRole] = useState("");
  const [otherUserEmail, setOtherUserEmail] = useState("");
  const [otherUserPhone, setOtherUserPhone] = useState("");

  useEffect(() => {
    if (!chatId) return;
    let unsubMessages: (() => void) | null = null;
    let unsubTyping: (() => void) | null = null;

    const init = async () => {
      const session = await getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUid(session.uid);
      uidRef.current = session.uid;
      setMyName(session.displayName || "Me");
      setUserRole(session.role || "farmer");

      // Fetch my photo from Firestore
      try {
        const myDoc = await firestore()
          .collection(Collections.USERS)
          .doc(session.uid)
          .get();
        if (myDoc.exists && myDoc.data()?.photoURL) {
          setMyPhoto(myDoc.data()!.photoURL);
        }
      } catch (e) {}

      // Fetch other user's REAL photo from Firestore
      if (otherUserId) {
        try {
          const otherDoc = await firestore()
            .collection(Collections.USERS)
            .doc(otherUserId)
            .get();
          if (otherDoc.exists) {
            const data = otherDoc.data()!;
            if (data.photoURL) setOtherPhoto(data.photoURL);
            if (data.role) setOtherUserRole(data.role);
            if (data.email) setOtherUserEmail(data.email);
            if (data.phone || data.phoneNumber)
              setOtherUserPhone(data.phone || data.phoneNumber || "");
          }
        } catch (e) {}
      }

      // Listen to messages
      unsubMessages = listenToMessages(chatId, (msgs) => {
        setMessages(msgs.reverse());
        setLoading(false);
      });

      // Mark messages as read
      markMessagesAsRead(chatId, session.uid);

      // Listen to typing indicator
      if (otherUserId) {
        unsubTyping = listenToTyping(chatId, otherUserId, (typing) => {
          setIsOtherTyping(typing);
        });
      }

      // Check for pending rate request (farmer side)
      if (session.role === "farmer" && chatId) {
        const pending = await getPendingRateRequest(chatId, session.uid);
        if (pending) {
          setPendingRateRequest(pending);
          setShowRatingCard(true);
        }
      }

      // Check if rate request already exists (technician side — hide button)
      if (session.role === "technician" && chatId) {
        const alreadySent = await hasExistingRateRequest(chatId, session.uid);
        setRateRequestAlreadySent(alreadySent);
      }
    };
    init();

    return () => {
      if (unsubMessages) unsubMessages();
      if (unsubTyping) unsubTyping();
      if (uid && chatId) setTyping(chatId, uid, false);
    };
  }, [chatId]);

  // ─── Typing sound: loop while other user is typing ───
  useEffect(() => {
    if (isOtherTyping) {
      startTypingSound();
    } else {
      stopTypingSound();
    }
    return () => {
      stopTypingSound();
    };
  }, [isOtherTyping]);

  useEffect(() => {
    if (uid && chatId && messages.length > 0) {
      markMessagesAsRead(chatId, uid);
    }
  }, [messages.length]);

  // Check for new rate requests when messages update (farmer side)
  useEffect(() => {
    if (userRole !== "farmer" || !chatId || !uid) return;
    const checkForRateRequest = async () => {
      const pending = await getPendingRateRequest(chatId, uid);
      if (
        pending &&
        (!pendingRateRequest || pending.id !== pendingRateRequest.id)
      ) {
        setPendingRateRequest(pending);
        setShowRatingCard(true);
      }
    };
    checkForRateRequest();
  }, [messages.length, userRole]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !chatId || !uid) return;
    setInputText("");
    setSending(true);
    setTyping(chatId, uid, false);
    try {
      if (replyTo) {
        await sendReplyMessage(chatId, uid, text, replyTo);
        setReplyTo(null);
      } else {
        await sendMessage(chatId, uid, text);
      }
      // Send FCM push notification to the other user with chat sound
      if (otherUserId) {
        await sendPushNotification(otherUserId, {
          title: `💬 ${myName || "Someone"}`,
          body: text.length > 100 ? text.substring(0, 100) + "..." : text,
          data: {
            type: "new_chat_message",
            chatId,
            senderId: uid,
            senderName: myName || "",
          },
        });
      }
    } catch (e: any) {
      console.error("Send error:", e);
    }
    setSending(false);
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (uid && chatId) setTyping(chatId, uid, text.length > 0);
  };

  // ─── Swipe Reply Handler ───
  const handleSwipeReply = useCallback((message: ChatMessage) => {
    setReplyTo({
      id: message.id,
      text: message.text,
      senderId: message.senderId,
    });
    inputRef.current?.focus();
  }, []);

  // ─── Reaction Handlers ───
  const handleLongPress = useCallback(
    (message: ChatMessage, x: number, y: number) => {
      setReactionPopup({ visible: true, position: { x, y }, message });
    },
    [],
  );

  const handleReactionSelect = useCallback(
    async (emoji: string) => {
      if (!reactionPopup.message || !chatId || !uid) return;
      const msg = reactionPopup.message;
      const currentReactions = msg.reactions || {};
      const emojiUsers = currentReactions[emoji] || [];

      if (emojiUsers.includes(uid)) {
        // Toggle off
        await removeReaction(chatId, msg.id, emoji, uid);
      } else {
        await addReaction(chatId, msg.id, emoji, uid);
      }
    },
    [reactionPopup.message, chatId, uid],
  );

  const handleReactionChipPress = useCallback(
    async (
      messageId: string,
      emoji: string,
      reactions: Record<string, string[]> | undefined,
    ) => {
      if (!chatId || !uid) return;
      const emojiUsers = reactions?.[emoji] || [];
      if (emojiUsers.includes(uid)) {
        await removeReaction(chatId, messageId, emoji, uid);
      } else {
        await addReaction(chatId, messageId, emoji, uid);
      }
    },
    [chatId, uid],
  );

  // ─── TASK #2: Technician sends rate request ───
  const handleSendRateRequest = async () => {
    if (!chatId || !uid || !otherUserId) return;
    setSendingRateRequest(true);
    try {
      // Check if technician has a completed appointment with this farmer
      const appointment = await getCompletedAppointment(uid, otherUserId);
      if (!appointment) {
        modalAlert(
          "No Appointment Found",
          "You can only send a rate request to farmers you have a confirmed appointment with.",
        );
        setSendingRateRequest(false);
        return;
      }

      await sendRateRequest({
        technicianId: uid,
        technicianName: myName,
        farmerId: otherUserId,
        farmerName: otherUserName || "Farmer",
        chatId,
        animalName: (appointment as any).animalName || "",
        animalPhoto: (appointment as any).animalPhoto || "",
        serviceType: (appointment as any).serviceType || "",
      });
      setRateRequestAlreadySent(true);
    } catch (e: any) {
      console.error("Rate request error:", e);
    }
    setSendingRateRequest(false);
  };

  // ─── TASK #2: Farmer submits rating ───
  const handleSubmitRating = async (rating: number) => {
    if (!pendingRateRequest || !chatId || !uid) return;
    try {
      await submitRating({
        rateRequestId: pendingRateRequest.id,
        rating,
        farmerId: uid,
        farmerName: myName,
        technicianId: otherUserId,
        technicianName: otherUserName || "Technician",
        chatId,
      });
      setShowRatingCard(false);
      setPendingRateRequest(null);
    } catch (e: any) {
      console.error("Rating submit error:", e);
    }
  };

  // Navigate back to the correct messages page based on role
  const handleBack = () => {
    if (userRole === "technician") {
      router.replace("/(technician)/messages");
    } else {
      router.replace("/(farmer)/messages");
    }
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateDivider = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-PH", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const shouldShowDateDivider = (index: number) => {
    if (index === messages.length - 1) return true;
    const current = messages[index];
    const next = messages[index + 1];
    if (!current.timestamp || !next.timestamp) return false;
    return (
      new Date(current.timestamp).toDateString() !==
      new Date(next.timestamp).toDateString()
    );
  };

  // Check if message is a rating message (shows stars visually)
  const isRatingMessage = (text: string) => text.startsWith("⭐ Rating:");
  const isRateRequestMessage = (text: string) =>
    text.startsWith("⭐ Rate Request");

  const renderMessage = ({
    item,
    index,
  }: {
    item: ChatMessage;
    index: number;
  }) => {
    const isMe = item.senderId !== "" && item.senderId === uid;
    const showDivider = shouldShowDateDivider(index);
    const isRating = isRatingMessage(item.text);
    const isRequest = isRateRequestMessage(item.text);

    return (
      <View>
        {showDivider && (
          <View style={s.dateDivider}>
            <Text style={s.dateDividerText}>
              {formatDateDivider(item.timestamp)}
            </Text>
          </View>
        )}
        <SwipeableMessage
          onSwipeReply={() => handleSwipeReply(item)}
          onLongPress={(x, y) => handleLongPress(item, x, y)}
        >
          <View
            style={[s.messageRow, isMe ? s.messageRowRight : s.messageRowLeft]}
          >
            {!isMe && (
              <Avatar
                name={otherUserName || "User"}
                size={30}
                imageUrl={otherPhoto || undefined}
              />
            )}
            <View style={{ maxWidth: "70%" }}>
              {/* Reply reference (if this message is a reply) */}
              {item.replyTo && (
                <View
                  style={[
                    s.replyRefContainer,
                    isMe ? s.replyRefContainerMe : s.replyRefContainerOther,
                  ]}
                >
                  <View style={s.replyRefLine} />
                  <View style={s.replyRefContent}>
                    <Text style={s.replyRefName}>
                      {item.replyTo.senderId === uid ? "You" : otherUserName}
                    </Text>
                    <Text style={s.replyRefText} numberOfLines={1}>
                      {item.replyTo.text}
                    </Text>
                  </View>
                </View>
              )}
              <View
                style={[
                  s.bubble,
                  isMe ? s.bubbleMe : s.bubbleOther,
                  (isRating || isRequest) && s.bubbleSpecial,
                ]}
              >
                {item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={s.messageImage}
                    contentFit="cover"
                  />
                )}

                {/* Special rendering for rating messages */}
                {isRating ? (
                  <View style={s.ratingMessageContent}>
                    <View style={s.ratingStarsDisplay}>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const ratingMatch = item.text.match(/\((\d)\/5\)/);
                        const ratingNum = ratingMatch
                          ? parseInt(ratingMatch[1])
                          : 0;
                        return (
                          <Text
                            key={star}
                            style={{
                              fontSize: 18,
                              color: star <= ratingNum ? "#FFD700" : "#CCC",
                            }}
                          >
                            {star <= ratingNum ? "★" : "☆"}
                          </Text>
                        );
                      })}
                    </View>
                    <Text
                      style={[
                        s.messageText,
                        isMe ? s.messageTextMe : s.messageTextOther,
                      ]}
                    >
                      {item.text.split("\n").slice(2).join("\n")}
                    </Text>
                  </View>
                ) : isRequest ? (
                  <View style={s.rateRequestContent}>
                    <View style={s.rateRequestHeader}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                          key={star}
                          name="star"
                          size={16}
                          color="#FFD700"
                        />
                      ))}
                    </View>
                    <Text
                      style={[
                        s.messageText,
                        isMe ? s.messageTextMe : s.messageTextOther,
                      ]}
                    >
                      {item.text.split("\n").slice(2).join("\n")}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      s.messageText,
                      isMe ? s.messageTextMe : s.messageTextOther,
                    ]}
                  >
                    {item.text}
                  </Text>
                )}

                <View style={s.messageFooter}>
                  <Text
                    style={[
                      s.messageTime,
                      isMe ? s.messageTimeMe : s.messageTimeOther,
                    ]}
                  >
                    {formatTime(item.timestamp)}
                  </Text>
                  {isMe && (
                    <Icon
                      name={item.read ? "check-circle" : "check"}
                      size={12}
                      color={item.read ? "#4CAF50" : "rgba(255,255,255,0.5)"}
                    />
                  )}
                </View>
              </View>

              {/* Reactions display */}
              <ReactionsDisplay
                reactions={item.reactions}
                onPress={(emoji) =>
                  handleReactionChipPress(item.id, emoji, item.reactions)
                }
                uid={uid}
              />
            </View>
            {isMe && (
              <Avatar
                name={myName || "Me"}
                size={30}
                imageUrl={myPhoto || undefined}
              />
            )}
          </View>
        </SwipeableMessage>
      </View>
    );
  };

  if (!chatId)
    return (
      <View style={s.center}>
        <Text style={{ color: Colors.textSecondary }}>No chat selected</Text>
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 25}
    >
      {/* Header */}
      <View style={s.header}>
        <Image
          source={require("../../../assets/images/technician/Emerald Eco Chat Waves.png")}
          style={s.headerBanner}
          contentFit="cover"
          pointerEvents="none"
        />
        <View style={s.headerIdentity}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <Icon
              name="chevron-right"
              size={22}
              color={Colors.white}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.headerTappable}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.9}
          >
            <Avatar
              name={otherUserName || "User"}
              size={48}
              imageUrl={otherPhoto || undefined}
            />
            <View style={s.headerInfo}>
              <Text style={s.headerName} numberOfLines={1}>
                {otherUserName || "Chat"}
              </Text>
              {isOtherTyping ? (
                <Text style={s.typingLabel}>typing...</Text>
              ) : (
                <Text style={s.onlineText}>Tap for info</Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.headerAction}
            disabled={!otherUserPhone}
            onPress={() =>
              otherUserPhone && Linking.openURL(`tel:${otherUserPhone}`)
            }
            accessibilityRole="button"
            accessibilityLabel="Call contact"
          >
            <Icon name="phone" size={21} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.headerAction}
            onPress={() => setShowProfileModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Contact options"
          >
            <MoreVertical size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {loading || !uid ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          extraData={uid}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.messagesList}
          ListEmptyComponent={
            <View style={s.emptyChat}>
              <Icon name="messages" size={48} color={Colors.textLight} />
              <Text style={s.emptyChatText}>No messages yet</Text>
              <Text style={s.emptyChatSubtext}>Say hello! 👋</Text>
            </View>
          }
        />
      )}

      {/* Floating Rating Card (farmer side) */}
      <RatingCard
        visible={showRatingCard}
        technicianName={otherUserName || "Technician"}
        animalName={pendingRateRequest?.animalName || ""}
        animalPhoto={pendingRateRequest?.animalPhoto || ""}
        serviceType={pendingRateRequest?.serviceType || ""}
        onSubmit={handleSubmitRating}
        onDismiss={() => setShowRatingCard(false)}
      />

      {/* Animated Typing Indicator */}
      {isOtherTyping && (
        <View style={s.typingRow}>
          <View style={s.typingBubble}>
            <View style={s.typingDots}>
              <TypingDot delay={0} />
              <TypingDot delay={150} />
              <TypingDot delay={300} />
            </View>
          </View>
        </View>
      )}

      {/* Pre-built Message Suggestion (Technician only) */}
      {userRole === "technician" && !rateRequestAlreadySent && (
        <View style={s.suggestionsRow}>
          <MessageSuggestion onPress={handleSendRateRequest} />
        </View>
      )}

      {/* Reply Preview */}
      <ReplyPreview
        replyTo={replyTo}
        otherUserName={otherUserName || "User"}
        myName={myName}
        uid={uid}
        onCancel={() => setReplyTo(null)}
      />

      {/* Input Bar */}
      <View style={s.inputBar}>
        <TextInput
          ref={inputRef}
          style={s.input}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textLight}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            s.sendBtn,
            (!inputText.trim() || sending) && s.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Icon name="send" size={20} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>

      {/* Reaction Popup */}
      <ReactionPopup
        visible={reactionPopup.visible}
        position={reactionPopup.position}
        onSelect={handleReactionSelect}
        onClose={() =>
          setReactionPopup({
            visible: false,
            position: { x: 0, y: 0 },
            message: null,
          })
        }
      />

      {/* Profile Info Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <Pressable
          style={s.profileModalOverlay}
          onPress={() => setShowProfileModal(false)}
        >
          <View
            style={s.profileModalContent}
            onStartShouldSetResponder={() => true}
          >
            {/* Close button */}
            <TouchableOpacity
              style={s.profileModalClose}
              onPress={() => setShowProfileModal(false)}
            >
              <Icon name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>

            {/* Avatar */}
            <Avatar
              name={otherUserName || "User"}
              size={80}
              imageUrl={otherPhoto || undefined}
            />

            {/* Name */}
            <Text style={s.profileModalName}>{otherUserName || "User"}</Text>

            {/* Role badge */}
            {otherUserRole ? (
              <View style={s.profileRoleBadge}>
                <Icon
                  name={
                    otherUserRole === "technician"
                      ? "med-stethoscope"
                      : "farmer"
                  }
                  size={14}
                  color={Colors.primary}
                />
                <Text style={s.profileRoleText}>
                  {otherUserRole === "technician"
                    ? "Technician"
                    : otherUserRole === "farmer"
                      ? "Farmer"
                      : otherUserRole}
                </Text>
              </View>
            ) : null}

            {/* Info rows */}
            <View style={s.profileInfoSection}>
              {otherUserEmail ? (
                <View style={s.profileInfoRow}>
                  <Icon name="mail" size={18} color={Colors.textSecondary} />
                  <Text style={s.profileInfoText}>{otherUserEmail}</Text>
                </View>
              ) : null}
              {otherUserPhone ? (
                <View style={s.profileInfoRow}>
                  <Icon name="phone" size={18} color={Colors.textSecondary} />
                  <Text style={s.profileInfoText}>{otherUserPhone}</Text>
                </View>
              ) : null}
            </View>

            {/* Chat ID (subtle) */}
            <Text style={s.profileSubtext}>
              Chat started with {otherUserName || "this user"}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F8F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#B4E6B8",
    width: "100%",
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0.8,
  },
  headerIdentity: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.24)",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "180deg" }],
  },
  headerInfo: { flex: 1, minWidth: 0 },
  headerName: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.white,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  typingLabel: {
    fontSize: FontSize.xs,
    color: "#D6F4DE",
    fontStyle: "italic",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  onlineText: {
    fontSize: FontSize.xs,
    color: "#D6F4DE",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  messageRow: {
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  messageRowRight: { justifyContent: "flex-end" },
  messageRowLeft: { justifyContent: "flex-start" },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    ...Shadow.light,
  },
  bubbleSpecial: { borderWidth: 1, borderColor: "#FFD700" },
  messageText: { fontSize: FontSize.md, lineHeight: 20 },
  messageTextMe: { color: Colors.white },
  messageTextOther: { color: Colors.text },
  messageImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  messageTime: { fontSize: 10 },
  messageTimeMe: { color: "rgba(255,255,255,0.7)" },
  messageTimeOther: { color: Colors.textLight },
  dateDivider: { alignItems: "center", marginVertical: Spacing.md },
  dateDividerText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  typingRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  typingBubble: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignSelf: "flex-start",
    ...Shadow.light,
  },
  typingDots: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    height: 16,
  },
  typingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.textSecondary,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: "#F0F2F5",
    borderRadius: 22,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === "ios" ? Spacing.md : Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: Colors.textLight },
  emptyChat: {
    alignItems: "center",
    paddingTop: 100,
    transform: [{ scaleY: -1 }],
  },
  emptyChatText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
  emptyChatSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: 4,
  },

  // ─── Pre-built Suggestions (above input, technician only) ───
  suggestionsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  suggestionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "#FFD700",
    backgroundColor: "#FFFDE7",
  },
  suggestionText: {
    fontSize: FontSize.sm,
    color: "#6D5B00",
    fontWeight: "600",
  },

  // ─── Rating Card (floating in chat, farmer side) ───
  ratingCardContainer: {
    position: "absolute",
    bottom: 100,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 100,
  },
  ratingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.heavy,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  ratingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  ratingCardTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    flex: 1,
  },
  ratingDismiss: { padding: 4 },
  ratingCardSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  ratingLabel: {
    textAlign: "center",
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  ratingAnimalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: "#F1F8E9",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  ratingAnimalImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  ratingAnimalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  ratingAnimalName: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  ratingAnimalService: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    marginTop: 1,
  },
  ratingSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  ratingSubmitBtnDisabled: { backgroundColor: Colors.textLight },
  ratingSubmitText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.white,
  },

  // ─── Rating message display ───
  ratingMessageContent: { alignItems: "center", paddingVertical: 4 },
  ratingStarsDisplay: { flexDirection: "row", gap: 2, marginBottom: 6 },
  rateRequestContent: { alignItems: "flex-start", paddingVertical: 4 },
  rateRequestHeader: { flexDirection: "row", gap: 2, marginBottom: 6 },

  // ─── Swipe Reply ───
  swipeableContainer: {
    position: "relative",
    overflow: "visible",
  },
  swipeReplyIcon: {
    position: "absolute",
    right: 8,
    top: "50%",
    marginTop: -14,
    zIndex: -1,
  },
  swipeReplyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
  },

  // ─── Reply Preview Bar (above input) ───
  replyPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  replyPreviewLine: {
    width: 3,
    height: "100%",
    minHeight: 32,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  replyPreviewClose: {
    padding: 4,
  },

  // ─── Reply Reference (inside message bubble) ───
  replyRefContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: 4,
    gap: 6,
  },
  replyRefContainerMe: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  replyRefContainerOther: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  replyRefLine: {
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  replyRefContent: {
    flex: 1,
  },
  replyRefName: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.accent,
    marginBottom: 1,
  },
  replyRefText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },

  // ─── Reaction Popup ───
  reactionOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  reactionPopup: {
    position: "absolute",
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 2,
    ...Shadow.heavy,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  reactionEmojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  reactionEmoji: {
    fontSize: 24,
  },

  // ─── Reactions Display (below bubble) ───
  reactionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.light,
  },
  reactionChipActive: {
    borderColor: Colors.primary,
    backgroundColor: "#E8F5E9",
  },
  reactionChipEmoji: {
    fontSize: 14,
  },
  reactionChipCount: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
  },

  // ─── Header Tappable Area ───
  headerTappable: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },

  // ─── Profile Info Modal ───
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileModalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: "85%",
    alignItems: "center",
    ...Shadow.heavy,
  },
  profileModalClose: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    padding: 4,
  },
  profileModalName: {
    fontSize: FontSize.xl || 20,
    fontWeight: "700",
    color: Colors.text,
    marginTop: Spacing.md,
  },
  profileRoleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  profileRoleText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "600",
  },
  profileInfoSection: {
    width: "100%",
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  profileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: "#F5F5F5",
    borderRadius: BorderRadius.lg,
  },
  profileInfoText: {
    fontSize: FontSize.md,
    color: Colors.text,
    flex: 1,
  },
  profileSubtext: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.lg,
  },
});

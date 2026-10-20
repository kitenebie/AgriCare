import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import Animated from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Avatar, Badge } from '@/components/ui';
import { Message } from '@/types';
import { useFadeInUp } from '@/hooks/useAnimatedEntry';

interface MessageCardProps {
  message: Message;
  index: number;
  onPress?: () => void;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, index, onPress }) => {
  const animatedStyle = useFadeInUp(index * 80);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.avatarContainer}>
          <Avatar name={message.senderName} size={48} />
          {message.unreadCount > 0 && <Badge count={message.unreadCount} />}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{message.senderName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {message.lastMessage}
          </Text>
        </View>
        <Text style={styles.time}>{message.time}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    position: 'relative',
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  lastMessage: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  time: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
});

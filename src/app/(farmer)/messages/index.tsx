import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { MessageCard } from '@/components/cards/MessageCard';
import { messages, notifications } from '@/data/mockData';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';

type MessageTab = 'chats' | 'notifications';

export default function MessagesScreen() {
  const [activeTab, setActiveTab] = useState<MessageTab>('chats');
  const headerAnim = useFadeIn(100);
  const contentAnim = useFadeInUp(200);

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <Animated.View style={[styles.header, headerAnim]}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chats' && styles.tabActive]}
            onPress={() => setActiveTab('chats')}
          >
            <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>
              Chats
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'notifications' && styles.tabActive]}
            onPress={() => setActiveTab('notifications')}
          >
            <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
              Notifications
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, contentAnim]}>
        {activeTab === 'chats' ? (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <MessageCard message={item} index={index} />
            )}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <NotificationItem notification={item} index={index} />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </View>
  );
}

interface NotificationItemProps {
  notification: { id: string; title: string; message: string; time: string; read: boolean };
  index: number;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, index }) => {
  const animatedStyle = useFadeInUp(index * 100);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.notifItem, !notification.read && styles.notifUnread]}
        activeOpacity={0.7}
      >
        <View style={styles.notifIcon}>
          <Icon name="bell" size={20} color={Colors.primary} />
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{notification.title}</Text>
          <Text style={styles.notifMessage} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={styles.notifTime}>{notification.time}</Text>
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  tab: {
    paddingBottom: Spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.white,
  },
  tabText: {
    fontSize: FontSize.lg,
    color: Colors.accent,
  },
  tabTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  notifUnread: {
    backgroundColor: '#E8F5E9',
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  notifTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  notifMessage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  notifTime: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
});

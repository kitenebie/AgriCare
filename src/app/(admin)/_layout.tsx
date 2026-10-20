import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize } from '@/constants/theme';
import { Icon, IconName } from '@/components/ui';

interface TabIconProps {
  iconName: IconName;
  label: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ iconName, label, focused }) => (
  <View style={styles.tabItem}>
    <Icon name={iconName} size={22} color={focused ? Colors.primary : Colors.tabInactive} />
    <Text
      numberOfLines={1}
      style={[styles.tabLabel, focused && styles.tabLabelActive]}
    >
      {label}
    </Text>
  </View>
);

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: bottomPadding,
            paddingTop: 6,
          },
        ],
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ tabBarIcon: ({ focused }) => <TabIcon iconName="home" label="Home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="forum"
        options={{ tabBarIcon: ({ focused }) => <TabIcon iconName="messages" label="Forum" focused={focused} /> }}
      />
      <Tabs.Screen
        name="livestock"
        options={{ tabBarIcon: ({ focused }) => <TabIcon iconName="hen" label="Livestock" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon iconName="profile" label="Profile" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  tabLabel: {
    fontSize: 10.5,
    color: Colors.tabInactive,
    marginTop: 3,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});

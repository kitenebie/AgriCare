import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import { Colors } from '@/constants/theme';

interface BadgeProps {
  count: number;
  size?: number;
}

export const Badge: React.FC<BadgeProps> = ({ count, size = 20 }) => {
  if (count <= 0) return null;

  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: size * 0.55 }]}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -4,
    right: -4,
  },
  text: {
    color: Colors.white,
    fontWeight: '700',
  },
});

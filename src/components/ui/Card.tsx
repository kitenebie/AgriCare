import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Shadow, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'filled';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'elevated' }) => {
  return <View style={[styles.base, styles[variant], style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.cardBackground,
  },
  elevated: {
    ...Shadow.light,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filled: {
    backgroundColor: Colors.surface,
  },
});

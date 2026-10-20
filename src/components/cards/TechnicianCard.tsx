import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import Animated from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Avatar } from '@/components/ui';
import { Icon } from '@/components/ui';
import { Technician } from '@/types';
import { useSlideInRight } from '@/hooks/useAnimatedEntry';

interface TechnicianCardProps {
  technician: Technician;
  index: number;
  onPress?: () => void;
}

export const TechnicianCard: React.FC<TechnicianCardProps> = ({ technician, index, onPress }) => {
  const animatedStyle = useSlideInRight(index * 100);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.7}>
        <Avatar name={technician.name} size={52} />
        <View style={styles.info}>
          <Text style={styles.name}>{technician.name}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>{technician.rating}</Text>
            <Icon name="star" size={12} color={Colors.star} />
            <Text style={styles.reviews}>({technician.reviewCount} reviews)</Text>
          </View>
          <Text style={styles.specializations} numberOfLines={1}>
            {technician.specializations.join(', ')}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.distance}>{technician.distance}</Text>
          <TouchableOpacity style={styles.viewButton} onPress={onPress}>
            <Text style={styles.viewButtonText}>View Profile</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadow.light,
  },
  content: {
    flexDirection: 'row',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  rating: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  star: {
    fontSize: FontSize.sm,
    color: Colors.star,
    marginLeft: 2,
  },
  reviews: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  specializations: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  distance: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  viewButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  viewButtonText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});

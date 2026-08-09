import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors, BorderRadius } from '@/constants/theme';
import { getInitials, getAvatarColor } from '@/utils/helpers';
import { Icon } from './Icon';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
  /** 'person' (default) shows face photo fallback, 'animal' shows paw icon fallback */
  type?: 'person' | 'animal';
}

// Generate a consistent avatar URL from name (same name = same photo always)
const getPersonAvatarUrl = (name: string, size: number): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash % 70) + 1;
  return `https://i.pravatar.cc/${size * 2}?img=${seed}`;
};

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 48, type = 'person' }) => {
  // If imageUrl provided, always use it
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  // For person type: generate face photo from pravatar
  if (type === 'person' && name) {
    const avatarUrl = getPersonAvatarUrl(name, size);
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  // For animal type: show paw icon with colored background
  if (type === 'animal') {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#E8F5E9',
          },
        ]}
      >
        <Icon name="paw" size={size * 0.5} color={Colors.primary} />
      </View>
    );
  }

  // Fallback: colored circle with initials
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getAvatarColor(name),
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.35 }]}>{getInitials(name)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: Colors.surface,
  },
  text: {
    color: Colors.white,
    fontWeight: '700',
  },
});

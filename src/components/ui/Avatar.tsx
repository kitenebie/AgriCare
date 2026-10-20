import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import { Image } from 'expo-image';
import { Colors, BorderRadius } from '@/constants/theme';
import { getInitials, getAvatarColor } from '@/utils/helpers';
import { Icon } from './Icon';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
  /** 'person' (default) shows initials fallback, 'animal' shows paw icon fallback */
  type?: 'person' | 'animal';
}

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 48, type = 'person' }) => {
  // If imageUrl provided, show real profile photo
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

  // Fallback: colored circle with initials (NO dummy pravatar photos)
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

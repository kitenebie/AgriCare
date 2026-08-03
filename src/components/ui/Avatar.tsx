import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors, BorderRadius } from '@/constants/theme';
import { getInitials, getAvatarColor } from '@/utils/helpers';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 48 }) => {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

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

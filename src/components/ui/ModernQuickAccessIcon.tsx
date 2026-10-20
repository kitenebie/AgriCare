import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AnnouncementMegaphone } from './AnnouncementMegaphone';
import { Icon, type IconName } from './Icon';

interface Tone {
  start: string;
  end: string;
}

const TONES: Partial<Record<IconName, Tone>> = {
  calendar: { start: '#38BDF8', end: '#2563EB' },
  clipboard: { start: '#22C55E', end: '#15803D' },
  'health-check': { start: '#FB7185', end: '#E11D48' },
  paw: { start: '#A78BFA', end: '#7C3AED' },
  pencil: { start: '#2DD4BF', end: '#0F766E' },
  farmer: { start: '#4ADE80', end: '#15803D' },
  technician: { start: '#60A5FA', end: '#1D4ED8' },
  'user-cog': { start: '#2DD4BF', end: '#0F766E' },
  profile: { start: '#60A5FA', end: '#2563EB' },
  lock: { start: '#818CF8', end: '#4338CA' },
  logout: { start: '#FB7185', end: '#BE123C' },
  'shield-alert': { start: '#FB7185', end: '#BE123C' },
  alert: { start: '#FB923C', end: '#C2410C' },
  logs: { start: '#94A3B8', end: '#475569' },
  messages: { start: '#818CF8', end: '#4F46E5' },
  'messages-square': { start: '#818CF8', end: '#4F46E5' },
  map: { start: '#34D399', end: '#047857' },
  hen: { start: '#FBBF24', end: '#D97706' },
  cow: { start: '#FBBF24', end: '#D97706' },
  search: { start: '#38BDF8', end: '#2563EB' },
  star: { start: '#FBBF24', end: '#D97706' },
  bell: { start: '#FB7185', end: '#E11D48' },
};

const DEFAULT_TONE: Tone = { start: '#4ADE80', end: '#15803D' };

interface ModernQuickAccessIconProps {
  name: IconName;
  size?: number;
}

/** Gradient tile used by all Quick Access actions. */
export function ModernQuickAccessIcon({ name, size = 56 }: ModernQuickAccessIconProps) {
  const tone = name === 'megaphone' ? { start: '#FFF7ED', end: '#FFEDD5' } : TONES[name] ?? DEFAULT_TONE;
  const gradientId = `quick-access-${name}`;
  const iconSize = Math.round(size * 0.46);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: Math.round(size * 0.31) }]}>
      <Svg style={StyleSheet.absoluteFill} width={size} height={size} viewBox="0 0 56 56">
        <Defs>
          <LinearGradient id={gradientId} x1="5" y1="4" x2="52" y2="55" gradientUnits="userSpaceOnUse">
            <Stop stopColor={tone.start} />
            <Stop offset="1" stopColor={tone.end} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="56" height="56" rx="17" fill={`url(#${gradientId})`} />
        {name !== 'megaphone' ? <Rect x="7" y="7" width="42" height="15" rx="7.5" fill="#FFFFFF" opacity="0.14" /> : null}
      </Svg>
      {name === 'megaphone' ? (
        <AnnouncementMegaphone size={Math.round(size * 0.66)} />
      ) : (
        <Icon name={name} size={iconSize} color="#FFFFFF" strokeWidth={2.15} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
});

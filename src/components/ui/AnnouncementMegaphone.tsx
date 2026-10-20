import React from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface AnnouncementMegaphoneProps {
  size?: number;
}

/** A filled, high-contrast announcement icon for Quick Access cards. */
export function AnnouncementMegaphone({ size = 32 }: AnnouncementMegaphoneProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="announcementHorn" x1="12" y1="12" x2="37" y2="37" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#FBBF24" />
          <Stop offset="1" stopColor="#EA580C" />
        </LinearGradient>
        <LinearGradient id="announcementHandle" x1="20" y1="28" x2="30" y2="42" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#F97316" />
          <Stop offset="1" stopColor="#C2410C" />
        </LinearGradient>
      </Defs>
      <Path d="M10.6 21.2c0-2.5 2-4.5 4.5-4.5h4.6l13.5-7.1c1.6-.8 3.5.3 3.5 2.1v23.1c0 1.8-1.9 2.9-3.5 2.1l-13.5-7.1h-4.6c-2.5 0-4.5-2-4.5-4.5v-4.1Z" fill="url(#announcementHorn)" />
      <Path d="m19.3 29.7 3.5 10.1c.5 1.5-.6 3.1-2.2 3.1h-2.4c-1 0-1.9-.7-2.2-1.7l-3.9-11.4h7.2Z" fill="url(#announcementHandle)" />
      <Path d="M20 17.1v12.8" stroke="#FFF7ED" strokeWidth="2.2" strokeLinecap="round" opacity=".7" />
      <Path d="M40 17.2c2.1 1.8 3.2 4.1 3.2 6.8s-1.1 5-3.2 6.8M40.2 11.6c3.8 3.2 5.8 7.3 5.8 12.4s-2 9.2-5.8 12.4" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

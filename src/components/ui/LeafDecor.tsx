import React from 'react';
import Svg, { Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';

interface LeafDecorProps {
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
}

export const LeafDecor: React.FC<LeafDecorProps> = ({
  width = 160,
  height = 160,
  color = '#2E7D32',
  opacity = 0.14,
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200" fill="none">
      <G opacity={opacity}>
        {/* Main leaf shape */}
        <Path
          d="M 180 190 C 110 180, 20 130, 30 30 C 110 20, 170 80, 180 190 Z"
          fill={color}
        />
        {/* Main Stem */}
        <Path
          d="M 180 190 C 130 140, 80 80, 30 30"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Secondary veins */}
        <Path
          d="M 90 100 C 115 90, 140 95, 150 100"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <Path
          d="M 70 75 C 95 65, 120 70, 130 75"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <Path
          d="M 120 130 C 145 120, 165 125, 172 130"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Small overlapping leaf */}
        <Path
          d="M 195 130 C 140 120, 80 80, 90 20 C 140 15, 185 50, 195 130 Z"
          fill={color}
        />
        <Path
          d="M 195 130 C 150 90, 110 50, 90 20"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};

export const HeaderLeafPattern: React.FC<{ width?: number; height?: number }> = ({
  width = 280,
  height = 240,
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 240" fill="none">
      <Defs>
        <LinearGradient id="headerLeafGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.04" />
        </LinearGradient>
      </Defs>
      <G>
        {/* Huge Primary Leaf Background overlay */}
        <Path
          d="M 280 0 C 160 20, 80 110, 120 230 C 210 240, 270 170, 280 0 Z"
          fill="url(#headerLeafGrad)"
        />
        {/* Main Central Vein */}
        <Path
          d="M 280 0 C 200 70, 140 140, 120 230"
          stroke="rgba(255, 255, 255, 0.22)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Lateral Veins */}
        <Path
          d="M 215 55 C 240 75, 260 85, 275 90"
          stroke="rgba(255, 255, 255, 0.16)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Path
          d="M 175 105 C 205 130, 235 140, 255 145"
          stroke="rgba(255, 255, 255, 0.16)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Path
          d="M 145 155 C 175 180, 205 190, 225 195"
          stroke="rgba(255, 255, 255, 0.16)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Secondary Upper Overlapping Leaf */}
        <Path
          d="M 280 110 C 210 100, 160 40, 180 0 C 230 0, 270 40, 280 110 Z"
          fill="rgba(255, 255, 255, 0.08)"
        />
        <Path
          d="M 280 110 C 240 70, 200 35, 180 0"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Bottom Accent Curved Leaf Tip */}
        <Path
          d="M 280 240 C 230 220, 180 180, 200 130 C 240 135, 275 180, 280 240 Z"
          fill="rgba(255, 255, 255, 0.06)"
        />
        <Path
          d="M 280 240 C 245 200, 215 165, 200 130"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};

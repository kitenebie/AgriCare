/**
 * MapView Component — MapLibre GL with OpenStreetMap tiles
 * Falls back to a WebView-based map if MapLibre crashes
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, PermissionsAndroid } from 'react-native';
import { useFontScale, AppText as Text } from '@/components/ui/FontScale';
import { WebView } from 'react-native-webview';
import { Colors, BorderRadius, Shadow } from '@/constants/theme';
import { Technician } from '@/types';

interface MapViewProps {
  technicians: Technician[];
  onMarkerPress?: (technician: Technician) => void;
  userLocation?: { latitude: number; longitude: number };
}

export const MapViewComponent: React.FC<MapViewProps> = ({
  technicians,
  onMarkerPress,
  userLocation = { latitude: 14.8527, longitude: 120.8120 },
}) => {
  const { scale } = useFontScale();
  // Build Leaflet HTML map with markers
  const markers = technicians.map(t => `
    L.marker([${t.latitude}, ${t.longitude}])
      .addTo(map)
      .bindPopup('<b>${t.name.replace(/'/g, "\\'")}</b><br>${(t.specializations || []).join(", ").replace(/'/g, "\\'")}');
  `).join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
    .custom-marker {
      background: #1B5E20;
      border: 3px solid white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${14 * scale}px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${userLocation.latitude}, ${userLocation.longitude}], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // User location marker
    L.circleMarker([${userLocation.latitude}, ${userLocation.longitude}], {
      radius: 8,
      fillColor: '#2196F3',
      color: '#fff',
      weight: 3,
      fillOpacity: 1
    }).addTo(map).bindPopup('You are here');

    // Technician markers
    ${markers}
  </script>
</body>
</html>`;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.map}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});

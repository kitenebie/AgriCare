/**
 * MapLibre Map Component
 * 
 * Uses MapLibre GL with free OpenStreetMap / Leaflet-style tiles.
 * No API key required.
 * 
 * Install: npx expo install @maplibre/maplibre-react-native
 * 
 * Usage:
 * <MapViewComponent
 *   technicians={technicians}
 *   onMarkerPress={(technician) => console.log(technician)}
 * />
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Shadow } from '@/constants/theme';
import { Technician } from '@/types';

// Free OSM raster tile style (no API key needed)
const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster' as const,
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// ─── UNCOMMENT WHEN @maplibre/maplibre-react-native IS INSTALLED ───
// import MapLibreGL from '@maplibre/maplibre-react-native';
//
// // MapLibre is free & open-source, no token needed
// MapLibreGL.setAccessToken(null);

interface MapViewProps {
  technicians: Technician[];
  onMarkerPress?: (technician: Technician) => void;
  userLocation?: { latitude: number; longitude: number };
}

export const MapViewComponent: React.FC<MapViewProps> = ({
  technicians,
  onMarkerPress,
  userLocation = { latitude: 14.6042, longitude: 120.9822 },
}) => {
  // ─── MAPLIBRE + OSM TILES IMPLEMENTATION (uncomment when ready) ───
  // return (
  //   <MapLibreGL.MapView
  //     style={styles.map}
  //     styleJSON={JSON.stringify(OSM_STYLE)}
  //     logoEnabled={false}
  //     attributionEnabled={true}
  //   >
  //     <MapLibreGL.Camera
  //       zoomLevel={13}
  //       centerCoordinate={[userLocation.longitude, userLocation.latitude]}
  //       animationDuration={1000}
  //     />
  //
  //     {/* User Location */}
  //     <MapLibreGL.UserLocation visible animated />
  //
  //     {/* Technician Markers */}
  //     {technicians.map((tech) => (
  //       <MapLibreGL.MarkerView
  //         key={tech.id}
  //         coordinate={[tech.longitude, tech.latitude]}
  //       >
  //         <TouchableOpacity
  //           style={styles.marker}
  //           onPress={() => onMarkerPress?.(tech)}
  //         >
  //           <View style={styles.markerDot}>
  //             <Text style={styles.markerInitial}>{tech.name[0]}</Text>
  //           </View>
  //           <Text style={styles.markerLabel}>{tech.distance}</Text>
  //         </TouchableOpacity>
  //       </MapLibreGL.MarkerView>
  //     ))}
  //   </MapLibreGL.MapView>
  // );

  // ─── PLACEHOLDER (remove when MapLibre is configured) ───
  return (
    <View style={styles.placeholder}>
      <View style={styles.placeholderContent}>
        {technicians.map((tech, i) => (
          <TouchableOpacity
            key={tech.id}
            style={[
              styles.fakeMarker,
              { top: 30 + i * 55, left: 40 + i * 70 },
            ]}
            onPress={() => onMarkerPress?.(tech)}
          >
            <View style={styles.fakeMarkerDot}>
              <Text style={styles.fakeMarkerText}>{tech.name[0]}</Text>
            </View>
            <Text style={styles.fakeDistance}>{tech.distance}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.userDot} />
      </View>
      <Text style={styles.placeholderText}>
        MapLibre GL + OpenStreetMap Tiles{'\n'}
        npx expo install @maplibre/maplibre-react-native
      </Text>
    </View>
  );
};

// Export the style for external use if needed
export { OSM_STYLE };

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  placeholderContent: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    position: 'absolute',
    bottom: 12,
  },
  fakeMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  fakeMarkerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    ...Shadow.medium,
  },
  fakeMarkerText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  fakeDistance: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  userDot: {
    position: 'absolute',
    top: '50%',
    right: '35%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    borderWidth: 3,
    borderColor: Colors.white,
    ...Shadow.light,
  },
  marker: {
    alignItems: 'center',
  },
  markerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    ...Shadow.medium,
  },
  markerInitial: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  markerLabel: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    backgroundColor: Colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    ...Shadow.light,
  },
});

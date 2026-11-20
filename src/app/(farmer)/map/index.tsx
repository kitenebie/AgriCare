import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/FontScale';
import Animated from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { router, useFocusEffect } from 'expo-router';
import { Camera, CircleLayer, LineLayer, MapView, MarkerView, RasterLayer, RasterSource, ShapeSource, type CameraRef } from '@maplibre/maplibre-react-native';
import { PHILIPPINES_MAP_BOUNDS } from '@/constants/map';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { MapUserProfileDrawer, type MapProfileUser } from '@/components/map/MapUserProfileDrawer';
import MapServiceRequestDetailsDrawer from '@/components/map/MapServiceRequestDetailsDrawer';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';
import { getOrCreateChatRoom } from '@/services/chatService';
import { isLocationFresh, listenToUserLocation, listenToUsersLocations, type UserLocation } from '@/services/locationService';
import { listenToHeartbeatsByRole, type UserHeartbeat } from '@/services/heartbeat';
import { getMapTileSources, type MapTileSource } from '@/services/mapConfigService';
import { formatDrivingDistance, formatDrivingDuration, getDrivingRoute, type DrivingRoute } from '@/services/routingService';

interface TechAppointment {
  id: string;
  technicianId: string;
  technicianName: string;
  serviceType: string;
  animalName: string;
  animalType?: string;
  animalBreed?: string;
  animalQuantity?: number | string;
  date: string;
  time: string;
  status: string;
  appointmentLatitude: number | null;
  appointmentLongitude: number | null;
  responderLatitude: number | null;
  responderLongitude: number | null;
  location: string;
  photoURL: string;
  description?: string;
}
type MapTechnician = MapProfileUser;

// Farmer default location (Bulacan area)
const DEFAULT_LOCATION = { latitude: 14.8527, longitude: 120.8120 };

const EMPTY_MAP_STYLE = { version: 8, sources: {}, layers: [] };
const OSM_FALLBACK: MapTileSource = {
  id: 'openstreetmap-fallback',
  displayName: 'OpenStreetMap fallback',
  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  apiKey: null,
  attribution: '© OpenStreetMap contributors',
};
const hasValidCoordinates = (latitude: unknown, longitude: unknown) =>
  typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
  typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
const getRequestStatus = (appointment: TechAppointment, today: string) => appointment.date && appointment.date < today
  ? { label: 'Overdue', color: '#DC2626', background: '#FEE2E2' }
  : appointment.status === 'pending'
    ? { label: 'Pending', color: '#F59E0B', background: '#FEF3C7' }
    : { label: 'Accepted', color: '#16A34A', background: '#DCFCE7' };

export default function FarmerMapScreen() {
  const cameraRef = useRef<CameraRef>(null);
  const returnToFarmerRef = useRef(false);
  const [appointments, setAppointments] = useState<TechAppointment[]>([]);
  const [technicians, setTechnicians] = useState<MapTechnician[]>([]);
  const [technicianLocations, setTechnicianLocations] = useState<Record<string, UserHeartbeat>>({});
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');
  const [farmerLocation, setFarmerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [profilePhotoURL, setProfilePhotoURL] = useState('');
  const [mapTileSources, setMapTileSources] = useState<MapTileSource[]>([]);
  const [mapSourceIndex, setMapSourceIndex] = useState(0);
  const [mapErrorMessage, setMapErrorMessage] = useState('');
  const [loadedMapKey, setLoadedMapKey] = useState('');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<TechAppointment | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [profileDrawerVisible, setProfileDrawerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appointmentFilter, setAppointmentFilter] = useState<'All' | 'Upcoming' | 'Overdue'>('All');
  const [drivingRoute, setDrivingRoute] = useState<DrivingRoute | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const headerAnim = useFadeIn(100);
  const listAnim = useFadeInUp(300);

  useEffect(() => {
    const stopProfiles = firestore().collection(Collections.PUBLIC_PROFILES).where('role', '==', 'technician').onSnapshot(snap => {
      setTechnicians(snap.docs.filter(doc => doc.data()?.status === 'active').map(doc => ({ ...doc.data(), id: doc.id } as MapTechnician)));
    });
    const stopLocations = listenToHeartbeatsByRole('technician', setTechnicianLocations);
    return () => { stopProfiles(); stopLocations(); };
  }, []);

  useEffect(() => {
    let unsub: () => void = () => {};
    let latestSnapshot = 0;
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);

      let farmerAddress = '';
      // Get farmer's own location
      const userDoc = await firestore().collection(Collections.USERS).doc(session.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        farmerAddress = typeof data?.location === 'string' ? data.location.trim() : '';
        setProfilePhotoURL(data?.photoURL || '');
        if (data && hasValidCoordinates(data.latitude, data.longitude)) {
          setFarmerLocation({ latitude: data.latitude, longitude: data.longitude });
        }
      }

      // Listen to confirmed appointments for this farmer
      unsub = firestore()
        .collection(Collections.APPOINTMENTS)
        .where('farmerId', '==', session.uid)
        .onSnapshot(
          async (snap) => {
            const snapshotVersion = ++latestSnapshot;
            const apptDocs = snap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter((appointment: any) => appointment.status === 'pending' || appointment.status === 'confirmed');

            // Keep the booking-time GPS separately from the technician's live GPS.
            // The appointment pin must never move when the responder moves.
            const techData: TechAppointment[] = await Promise.all(
              apptDocs.map(async (appt: any) => {
                const hasSavedAppointmentLocation = hasValidCoordinates(
                  appt.appointmentLatitude,
                  appt.appointmentLongitude
                );
                const hasLegacyAppointmentLocation = hasValidCoordinates(appt.latitude, appt.longitude);
                const appointmentLatitude = hasSavedAppointmentLocation
                  ? appt.appointmentLatitude
                  : hasLegacyAppointmentLocation ? appt.latitude : null;
                const appointmentLongitude = hasSavedAppointmentLocation
                  ? appt.appointmentLongitude
                  : hasLegacyAppointmentLocation ? appt.longitude : null;
                let location = farmerAddress || appt.location || '';
                let photoURL = '';

                // Read technician display details only. Live location is subscribed
                // below and saved into responderLatitude/responderLongitude.
                if (appt.technicianId) {
                  try {
                    const techDoc = await firestore().collection(Collections.PUBLIC_PROFILES).doc(appt.technicianId).get();
                    if (techDoc.exists) {
                      const td = techDoc.data();
                      if (td?.photoURL) photoURL = td.photoURL;
                    }
                  } catch (e) {}
                }

                return {
                  id: appt.id,
                  technicianId: appt.technicianId || '',
                  technicianName: appt.technicianName || 'Technician',
                  serviceType: appt.serviceType || '',
                  animalName: appt.animalName || '',
                  animalType: appt.animalType || '',
                  animalBreed: appt.animalBreed || '',
                  animalQuantity: appt.animalQuantity,
                  date: appt.date || '',
                  time: appt.time || '',
                  status: appt.status || '',
                  appointmentLatitude,
                  appointmentLongitude,
                  responderLatitude: null,
                  responderLongitude: null,
                  location,
                  photoURL,
                  description: appt.description || '',
                };
              })
            );

            if (snapshotVersion !== latestSnapshot) return;
            techData.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
            setAppointments(techData);
            setLoading(false);
          },
          () => setLoading(false)
        );
    };
    load();
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;

    const stopListeningToFarmer = listenToUserLocation(uid, (location) => {
      if (location && location.isActive && hasValidCoordinates(location.latitude, location.longitude)) {
        setFarmerLocation({ latitude: location.latitude, longitude: location.longitude });
      }
    });
    const technicianIds = appointments.map((appointment) => appointment.technicianId).filter(Boolean);
    const stopListeningToTechnicians = technicianIds.length
      ? listenToUsersLocations(technicianIds, (locations) => {
          setAppointments((currentAppointments) => currentAppointments.map((appointment) => {
            const location = locations[appointment.technicianId];
            return location && hasValidCoordinates(location.latitude, location.longitude)
              ? {
                  ...appointment,
                  responderLatitude: location.latitude,
                  responderLongitude: location.longitude,
                }
              : appointment;
          }));
        })
      : () => {};

    return () => {
      stopListeningToFarmer();
      stopListeningToTechnicians();
    };
  }, [uid, appointments.map((appointment) => appointment.technicianId).join('|')]);

  const today = new Date().toISOString().split('T')[0];
  const search = searchQuery.trim().toLowerCase();
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = `${appointment.technicianName} ${appointment.serviceType} ${appointment.animalName}`.toLowerCase().includes(search);
    const matchesFilter = appointmentFilter === 'All' || (appointmentFilter === 'Overdue'
      ? Boolean(appointment.date && appointment.date < today)
      : Boolean(appointment.date && appointment.date >= today));
    return matchesSearch && matchesFilter;
  });
  const visibleAppointments = selectedAppointmentId
    ? filteredAppointments.filter((appointment) => appointment.id === selectedAppointmentId)
    : filteredAppointments;
  const onlineTechnicians = technicians.filter(technician => !!technicianLocations[technician.id]).map(technician => ({ ...technician, isOnline: true }));
  const liveTechnicians = onlineTechnicians.flatMap(technician => {
    const location = technicianLocations[technician.id];
    // shortcut: use last-known coordinates while heartbeat is fresh; discard them when heartbeat expires.
    return location?.isActive && hasValidCoordinates(location.latitude, location.longitude)
      ? [{ ...technician, latitude: location.latitude, longitude: location.longitude }]
      : [];
  });
  const onlineTechnicianCount = onlineTechnicians.length;
  const matchesSearch = (technician: MapTechnician) => !search || search.split(/\s+/).every(term => technician.displayName.toLowerCase().includes(term));
  const filteredTechnicians = onlineTechnicians.filter(matchesSearch);
  const mappedTechnicians = liveTechnicians.filter(matchesSearch);
  const searchMatch = search && mappedTechnicians.length === 1 ? mappedTechnicians[0] : null;
  const searchMatchId = searchMatch?.id;
  const searchMatchLatitude = searchMatch?.latitude;
  const searchMatchLongitude = searchMatch?.longitude;

  const selectedTechnician = onlineTechnicians.find(technician => technician.id === selectedTechnicianId);
  const selectedLiveTechnician = liveTechnicians.find(technician => technician.id === selectedTechnicianId);
  const routeAppointment = visibleAppointments.find((appointment) =>
    hasValidCoordinates(appointment.appointmentLatitude, appointment.appointmentLongitude) &&
    hasValidCoordinates(appointment.responderLatitude, appointment.responderLongitude)
  );

  useEffect(() => {
    let isCurrent = true;

    if (!routeAppointment) {
      setDrivingRoute(null);
      setIsRouteLoading(false);
      return () => { isCurrent = false; };
    }

    setIsRouteLoading(true);
    const timeout = setTimeout(() => {
      getDrivingRoute(
        {
          latitude: routeAppointment.responderLatitude!,
          longitude: routeAppointment.responderLongitude!,
        },
        {
          latitude: routeAppointment.appointmentLatitude!,
          longitude: routeAppointment.appointmentLongitude!,
        }
      ).then((route) => {
        if (!isCurrent) return;
        setDrivingRoute(route);
        setIsRouteLoading(false);
      });
    }, 300);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [
    routeAppointment?.id,
    routeAppointment?.responderLatitude,
    routeAppointment?.responderLongitude,
    routeAppointment?.appointmentLatitude,
    routeAppointment?.appointmentLongitude,
  ]);

  useFocusEffect(
    useCallback(() => {
      let isFocused = true;

      getMapTileSources().then((sources) => {
        if (isFocused) {
          setMapTileSources(sources);
          setMapSourceIndex(0);
        }
      });

      return () => {
        isFocused = false;
      };
    }, [])
  );

  const handleMessage = async (technicianId: string, technicianName: string, photoURL = '') => {
    if (!technicianId || !uid) return;
    try {
      const chatId = await getOrCreateChatRoom(uid, technicianId);
      router.push({ pathname: '/(farmer)/messages/chat', params: { chatId, otherUserId: technicianId, otherUserName: technicianName, otherPhoto: photoURL } });
    } catch (e) {
      console.warn('Failed to open chat:', e);
    }
  };

  const getDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr < today) return 'Overdue';
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const getDateColor = (dateStr: string) => {
    if (!dateStr) return Colors.textSecondary;
    const today = new Date().toISOString().split('T')[0];
    if (dateStr < today) return '#EF4444';
    if (dateStr === today) return '#F59E0B';
    return '#10B981';
  };

  const allTileSources = [...mapTileSources, OSM_FALLBACK];
  const activeTileSource = allTileSources[Math.min(mapSourceIndex, allTileSources.length - 1)];
  const mapKey = `${activeTileSource.id}-${selectedTechnicianId || liveTechnicians[0]?.id || 'self'}-${isMapExpanded ? 'full' : 'card'}`;
  const tileUrlTemplate = activeTileSource.urlTemplate.replaceAll(
    '{key}',
    encodeURIComponent(activeTileSource.apiKey || '')
  );
  useEffect(() => {
    if (search) {
      returnToFarmerRef.current = true;
      if (loadedMapKey !== mapKey || !searchMatchId || searchMatchLatitude == null || searchMatchLongitude == null) return;
    } else {
      if (!returnToFarmerRef.current || loadedMapKey !== mapKey || !farmerLocation) return;
      returnToFarmerRef.current = false;
      cameraRef.current?.setCamera({
        centerCoordinate: [farmerLocation.longitude, farmerLocation.latitude],
        zoomLevel: 13,
        animationDuration: 1000,
        animationMode: 'flyTo',
      });
      return;
    }
    cameraRef.current?.setCamera({
      centerCoordinate: [searchMatchLongitude, searchMatchLatitude],
      zoomLevel: 14,
      animationDuration: 1000,
      animationMode: 'flyTo',
    });
  }, [loadedMapKey, mapKey, search, searchMatchId, searchMatchLatitude, searchMatchLongitude, farmerLocation]);

  const mapPoints = {
    type: 'FeatureCollection' as const,
    features: [
      ...(farmerLocation ? [{
        type: 'Feature' as const,
        properties: { role: 'farmer' },
        geometry: { type: 'Point' as const, coordinates: [farmerLocation.longitude, farmerLocation.latitude] },
      }] : []),
      ...visibleAppointments.filter((appointment) => hasValidCoordinates(appointment.responderLatitude, appointment.responderLongitude)).map((appointment) => ({
        type: 'Feature' as const,
        properties: { role: 'responder' },
        geometry: {
          type: 'Point' as const,
          coordinates: [appointment.responderLongitude!, appointment.responderLatitude!],
        },
      })),
      ...mappedTechnicians.map(technician => ({
        type: 'Feature' as const,
        properties: { role: 'technician' },
        geometry: { type: 'Point' as const, coordinates: [technician.longitude!, technician.latitude!] },
      })),
    ],
  };
  const appointmentWithLocation = visibleAppointments.find((appointment) => hasValidCoordinates(appointment.appointmentLatitude, appointment.appointmentLongitude));
  const responderWithLocation = visibleAppointments.find((appointment) => hasValidCoordinates(appointment.responderLatitude, appointment.responderLongitude));
  const mapCenter = !search && farmerLocation
    ? farmerLocation
    : selectedLiveTechnician
    ? { latitude: selectedLiveTechnician.latitude, longitude: selectedLiveTechnician.longitude }
    : liveTechnicians[0]
    ? { latitude: liveTechnicians[0].latitude, longitude: liveTechnicians[0].longitude }
    : routeAppointment
    ? { latitude: routeAppointment.appointmentLatitude!, longitude: routeAppointment.appointmentLongitude! }
    : appointmentWithLocation
      ? { latitude: appointmentWithLocation.appointmentLatitude!, longitude: appointmentWithLocation.appointmentLongitude! }
    : responderWithLocation
      ? { latitude: responderWithLocation.responderLatitude!, longitude: responderWithLocation.responderLongitude! }
      : farmerLocation ?? liveTechnicians[0] ?? DEFAULT_LOCATION;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <Animated.View style={[s.header, headerAnim]}>
        <View pointerEvents="none" style={s.headerArt}><Image source={require('../../../../assets/images/technician/Green Map Pin Landscape.png')} style={StyleSheet.absoluteFill} resizeMode="cover" /></View>
        <View style={s.headerIdentity}>
          <Text style={s.headerTitle}>Technician Locations</Text>
          <View style={s.headerSubtitleRow}><View style={s.activeDot} /><Text style={s.headerSubtitle}>{liveTechnicians.length} technician{liveTechnicians.length !== 1 ? 's' : ''} sharing location</Text></View>
        </View>
      </Animated.View>

      {/* Map */}
      <View style={[s.mapContainer, isMapExpanded && s.mapContainerExpanded]}>
        <MapView
          key={mapKey}
          mapStyle={EMPTY_MAP_STYLE}
          style={s.map}
          attributionEnabled
          logoEnabled={false}
          onDidFinishLoadingMap={() => { setLoadedMapKey(mapKey); setMapErrorMessage(''); }}
          onDidFailLoadingMap={() => {
            if (mapSourceIndex < allTileSources.length - 1) {
              setMapSourceIndex((index) => index + 1);
              return;
            }
            setMapErrorMessage('Map tiles could not be loaded. Check your internet connection and map source settings.');
          }}
        >
          <Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [mapCenter.longitude!, mapCenter.latitude!],
              zoomLevel: liveTechnicians.length > 0 ? 10 : filteredAppointments.length > 0 ? 11 : 13,
            }}
            minZoomLevel={5}
            maxBounds={PHILIPPINES_MAP_BOUNDS}
          />
          <RasterSource
            id={`tiles-${activeTileSource.id}`}
            tileUrlTemplates={[tileUrlTemplate]}
            tileSize={256}
            minZoomLevel={1}
            maxZoomLevel={20}
            attribution={activeTileSource.attribution}
          >
            <RasterLayer id={`tiles-layer-${activeTileSource.id}`} />
          </RasterSource>
          {drivingRoute ? (
            <ShapeSource
              id="driving-route"
              shape={{
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: drivingRoute.coordinates },
              }}
            >
              <LineLayer
                id="driving-route-line"
                style={{ lineColor: '#1565C0', lineWidth: 5, lineOpacity: 0.9 }}
              />
            </ShapeSource>
          ) : null}
          <ShapeSource id="map-points" shape={mapPoints}>
            <CircleLayer
              id="map-points-layer"
              style={{
                circleRadius: 8,
                circleColor: ['match', ['get', 'role'], 'responder', '#2563EB', 'technician', '#2563EB', '#2196F3'],
                circleStrokeColor: '#FFFFFF',
                circleStrokeWidth: 3,
              }}
            />
          </ShapeSource>
          {farmerLocation ? (
            <MarkerView
              key="farmer-current-location"
              coordinate={[farmerLocation.longitude, farmerLocation.latitude]}
              anchor={{ x: 0.5, y: 0.5 }}
              allowOverlap
            >
              <View style={[s.mapAvatarMarker, { borderColor: '#2563EB' }]}>
                <Icon name="location" size={21} color="#2563EB" />
              </View>
            </MarkerView>
          ) : null}
          {mappedTechnicians.map(technician => (
            <MarkerView key={`live-technician-${technician.id}-${technician.photoURL || 'no-photo'}`} coordinate={[technician.longitude!, technician.latitude!]} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
              <TouchableOpacity style={[s.mapAvatarMarker, selectedTechnicianId === technician.id && s.mapAvatarSelected]} onPress={() => { setSelectedTechnicianId(technician.id); setProfileDrawerVisible(true); }} accessibilityRole="button" accessibilityLabel={`View ${technician.displayName} profile`}>
                <Avatar key={`technician-${technician.id}-${technician.photoURL || 'no-photo'}`} name={technician.displayName} imageUrl={technician.photoURL || undefined} size={40} />
              </TouchableOpacity>
            </MarkerView>
          ))}
          {visibleAppointments.filter((appointment) => hasValidCoordinates(appointment.appointmentLatitude, appointment.appointmentLongitude)).map((appointment) => {
            const markerStatus = getRequestStatus(appointment, today);
            return (
              <MarkerView
                key={`service-request-${appointment.id}-${appointment.status}`}
                coordinate={[appointment.appointmentLongitude!, appointment.appointmentLatitude!]}
                anchor={{ x: 0.5, y: 0.5 }}
                allowOverlap
                onTouchEnd={() => setSelectedRequest(appointment)}
              >
                <TouchableOpacity
                  style={s.mapAvatarMarker}
                  onPress={() => setSelectedRequest(appointment)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${markerStatus.label.toLowerCase()} ${appointment.serviceType} request details`}
                >
                  <Avatar name="Farmer" imageUrl={profilePhotoURL} size={40} />
                  <View style={[s.requestStatusBadge, { backgroundColor: markerStatus.color }]} />
                </TouchableOpacity>
              </MarkerView>
            );
          })}
          {visibleAppointments.filter((appointment) => hasValidCoordinates(appointment.responderLatitude, appointment.responderLongitude)).map((appointment) => (
            <MarkerView
              key={`technician-${appointment.id}`}
              coordinate={[appointment.responderLongitude!, appointment.responderLatitude!]}
              anchor={{ x: 0.5, y: 0.5 }}
              allowOverlap
            >
              <View style={s.mapAvatarMarker}>
                <Avatar key={`appointment-technician-${appointment.technicianId}-${appointment.photoURL}`} name={appointment.technicianName} imageUrl={appointment.photoURL === profilePhotoURL ? undefined : appointment.photoURL} size={40} />
              </View>
            </MarkerView>
          ))}
        </MapView>
        {routeAppointment ? (
          <View pointerEvents="none" style={s.routeSummary}>
            <Text style={s.routeTitle}>Responder route to your appointment</Text>
            <Text style={s.routeDetails}>
              {isRouteLoading
                ? 'Calculating route…'
                : drivingRoute
                  ? `${formatDrivingDistance(drivingRoute.distanceKm)} • arrives in about ${formatDrivingDuration(drivingRoute.durationMinutes)}`
                  : 'Route unavailable. Check your connection.'}
            </Text>
          </View>
        ) : null}
        <TouchableOpacity
          accessibilityLabel={isMapExpanded ? 'Minimize map' : 'Expand map to full screen'}
          accessibilityRole="button"
          style={s.mapSizeButton}
          onPress={() => setIsMapExpanded((expanded) => !expanded)}
        >
          <Icon name={isMapExpanded ? 'minimize' : 'expand'} size={20} color={Colors.primary} />
        </TouchableOpacity>
        <View pointerEvents="none" style={s.mapLegend}>
          <View style={s.legendItem}>
            <Icon name="location" size={16} color="#2563EB" />
            <Text style={s.legendText}>Your location</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#2563EB' }]} />
            <Text style={s.legendText}>Technician</Text>
          </View>
        </View>
        {mapErrorMessage ? (
          <View pointerEvents="none" style={s.mapErrorNotice}>
            <Text style={s.mapErrorText}>{mapErrorMessage}</Text>
          </View>
        ) : null}
      </View>

      {/* Live technician profiles */}
      <View style={s.searchBox}>
        <Icon name="search" size={20} color={Colors.textLight} />
        <TextInput
          style={s.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search technicians by name or location..."
          placeholderTextColor={Colors.textLight}
          accessibilityLabel="Search technicians by name or location"
          returnKeyType="search"
        />
      </View>
      <Animated.View style={[s.listSection, listAnim]}>
        <View style={s.appointmentsHeading}>
          <Text style={s.listTitle}>Technicians nearby</Text>
          <Text style={s.liveCount}>{onlineTechnicianCount} online</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={s.list}>
          {filteredTechnicians.length === 0 ? <Text style={s.noResults}>No technicians are online right now.</Text> : filteredTechnicians.map((technician) => (
            <TouchableOpacity
              key={technician.id}
              activeOpacity={0.85}
              style={[s.card, selectedTechnicianId === technician.id && s.cardSelected]}
              onPress={() => { setSelectedTechnicianId(technician.id); setProfileDrawerVisible(true); }}
            >
              <View style={s.cardLeft}>
                <Avatar name={technician.displayName} imageUrl={technician.photoURL} size={40} />
              </View>
              <View style={s.cardContent}>
                <View style={s.cardHeader}>
                  <Text style={s.cardName}>{technician.displayName}</Text>
                  <Text style={s.onlineLabel}>Online</Text>
                </View>
                {!!(technician.specialization || technician.expertise?.length) && <Text style={s.cardService} numberOfLines={1}>{technician.specialization || technician.expertise?.join(', ')}</Text>}
                {technician.location ? (
                  <View style={s.cardRow}>
                    <Icon name="location" size={12} color={Colors.textSecondary} />
                    <Text style={s.cardDetail}>{technician.location}</Text>
                  </View>
                ) : null}
              </View>
              <Icon name="chevron-right" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      </Animated.View>
      <MapUserProfileDrawer
        user={profileDrawerVisible ? selectedTechnician || null : null}
        userType="Technician"
        onClose={() => setProfileDrawerVisible(false)}
        onRequestService={() => {
          if (!selectedTechnician) return;
          setProfileDrawerVisible(false);
          router.push({ pathname: '/(farmer)/services', params: { technicianId: selectedTechnician.id } });
        }}
        onMessage={() => {
          if (!selectedTechnician) return;
          setProfileDrawerVisible(false);
          void handleMessage(selectedTechnician.id, selectedTechnician.displayName, selectedTechnician.photoURL);
        }}
      />
      <MapServiceRequestDetailsDrawer
        request={selectedRequest ? {
          id: selectedRequest.id,
          serviceType: selectedRequest.serviceType,
          statusLabel: getRequestStatus(selectedRequest, today).label,
          statusColor: getRequestStatus(selectedRequest, today).color,
          statusBackground: getRequestStatus(selectedRequest, today).background,
          animalName: selectedRequest.animalName,
          animalType: selectedRequest.animalType,
          animalBreed: selectedRequest.animalBreed,
          animalQuantity: selectedRequest.animalQuantity,
          farmerName: 'You',
          technicianName: selectedRequest.technicianName,
          date: selectedRequest.date,
          time: selectedRequest.time,
          location: selectedRequest.location,
          description: selectedRequest.description,
        } : null}
        onClose={() => setSelectedRequest(null)}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header: { position: 'relative', overflow: 'hidden', backgroundColor: '#B4E6B8', width: '100%' },
  headerArt: { position: 'absolute', top: 0, left: 0, height: '100%', width: '100%' },
  headerIdentity: { marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white, textShadowColor: '#000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 },
  headerSubtitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 3 },
  activeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#6FE08E' },
  headerSubtitle: { fontSize: FontSize.md, color: '#D6F4DE', textShadowColor: '#000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 },
  // Map
  mapContainer: { height: 310, marginTop: -26, borderWidth: 4, borderColor: Colors.white, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadow.medium },
  mapContainerExpanded: { position: 'absolute', zIndex: 20, elevation: 20, top: 0, right: 0, bottom: 0, left: 0, height: '100%', marginHorizontal: 0, marginTop: 0, borderRadius: 0 },
  map: { flex: 1 },
  mapAvatarMarker: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: Colors.white, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  requestStatusBadge: { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Colors.white, elevation: 6 },
  mapAvatarSelected: { borderColor: Colors.primary, borderWidth: 4 },
  routeSummary: { position: 'absolute', top: 8, left: 8, right: 52, paddingHorizontal: Spacing.sm, paddingVertical: 7, borderRadius: BorderRadius.md, backgroundColor: 'rgba(255,255,255,0.95)' },
  routeTitle: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '700' },
  routeDetails: { fontSize: FontSize.xs, color: '#1565C0', marginTop: 2, fontWeight: '600' },
  mapSizeButton: { position: 'absolute', top: 8, right: 8, zIndex: 2, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.96)', ...Shadow.light },
  mapLegend: { position: 'absolute', left: 8, bottom: 8, padding: 8, borderRadius: BorderRadius.md, backgroundColor: 'rgba(255,255,255,0.94)', gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: '600' },
  mapErrorNotice: { position: 'absolute', top: 8, left: 8, right: 8, padding: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: 'rgba(255,255,255,0.95)' },
  mapErrorText: { fontSize: FontSize.xs, color: '#B91C1C', textAlign: 'center' },
  emptyAppointments: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  emptyAppointmentsText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  // List
  searchBox: { height: 46, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#E8ECE8', ...Shadow.light },
  searchInput: { flex: 1, height: '100%', padding: 0, color: Colors.text, fontSize: FontSize.sm },
  listSection: { flex: 1, paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  appointmentsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.sm },
  listTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  liveCount: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  onlineLabel: { color: '#16834D', fontSize: FontSize.xs, fontWeight: '700' },
  filterTabs: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterTab: { paddingHorizontal: Spacing.sm, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: Colors.white },
  filterTabActive: { backgroundColor: Colors.primary },
  filterTabText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  filterTabTextActive: { color: Colors.white, fontWeight: '700' },
  noResults: { padding: Spacing.md, color: Colors.textSecondary, textAlign: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg },
  list: { flex: 1 },
  // Card
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.light },
  cardSelected: { borderWidth: 2, borderColor: '#1565C0', backgroundColor: '#EFF6FF' },
  cardLeft: { marginRight: Spacing.md },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  cardDateBadge: { fontSize: FontSize.xs, fontWeight: '700', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, overflow: 'hidden' },
  cardService: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardDetail: { fontSize: FontSize.xs, color: Colors.textSecondary },
});

import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/FontScale';
import Animated from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { router, useFocusEffect } from 'expo-router';
import { Camera, CircleLayer, LineLayer, MapView, MarkerView, RasterLayer, RasterSource, ShapeSource } from '@maplibre/maplibre-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';
import { getOrCreateChatRoom } from '@/services/chatService';
import { listenToUserLocation, listenToUsersLocations } from '@/services/locationService';
import { getMapTileSources, type MapTileSource } from '@/services/mapConfigService';
import { formatDrivingDistance, formatDrivingDuration, getDrivingRoute, type DrivingRoute } from '@/services/routingService';

interface TechAppointment {
  id: string;
  technicianId: string;
  technicianName: string;
  serviceType: string;
  animalName: string;
  date: string;
  time: string;
  status: string;
  appointmentLatitude: number | null;
  appointmentLongitude: number | null;
  responderLatitude: number | null;
  responderLongitude: number | null;
  location: string;
  photoURL: string;
}

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

export default function FarmerMapScreen() {
  const [appointments, setAppointments] = useState<TechAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');
  const [farmerLocation, setFarmerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [profilePhotoURL, setProfilePhotoURL] = useState('');
  const [mapTileSources, setMapTileSources] = useState<MapTileSource[]>([]);
  const [mapSourceIndex, setMapSourceIndex] = useState(0);
  const [mapErrorMessage, setMapErrorMessage] = useState('');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appointmentFilter, setAppointmentFilter] = useState<'All' | 'Upcoming' | 'Overdue'>('All');
  const [drivingRoute, setDrivingRoute] = useState<DrivingRoute | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const headerAnim = useFadeIn(100);
  const listAnim = useFadeInUp(300);

  useEffect(() => {
    let unsub: () => void = () => {};
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);

      // Get farmer's own location
      const userDoc = await firestore().collection(Collections.USERS).doc(session.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
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
                let location = appt.location || '';
                let photoURL = '';

                // Read technician display details only. Live location is subscribed
                // below and saved into responderLatitude/responderLongitude.
                if (appt.technicianId) {
                  try {
                    const techDoc = await firestore().collection(Collections.USERS).doc(appt.technicianId).get();
                    if (techDoc.exists) {
                      const td = techDoc.data();
                      if (!location && td?.location) location = td.location;
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
                  date: appt.date || '',
                  time: appt.time || '',
                  status: appt.status || '',
                  appointmentLatitude,
                  appointmentLongitude,
                  responderLatitude: null,
                  responderLongitude: null,
                  location,
                  photoURL,
                };
              })
            );

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
    const matchesSearch = `${appointment.technicianName} ${appointment.serviceType} ${appointment.animalName} ${appointment.location}`.toLowerCase().includes(search);
    const matchesFilter = appointmentFilter === 'All' || (appointmentFilter === 'Overdue'
      ? Boolean(appointment.date && appointment.date < today)
      : Boolean(appointment.date && appointment.date >= today));
    return matchesSearch && matchesFilter;
  });
  const visibleAppointments = selectedAppointmentId
    ? filteredAppointments.filter((appointment) => appointment.id === selectedAppointmentId)
    : filteredAppointments;
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

  const handleMessage = async (technicianId: string, technicianName: string) => {
    if (!technicianId || !uid) return;
    try {
      const chatId = await getOrCreateChatRoom(uid, technicianId);
      router.push({ pathname: '/(farmer)/messages/chat', params: { chatId, otherUserId: technicianId, otherUserName: technicianName, otherPhoto: '' } });
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
  const tileUrlTemplate = activeTileSource.urlTemplate.replaceAll(
    '{key}',
    encodeURIComponent(activeTileSource.apiKey || '')
  );
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
    ],
  };
  const appointmentWithLocation = visibleAppointments.find((appointment) => hasValidCoordinates(appointment.appointmentLatitude, appointment.appointmentLongitude));
  const responderWithLocation = visibleAppointments.find((appointment) => hasValidCoordinates(appointment.responderLatitude, appointment.responderLongitude));
  const mapCenter = routeAppointment
    ? { latitude: routeAppointment.appointmentLatitude!, longitude: routeAppointment.appointmentLongitude! }
    : appointmentWithLocation
      ? { latitude: appointmentWithLocation.appointmentLatitude!, longitude: appointmentWithLocation.appointmentLongitude! }
    : responderWithLocation
      ? { latitude: responderWithLocation.responderLatitude!, longitude: responderWithLocation.responderLongitude! }
      : farmerLocation ?? DEFAULT_LOCATION;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <Animated.View style={[s.header, headerAnim]}>
        <Image source={require('../../../../assets/images/technician/Green Map Pin Landscape.png')} style={s.headerArt} resizeMode="fit" pointerEvents="none" />
        <View style={s.headerIdentity}>
          <Text style={s.headerTitle}>Technician Locations</Text>
          <View style={s.headerSubtitleRow}><View style={s.activeDot} /><Text style={s.headerSubtitle}>{appointments.length} active appointment{appointments.length !== 1 ? 's' : ''}</Text></View>
        </View>
      </Animated.View>

      {/* Map */}
      <View style={[s.mapContainer, isMapExpanded && s.mapContainerExpanded]}>
        <MapView
          key={`${activeTileSource.id}-${mapCenter.latitude}-${mapCenter.longitude}-${isMapExpanded ? 'full' : 'card'}`}
          mapStyle={EMPTY_MAP_STYLE}
          style={s.map}
          attributionEnabled
          logoEnabled={false}
          onDidFinishLoadingMap={() => setMapErrorMessage('')}
          onDidFailLoadingMap={() => {
            if (mapSourceIndex < allTileSources.length - 1) {
              setMapSourceIndex((index) => index + 1);
              return;
            }
            setMapErrorMessage('Map tiles could not be loaded. Check your internet connection and map source settings.');
          }}
        >
          <Camera
            defaultSettings={{
              centerCoordinate: [mapCenter.longitude, mapCenter.latitude],
              zoomLevel: filteredAppointments.length > 0 ? 11 : 13,
            }}
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
                circleColor: ['match', ['get', 'role'], 'responder', '#16A34A', '#2196F3'],
                circleStrokeColor: '#FFFFFF',
                circleStrokeWidth: 3,
              }}
            />
          </ShapeSource>
          {farmerLocation ? (
            <MarkerView
              coordinate={[farmerLocation.longitude, farmerLocation.latitude]}
              anchor={{ x: 0.5, y: 0.5 }}
              allowOverlap
            >
              <View style={s.mapAvatarMarker}>
                <Avatar name="Farmer" imageUrl={profilePhotoURL} size={40} />
              </View>
            </MarkerView>
          ) : null}
          {visibleAppointments.filter((appointment) => hasValidCoordinates(appointment.appointmentLatitude, appointment.appointmentLongitude)).map((appointment) => (
            <MarkerView
              key={`appointment-${appointment.id}`}
              coordinate={[appointment.appointmentLongitude!, appointment.appointmentLatitude!]}
              anchor={{ x: 0.5, y: 0.5 }}
              allowOverlap
            >
              <View style={s.mapAvatarMarker}>
                <Avatar name="Farmer" imageUrl={profilePhotoURL} size={40} />
              </View>
            </MarkerView>
          ))}
          {visibleAppointments.filter((appointment) => hasValidCoordinates(appointment.responderLatitude, appointment.responderLongitude)).map((appointment) => (
            <MarkerView
              key={`technician-${appointment.id}`}
              coordinate={[appointment.responderLongitude!, appointment.responderLatitude!]}
              anchor={{ x: 0.5, y: 0.5 }}
              allowOverlap
            >
              <View style={s.mapAvatarMarker}>
                <Avatar name={appointment.technicianName} imageUrl={appointment.photoURL} size={40} />
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
            <Avatar name="Farmer" imageUrl={profilePhotoURL} size={16} />
            <Text style={s.legendText}>Appointment</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={s.legendText}>Responder live location</Text>
          </View>
        </View>
        {mapErrorMessage ? (
          <View pointerEvents="none" style={s.mapErrorNotice}>
            <Text style={s.mapErrorText}>{mapErrorMessage}</Text>
          </View>
        ) : null}
      </View>

      {appointments.length === 0 ? (
        <View style={s.emptyAppointments}>
          <Icon name="map" size={20} color={Colors.textLight} />
          <Text style={s.emptyAppointmentsText}>No active appointments. Your location is shown on the map.</Text>
        </View>
      ) : null}

      {/* Appointment List */}
      <View style={s.searchBox}>
        <Icon name="search" size={20} color={Colors.textLight} />
        <TextInput
          style={s.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search technician, service, or location..."
          placeholderTextColor={Colors.textLight}
          accessibilityLabel="Search technician, service, or location"
          returnKeyType="search"
        />
      </View>
      <Animated.View style={[s.listSection, listAnim]}>
        <View style={s.appointmentsHeading}>
          <Text style={s.listTitle}>Appointments</Text>
          <View style={s.filterTabs}>
            {(['All', 'Upcoming', 'Overdue'] as const).map((filter) => (
              <TouchableOpacity key={filter} style={[s.filterTab, appointmentFilter === filter && s.filterTabActive]} onPress={() => setAppointmentFilter(filter)}>
                <Text style={[s.filterTabText, appointmentFilter === filter && s.filterTabTextActive]}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={s.list}>
          {filteredAppointments.length === 0 ? <Text style={s.noResults}>No matching appointments.</Text> : filteredAppointments.map((appt) => (
            <TouchableOpacity
              key={appt.id}
              activeOpacity={0.85}
              style={[s.card, selectedAppointmentId === appt.id && s.cardSelected]}
              onPress={() => setSelectedAppointmentId((selectedId) => selectedId === appt.id ? null : appt.id)}
            >
              <View style={s.cardLeft}>
                <Avatar name={appt.technicianName} imageUrl={appt.photoURL} size={40} />
              </View>
              <View style={s.cardContent}>
                <View style={s.cardHeader}>
                  <Text style={s.cardName}>{appt.technicianName}</Text>
                  <Text style={[s.cardDateBadge, { color: getDateColor(appt.date), backgroundColor: getDateLabel(appt.date) === 'Overdue' ? '#FEE2E2' : getDateLabel(appt.date) === 'Today' ? '#FEF3C7' : '#DCFCE7' }]}>{getDateLabel(appt.date)}</Text>
                </View>
                <Text style={s.cardService}>{appt.serviceType} — {appt.animalName}</Text>
                <View style={s.cardRow}>
                  <Icon name="clock" size={12} color={Colors.textSecondary} />
                  <Text style={s.cardDetail}>{appt.date} {appt.time}</Text>
                </View>
                {appt.location ? (
                  <View style={s.cardRow}>
                    <Icon name="location" size={12} color={Colors.textSecondary} />
                    <Text style={s.cardDetail}>{appt.location}</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity style={s.msgBtn} onPress={() => handleMessage(appt.technicianId, appt.technicianName)}>
                <Icon name="messages" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      </Animated.View>
    </View>
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
  msgBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
});

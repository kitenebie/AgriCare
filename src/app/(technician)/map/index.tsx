import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import Animated from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Config } from '@/constants/config';
import { Icon, Avatar } from '@/components/ui';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';
import { getOrCreateChatRoom } from '@/services/chatService';

interface FarmerClient {
  id: string;
  farmerId: string;
  farmerName: string;
  serviceType: string;
  animalName: string;
  date: string;
  time: string;
  status: string;
  latitude: number;
  longitude: number;
  location: string;
  photoURL: string;
}

// Technician default location (Bulacan area)
const TECH_LOCATION = { latitude: 14.8527, longitude: 120.8120 };

export default function TechMapScreen() {
  const [clients, setClients] = useState<FarmerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');
  const [userName, setUserName] = useState('');
  const [techPhoto, setTechPhoto] = useState('');
  const [techLocation, setTechLocation] = useState(TECH_LOCATION);
  const headerAnim = useFadeIn(100);
  const listAnim = useFadeInUp(300);

  useEffect(() => {
    let unsub: () => void = () => {};
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);
      setUserName(session.displayName || 'Technician');

      // Get technician's own location
      const userDoc = await firestore().collection(Collections.USERS).doc(session.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.latitude && data?.longitude) {
          setTechLocation({ latitude: data.latitude, longitude: data.longitude });
        if (data?.photoURL) setTechPhoto(data.photoURL);
        }
      }

      // Listen to confirmed appointments (clients) for this technician
      unsub = firestore()
        .collection(Collections.APPOINTMENTS)
        .where('technicianId', '==', session.uid)
        .where('status', '==', 'confirmed')
        .onSnapshot(
          async (snap) => {
            const appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // For each appointment, get farmer's location
            const clientsData: FarmerClient[] = await Promise.all(
              appointments.map(async (appt: any) => {
                let latitude = 14.8527 + (Math.random() * 0.03 - 0.015);
                let longitude = 120.8120 + (Math.random() * 0.03 - 0.015);
                let location = appt.location || '';
                let photoURL = '';

                // Try to get farmer's actual coordinates
                if (appt.farmerId) {
                  try {
                    const farmerDoc = await firestore().collection(Collections.USERS).doc(appt.farmerId).get();
                    if (farmerDoc.exists) {
                      const fd = farmerDoc.data();
                      if (fd?.latitude) latitude = fd.latitude;
                      if (fd?.longitude) longitude = fd.longitude;
                      if (!location && fd?.location) location = fd.location;
                      if (fd?.photoURL) photoURL = fd.photoURL;
                    }
                  } catch (e) {}
                }

                return {
                  id: appt.id,
                  farmerId: appt.farmerId || '',
                  farmerName: appt.farmerName || 'Farmer',
                  serviceType: appt.serviceType || '',
                  animalName: appt.animalName || '',
                  date: appt.date || '',
                  time: appt.time || '',
                  status: appt.status || '',
                  latitude,
                  longitude,
                  location,
                  photoURL,
                };
              })
            );

            setClients(clientsData);
            setLoading(false);
          },
          () => setLoading(false)
        );
    };
    load();
    return () => unsub();
  }, []);

  const handleMessage = async (farmerId: string, farmerName: string) => {
    if (!farmerId || !uid) return;
    try {
      const chatId = await getOrCreateChatRoom(uid, farmerId);
      router.push({ pathname: '/(technician)/messages/chat', params: { chatId, otherUserId: farmerId, otherUserName: farmerName, otherPhoto: '' } });
    } catch (e) {
      console.warn('Failed to open chat:', e);
    }
  };

  // Build map HTML with markers and polyline routes
  const buildMapHtml = () => {
    const markers = clients.map((c, i) => `
      L.marker([${c.latitude}, ${c.longitude}], {
        icon: L.divIcon({
          className: 'farmer-marker',
          html: '<div class="avatar-marker"><img src="${c.photoURL || `https://i.pravatar.cc/80?img=${(Math.abs(c.farmerName.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 70) + 1}`}" /></div>',
          iconSize: [42, 42],
          iconAnchor: [21, 42],
        })
      }).addTo(map).bindPopup('<b>${c.farmerName.replace(/'/g, "\\'")}</b><br>${c.serviceType.replace(/'/g, "\\'")}<br>${c.animalName.replace(/'/g, "\\'")}<br><small>${c.date} ${c.time}</small>');
    `).join('\n');

    // Build polyline coordinates (tech location → each farmer)
    // Using OpenRouteService for real road-following routes
    const ORS_API_KEY = Config.ORS_API_KEY;
    const routeRequests = clients.map((c, i) => `
      fetch('https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${techLocation.longitude},${techLocation.latitude}&end=${c.longitude},${c.latitude}')
        .then(r => r.json())
        .then(data => {
          if (data.features && data.features[0]) {
            const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
            L.polyline(coords, { color: '${['#1B5E20', '#2196F3', '#FF9800', '#9C27B0', '#F44336'][i % 5]}', weight: 4, opacity: 0.8 }).addTo(map);
          }
        })
        .catch(() => {
          // Fallback: straight dashed line if route fails
          L.polyline([[${techLocation.latitude}, ${techLocation.longitude}], [${c.latitude}, ${c.longitude}]], { color: '#1B5E20', weight: 3, opacity: 0.5, dashArray: '8, 8' }).addTo(map);
        });
    `).join('\n');

    // Calculate bounds to fit all points
    const allLats = [techLocation.latitude, ...clients.map(c => c.latitude)];
    const allLngs = [techLocation.longitude, ...clients.map(c => c.longitude)];
    const bounds = clients.length > 0
      ? `map.fitBounds([[${Math.min(...allLats)}, ${Math.min(...allLngs)}], [${Math.max(...allLats)}, ${Math.max(...allLngs)}]], { padding: [40, 40] });`
      : `map.setView([${techLocation.latitude}, ${techLocation.longitude}], 13);`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
    .marker-pin {
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
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .avatar-marker {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 3px solid #1B5E20;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .avatar-marker img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .tech-marker {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 3px solid #2196F3;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .tech-marker img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Technician location (you)
    L.marker([${techLocation.latitude}, ${techLocation.longitude}], {
      icon: L.divIcon({
        className: 'tech-marker-wrapper',
        html: '<div class="tech-marker"><img src="${techPhoto || `https://i.pravatar.cc/80?img=${(Math.abs(userName.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 70) + 1}`}" /></div>',
        iconSize: [42, 42],
        iconAnchor: [21, 42],
      })
    }).addTo(map).bindPopup('<b>You</b><br>Your location');

    // Route paths via OpenRouteService (real road directions)
    ${routeRequests}

    // Farmer markers
    ${markers}

    // Fit bounds
    ${bounds}
  </script>
</body>
</html>`;
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

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <Animated.View style={[s.header, headerAnim]}>
        <Text style={s.headerTitle}>Client Locations</Text>
        <Text style={s.headerSubtitle}>{clients.length} active appointment{clients.length !== 1 ? 's' : ''}</Text>
      </Animated.View>

      {/* Map */}
      <View style={s.mapContainer}>
        {clients.length === 0 ? (
          <View style={s.emptyMap}>
            <Icon name="map" size={48} color={Colors.textLight} />
            <Text style={s.emptyMapText}>No active appointments</Text>
            <Text style={s.emptyMapSubtext}>Accept requests to see client locations</Text>
          </View>
        ) : (
          <WebView
            source={{ html: buildMapHtml() }}
            style={s.map}
            scrollEnabled={false}
            nestedScrollEnabled={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
          />
        )}
      </View>

      {/* Client List */}
      <Animated.View style={[s.listSection, listAnim]}>
        <Text style={s.listTitle}>Appointments ({clients.length})</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={s.list}>
          {clients.map((client, index) => (
            <View key={client.id} style={s.card}>
              <View style={s.cardLeft}>
                <Avatar name={client.farmerName} imageUrl={client.photoURL} size={40} />
              </View>
              <View style={s.cardContent}>
                <View style={s.cardHeader}>
                  <Text style={s.cardName}>{client.farmerName}</Text>
                  <Text style={[s.cardDateBadge, { color: getDateColor(client.date) }]}>{getDateLabel(client.date)}</Text>
                </View>
                <Text style={s.cardService}>{client.serviceType} — {client.animalName}</Text>
                <View style={s.cardRow}>
                  <Icon name="clock" size={12} color={Colors.textSecondary} />
                  <Text style={s.cardDetail}>{client.date} {client.time}</Text>
                </View>
                {client.location ? (
                  <View style={s.cardRow}>
                    <Icon name="location" size={12} color={Colors.textSecondary} />
                    <Text style={s.cardDetail}>{client.location}</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity style={s.msgBtn} onPress={() => handleMessage(client.farmerId, client.farmerName)}>
                <Icon name="messages" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
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
  header: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: Spacing.lg, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: FontSize.sm, color: Colors.accent, marginTop: 2 },
  // Map
  mapContainer: { height: 280, marginHorizontal: Spacing.md, marginTop: Spacing.md, borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadow.medium },
  map: { flex: 1 },
  emptyMap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
  emptyMapText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.md },
  emptyMapSubtext: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4 },
  // List
  listSection: { flex: 1, paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  listTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  list: { flex: 1 },
  // Card
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.light },
  cardLeft: { marginRight: Spacing.md },
  indexBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  indexText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  cardDateBadge: { fontSize: FontSize.xs, fontWeight: '700' },
  cardService: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardDetail: { fontSize: FontSize.xs, color: Colors.textSecondary },
  msgBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
});

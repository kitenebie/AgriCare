import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { getSession } from '@/services/sessionService';

interface TechnicianItem {
  id: string;
  displayName: string;
  specialization?: string;
  expertise?: string[];
  photoURL?: string;
  rating?: number;
  reviewCount?: number;
  location?: string;
  status?: string;
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'favorites'>('all');
  const [uid, setUid] = useState('');

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);

      // Load all active technicians
      const techSnap = await firestore().collection(Collections.USERS).where('role', '==', 'technician').where('status', '==', 'active').get();
      setTechnicians(techSnap.docs.map(d => ({ id: d.id, ...d.data() } as TechnicianItem)));

      // Load user's favorites
      const favSnap = await firestore().collection('favoriteTechnicians').where('farmerId', '==', session.uid).get();
      setFavorites(favSnap.docs.map(d => d.data().technicianId as string));

      setLoading(false);
    };
    load();
  }, []);

  const toggleFavorite = async (techId: string) => {
    if (favorites.includes(techId)) {
      // Remove
      const snap = await firestore().collection('favoriteTechnicians').where('farmerId', '==', uid).where('technicianId', '==', techId).get();
      snap.docs.forEach(d => d.ref.delete());
      setFavorites(prev => prev.filter(id => id !== techId));
    } else {
      // Add
      await firestore().collection('favoriteTechnicians').add({ farmerId: uid, technicianId: techId, createdAt: firestore.FieldValue.serverTimestamp() });
      setFavorites(prev => [...prev, techId]);
    }
  };

  const displayed = tab === 'favorites' ? technicians.filter(t => favorites.includes(t.id)) : technicians;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Technicians</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, tab === 'all' && s.tabActive]} onPress={() => setTab('all')}>
          <Icon name="profile" size={16} color={tab === 'all' ? Colors.primary : Colors.textSecondary} />
          <Text style={[s.tabText, tab === 'all' && s.tabTextActive]}>All Technicians</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'favorites' && s.tabActive]} onPress={() => setTab('favorites')}>
          <Icon name="star" size={16} color={tab === 'favorites' ? Colors.primary : Colors.textSecondary} />
          <Text style={[s.tabText, tab === 'favorites' && s.tabTextActive]}>Favorites</Text>
          {favorites.length > 0 && <View style={s.badge}><Text style={s.badgeText}>{favorites.length}</Text></View>}
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {displayed.length === 0 && (
          <View style={s.empty}>
            <Icon name={tab === 'favorites' ? 'star' : 'profile'} size={48} color={Colors.textLight} />
            <Text style={s.emptyText}>{tab === 'favorites' ? 'No favorite technicians yet' : 'No technicians available'}</Text>
            {tab === 'favorites' && <Text style={s.emptySubtext}>Tap the ★ on a technician to add them</Text>}
          </View>
        )}
        {displayed.map(t => {
          const isFav = favorites.includes(t.id);
          const specs = t.expertise || (t.specialization ? t.specialization.split(',').map(s => s.trim()) : []);
          return (
            <View key={t.id} style={s.card}>
              <Avatar name={t.displayName} imageUrl={t.photoURL} size={50} />
              <View style={s.cardInfo}>
                <Text style={s.cardName}>{t.displayName}</Text>
                {specs.length > 0 && <Text style={s.cardSpec} numberOfLines={1}>{specs.join(' • ')}</Text>}
                <View style={s.cardMeta}>
                  {t.rating ? (
                    <View style={s.ratingRow}>
                      <Icon name="star" size={12} color="#F59E0B" />
                      <Text style={s.ratingText}>{t.rating.toFixed(1)}</Text>
                      {t.reviewCount ? <Text style={s.reviewText}>({t.reviewCount})</Text> : null}
                    </View>
                  ) : null}
                  {t.location ? (
                    <View style={s.locRow}>
                      <Icon name="location" size={12} color={Colors.textSecondary} />
                      <Text style={s.locText}>{t.location}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity style={s.favBtn} onPress={() => toggleFavorite(t.id)}>
                <Icon name="star" size={20} color={isFav ? '#F59E0B' : Colors.border} />
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 4, ...Shadow.light },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  tabActive: { backgroundColor: Colors.primary + '10' },
  tabText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  badge: { backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 4 },
  badgeText: { fontSize: 10, color: Colors.white, fontWeight: '700' },
  // List
  list: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4 },
  // Card
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadow.light },
  cardInfo: { flex: 1, marginLeft: Spacing.md },
  cardName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardSpec: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  reviewText: { fontSize: 11, color: Colors.textSecondary },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locText: { fontSize: 11, color: Colors.textSecondary },
  favBtn: { padding: 8 },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { MapViewComponent } from '@/components/map/MapView';
import { TechnicianCard } from '@/components/cards/TechnicianCard';
import { Collections } from '@/services/firebase';
import { Technician } from '@/types';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';

export default function MapScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [distanceFilter, setDistanceFilter] = useState(5);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  const headerAnim = useFadeIn(100);
  const mapAnim = useFadeIn(200);
  const listAnim = useFadeInUp(400);

  const filters = ['All', 'Health Check', 'Vaccination', 'Treatment', 'De-worming', 'A.I.', 'Others'];

  useEffect(() => {
    const load = async () => {
      try {
        // Load active technicians from Firestore
        const techSnap = await firestore()
          .collection(Collections.USERS)
          .where('role', '==', 'technician')
          .where('status', '==', 'active')
          .get();

        const techData: Technician[] = techSnap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.displayName || 'Technician',
            avatar: d.displayName?.split(' ').map((n: string) => n[0]).join('') || 'T',
            rating: d.rating || 0,
            reviewCount: d.reviewCount || 0,
            specializations: d.expertise || d.specialization?.split(',').map((s: string) => s.trim()) || [],
            distance: '',
            experience: d.experience || 0,
            serviceArea: d.location || d.serviceArea || 'Bulacan',
            latitude: d.latitude || 14.8527 + (Math.random() * 0.02 - 0.01),
            longitude: d.longitude || 120.8120 + (Math.random() * 0.02 - 0.01),
          };
        });

        setTechnicians(techData);
      } catch (e: any) {
        console.warn('Failed to load technicians:', e.message);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Filter technicians by search and specialization
  const filtered = technicians.filter(t => {
    const matchesSearch = !searchQuery.trim() ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.serviceArea.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'All' ||
      t.specializations.some(s => s.toLowerCase().includes(selectedFilter.toLowerCase()));
    return matchesSearch && matchesFilter;
  });

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View style={[styles.header, headerAnim]}>
        <Text style={styles.title}>Find Nearby Technicians</Text>
        <TouchableOpacity onPress={() => setShowFilter(!showFilter)} style={styles.filterButton}>
          <Icon name="filter" size={22} color={Colors.text} />
        </TouchableOpacity>
      </Animated.View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color={Colors.textLight} />
        <TextInput style={styles.searchInput} placeholder="Search technician or location" placeholderTextColor={Colors.textLight} value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      {/* Map */}
      <Animated.View style={[styles.mapContainer, mapAnim]}>
        <MapViewComponent technicians={filtered} />
      </Animated.View>

      {/* Filter Panel */}
      {showFilter && (
        <Animated.View style={styles.filterPanel}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter</Text>
            <TouchableOpacity onPress={() => setShowFilter(false)}>
              <Icon name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.filterLabel}>Service Type</Text>
          <View style={styles.filterChips}>
            {filters.map((filter) => (
              <TouchableOpacity key={filter} style={[styles.chip, selectedFilter === filter && styles.chipActive]} onPress={() => setSelectedFilter(filter)}>
                <Text style={[styles.chipText, selectedFilter === filter && styles.chipTextActive]}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilter(false)}>
              <Text style={styles.applyButtonText}>Apply Filter</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSelectedFilter('All'); setDistanceFilter(5); }}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Technician List */}
      <Animated.View style={[styles.listContainer, listAnim]}>
        <Text style={styles.listTitle}>{filtered.length} Technician{filtered.length !== 1 ? 's' : ''} Found</Text>
        <View style={styles.listContent}>
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Icon name="profile" size={40} color={Colors.textLight} />
              <Text style={styles.emptyText}>No technicians found</Text>
            </View>
          )}
          {filtered.map((item, index) => (
            <TechnicianCard key={item.id} technician={item} index={index} />
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  filterButton: { padding: Spacing.sm },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.full, marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm, ...Shadow.light },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  mapContainer: { height: 220, marginHorizontal: Spacing.lg, borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md },
  filterPanel: { position: 'absolute', top: 120, right: Spacing.lg, left: Spacing.lg, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, zIndex: 10, ...Shadow.heavy },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  filterTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  filterLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.md },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  chipTextActive: { color: Colors.white, fontWeight: '600' },
  filterActions: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xl, gap: Spacing.xl },
  applyButton: { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: Spacing.md, alignItems: 'center' },
  applyButtonText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  resetText: { color: Colors.textSecondary, fontSize: FontSize.md },
  listContainer: { flex: 1 },
  listTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.sm },
});

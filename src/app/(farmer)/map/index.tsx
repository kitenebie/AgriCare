import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { MapViewComponent } from '@/components/map/MapView';
import { TechnicianCard } from '@/components/cards/TechnicianCard';
import { technicians } from '@/data/mockData';
import { useFadeInUp, useFadeIn } from '@/hooks/useAnimatedEntry';

export default function MapScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const headerAnim = useFadeIn(100);
  const mapAnim = useFadeIn(200);
  const listAnim = useFadeInUp(400);

  const filters = ['All', 'Health Check', 'Vaccination', 'Treatment', 'De-worming', 'A.I.', 'Others'];
  const [distanceFilter, setDistanceFilter] = useState(5);

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
        <TextInput
          style={styles.searchInput}
          placeholder="Search location"
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Map Placeholder - MapLibre would render here */}
      <Animated.View style={[styles.mapContainer, mapAnim]}>
        <MapViewComponent technicians={technicians} />
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
              <TouchableOpacity
                key={filter}
                style={[styles.chip, selectedFilter === filter && styles.chipActive]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text style={[styles.chipText, selectedFilter === filter && styles.chipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.filterLabel}>Distance</Text>
          <View style={styles.distanceRow}>
            <Text style={styles.distanceValue}>1 km</Text>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${(distanceFilter / 10) * 100}%` }]} />
              <View style={[styles.sliderThumb, { left: `${(distanceFilter / 10) * 100}%` }]} />
            </View>
            <Text style={styles.distanceValue}>10 km</Text>
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
        <View style={styles.listContent}>
          {technicians.map((item, index) => (
            <TechnicianCard key={item.id} technician={item} index={index} />
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  filterButton: {
    padding: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  mapContainer: {
    height: 220,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  filterPanel: {
    position: 'absolute',
    top: 120,
    right: Spacing.lg,
    left: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    zIndex: 10,
    ...Shadow.heavy,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  filterTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  filterLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  distanceValue: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    marginLeft: -8,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xl,
  },
  applyButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  applyButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  resetText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
});

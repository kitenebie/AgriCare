import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';

interface LogEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  details: string;
  timestamp: any;
  type: 'auth' | 'crud' | 'system' | 'error';
}

const typeConfig: Record<string, { color: string; icon: string; label: string }> = {
  auth: { color: '#2196F3', icon: 'lock', label: 'Auth' },
  crud: { color: '#4CAF50', icon: 'edit', label: 'CRUD' },
  system: { color: '#FF9800', icon: 'services', label: 'System' },
  error: { color: '#F44336', icon: 'alert', label: 'Error' },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .onSnapshot(
        (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const data: LogEntry[] = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as LogEntry[];
            setLogs(data);
          } else {
            // Show sample logs if collection is empty
            setLogs(sampleLogs);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('Logs listener error:', error.message);
          setLogs(sampleLogs);
          setLoading(false);
        }
      );
    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === 'all' || log.type === filter;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      log.action.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Logs</Text>
        <Text style={styles.headerCount}>{filteredLogs.length}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Icon name="search" size={16} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search logs..."
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {[
          { value: 'all', label: 'All' },
          { value: 'auth', label: 'Auth' },
          { value: 'crud', label: 'CRUD' },
          { value: 'system', label: 'System' },
          { value: 'error', label: 'Errors' },
        ].map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterChipText, filter === f.value && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Log List */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="clipboard" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No logs found</Text>
          </View>
        ) : (
          filteredLogs.map((log) => {
            const config = typeConfig[log.type] || typeConfig.system;
            return (
              <View key={log.id} style={styles.logCard}>
                <View style={[styles.logIcon, { backgroundColor: config.color + '15' }]}>
                  <Icon name={config.icon as any} size={16} color={config.color} />
                </View>
                <View style={styles.logContent}>
                  <View style={styles.logTop}>
                    <Text style={styles.logAction}>{log.action}</Text>
                    <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
                  </View>
                  <Text style={styles.logDetails} numberOfLines={2}>{log.details}</Text>
                  <View style={styles.logMeta}>
                    <View style={[styles.typeBadge, { backgroundColor: config.color + '15' }]}>
                      <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
                    </View>
                    <Text style={styles.logUser}>{log.userName} ({log.userRole})</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// Sample logs to show when Firestore 'logs' collection is empty
const sampleLogs: LogEntry[] = [
  { id: '1', action: 'User Login', userId: 'admin_001', userName: 'Admin AgriCare', userRole: 'admin', details: 'Admin logged in successfully', timestamp: new Date(Date.now() - 300000), type: 'auth' },
  { id: '2', action: 'Category Created', userId: 'admin_001', userName: 'Admin AgriCare', userRole: 'admin', details: 'Added new livestock category: Duck', timestamp: new Date(Date.now() - 900000), type: 'crud' },
  { id: '3', action: 'Technician Verified', userId: 'admin_001', userName: 'Admin AgriCare', userRole: 'admin', details: 'Verified technician account: Pedro Santos', timestamp: new Date(Date.now() - 3600000), type: 'crud' },
  { id: '4', action: 'User Registration', userId: 'farmer_005', userName: 'Pedro Reyes', userRole: 'farmer', details: 'New farmer registered from Dona Remedios Trinidad', timestamp: new Date(Date.now() - 7200000), type: 'auth' },
  { id: '5', action: 'Appointment Completed', userId: 'tech_001', userName: 'Pedro Santos', userRole: 'technician', details: 'Health Check completed for Manny (Cow) - Juan Dela Cruz', timestamp: new Date(Date.now() - 14400000), type: 'system' },
  { id: '6', action: 'Forum Post Deleted', userId: 'admin_001', userName: 'Admin AgriCare', userRole: 'admin', details: 'Removed spam post from community forum', timestamp: new Date(Date.now() - 28800000), type: 'crud' },
  { id: '7', action: 'FCM Token Error', userId: 'farmer_003', userName: 'Jose Rivera', userRole: 'farmer', details: 'Failed to register push notification token - device not supported', timestamp: new Date(Date.now() - 43200000), type: 'error' },
  { id: '8', action: 'Database Seed', userId: 'admin_001', userName: 'Admin AgriCare', userRole: 'admin', details: 'Mock data seeded: 11 users, 5 technicians, 10 animals, 9 appointments', timestamp: new Date(Date.now() - 86400000), type: 'system' },
  { id: '9', action: 'Report Filed', userId: 'farmer_001', userName: 'Juan Dela Cruz', userRole: 'farmer', details: 'Reported late arrival of technician Mark Dela Cruz', timestamp: new Date(Date.now() - 100800000), type: 'system' },
  { id: '10', action: 'Password Reset', userId: 'farmer_002', userName: 'Maria Garcia', userRole: 'farmer', details: 'Password reset email sent', timestamp: new Date(Date.now() - 172800000), type: 'auth' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Colors.textSecondary, fontSize: FontSize.md },
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  headerCount: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, gap: Spacing.sm, ...Shadow.light,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  // Filters
  filterRow: { marginTop: Spacing.md, maxHeight: 44 },
  filterContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: Colors.white, fontWeight: '700' },
  // List
  list: { flex: 1, paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  // Log Card
  logCard: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.light,
  },
  logIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  logContent: { flex: 1, marginLeft: Spacing.md },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logAction: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, flex: 1 },
  logTime: { fontSize: FontSize.xs, color: Colors.textLight },
  logDetails: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  logUser: { fontSize: 11, color: Colors.textLight },
});

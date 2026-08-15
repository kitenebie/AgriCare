import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
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
  collection?: string;
  documentId?: string;
  changes?: { old: Record<string, any>; new: Record<string, any> } | null;
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
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

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
              <TouchableOpacity key={log.id} style={styles.logCard} activeOpacity={0.7} onPress={() => setSelectedLog(log)}>
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
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Detail Drawer */}
      <Modal visible={!!selectedLog} transparent animationType="slide" onRequestClose={() => setSelectedLog(null)}>
        <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setSelectedLog(null)}>
          <View style={styles.drawer} onStartShouldSetResponder={() => true}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHead}>
              <Text style={styles.drawerTitle}>Log Details</Text>
              <TouchableOpacity onPress={() => setSelectedLog(null)}><Icon name="close" size={22} color={Colors.text} /></TouchableOpacity>
            </View>
            {selectedLog && (() => {
              const config = typeConfig[selectedLog.type] || typeConfig.system;
              const isUpdate = selectedLog.action.toLowerCase().includes('update');
              const isCreate = selectedLog.action.toLowerCase().includes('create');
              const isDelete = selectedLog.action.toLowerCase().includes('delete');
              const HIDDEN_KEYS = ['updatedAt', 'createdAt'];
              const filterKeys = (obj: Record<string, any>) => Object.entries(obj).filter(([k]) => !HIDDEN_KEYS.includes(k));
              const IMAGE_KEYS = ['imageUrl', 'imageURL', 'image_url', 'proofImageUrl'];
              const isImageKey = (key: string) => IMAGE_KEYS.includes(key);
              const isValidUrl = (val: any) => typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));

              return (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get('window').height * 0.55 }}>
                  {/* Basic Info */}
                  <View style={styles.drawerRow}><Text style={styles.drawerLabel}>Action</Text><Text style={styles.drawerValue}>{selectedLog.action}</Text></View>
                  <View style={styles.drawerRow}><Text style={styles.drawerLabel}>Details</Text><Text style={styles.drawerValue}>{selectedLog.details}</Text></View>
                  <View style={styles.drawerRow}><Text style={styles.drawerLabel}>Type</Text><View style={[styles.typeBadge, { backgroundColor: config.color + '15' }]}><Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text></View></View>
                  <View style={styles.drawerRow}><Text style={styles.drawerLabel}>User</Text><Text style={styles.drawerValue}>{selectedLog.userName}</Text></View>
                  <View style={styles.drawerRow}><Text style={styles.drawerLabel}>Role</Text><Text style={styles.drawerValue}>{selectedLog.userRole}</Text></View>
                  <View style={styles.drawerRow}><Text style={styles.drawerLabel}>User ID</Text><Text style={[styles.drawerValue, { fontSize: 11 }]}>{selectedLog.userId}</Text></View>
                  {selectedLog.collection ? <View style={styles.drawerRow}><Text style={styles.drawerLabel}>Collection</Text><Text style={styles.drawerValue}>{selectedLog.collection}</Text></View> : null}
                  {selectedLog.documentId ? <View style={styles.drawerRow}><Text style={styles.drawerLabel}>Doc ID</Text><Text style={[styles.drawerValue, { fontSize: 11 }]}>{selectedLog.documentId}</Text></View> : null}
                  <View style={styles.drawerRow}><Text style={styles.drawerLabel}>Time</Text><Text style={styles.drawerValue}>{formatTime(selectedLog.timestamp)}</Text></View>

                  {/* Changes */}
                  {selectedLog.changes && (
                    <View style={styles.changesSection}>
                      <Text style={styles.changesSectionTitle}>{isUpdate ? 'Changes (Old → New)' : isCreate ? 'Created Data' : 'Deleted Data'}</Text>
                      {isUpdate ? (
                        <View style={styles.changesTable}>
                          <View style={styles.changesHeaderRow}>
                            <Text style={[styles.changesColHeader, { flex: 1.2 }]}>Field</Text>
                            <Text style={[styles.changesColHeader, { flex: 2 }]}>Old</Text>
                            <Text style={[styles.changesColHeader, { flex: 2 }]}>New</Text>
                          </View>
                          {filterKeys(selectedLog.changes.old).map(([key, oldVal]) => (
                            <View key={key} style={styles.changesDataRow}>
                              <Text style={[styles.changesCell, { flex: 1.2, fontWeight: '600' }]}>{key}</Text>
                              {isImageKey(key) && isValidUrl(oldVal) ? (
                                <Image source={{ uri: oldVal }} style={[styles.changeImage, { flex: 2 }]} resizeMode="cover" />
                              ) : (
                                <Text style={[styles.changesCell, { flex: 2, color: '#EF4444' }]}>{Array.isArray(oldVal) ? oldVal.join(', ') : String(oldVal || '-')}</Text>
                              )}
                              {isImageKey(key) && isValidUrl(selectedLog.changes!.new[key]) ? (
                                <Image source={{ uri: selectedLog.changes!.new[key] }} style={[styles.changeImage, { flex: 2 }]} resizeMode="cover" />
                              ) : (
                                <Text style={[styles.changesCell, { flex: 2, color: '#22C55E' }]}>{Array.isArray(selectedLog.changes!.new[key]) ? selectedLog.changes!.new[key].join(', ') : String(selectedLog.changes!.new[key] ?? '-')}</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.changesTable}>
                          <View style={styles.changesHeaderRow}>
                            <Text style={[styles.changesColHeader, { flex: 1.2 }]}>Field</Text>
                            <Text style={[styles.changesColHeader, { flex: 3 }]}>Value</Text>
                          </View>
                          {filterKeys(isCreate ? selectedLog.changes.new : selectedLog.changes.old).map(([key, val]) => (
                            <View key={key} style={styles.changesDataRow}>
                              <Text style={[styles.changesCell, { flex: 1.2, fontWeight: '600' }]}>{key}</Text>
                              {isImageKey(key) && isValidUrl(val) ? (
                                <Image source={{ uri: val }} style={[styles.changeImage, { flex: 3 }]} resizeMode="cover" />
                              ) : (
                                <Text style={[styles.changesCell, { flex: 3 }]}>{Array.isArray(val) ? val.join(', ') : String(val || '-')}</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>
                </KeyboardAvoidingView>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// Sample logs to show when Firestore 'logs' collection is empty
const sampleLogs: LogEntry[] = [];

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
  // Drawer
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  drawer: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40 },
  drawerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: Spacing.md },
  drawerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  drawerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  drawerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  drawerLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, flex: 1 },
  drawerValue: { fontSize: FontSize.sm, color: Colors.text, flex: 2, textAlign: 'right' },
  // Changes Table
  changesSection: { marginTop: Spacing.lg },
  changesSectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  changesTable: { backgroundColor: '#F8FAFC', borderRadius: BorderRadius.lg, padding: Spacing.sm, borderWidth: 1, borderColor: '#E2E8F0' },
  changesHeaderRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 4 },
  changesColHeader: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase' },
  changesDataRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: '#F1F5F9' },
  changesCell: { fontSize: 12, color: Colors.text },
  changeImage: { height: 60, borderRadius: 8, backgroundColor: '#F1F5F9' },
});

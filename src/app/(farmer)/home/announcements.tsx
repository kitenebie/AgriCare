import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { Collections } from '@/services/firebase';

interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: string;
  priority: string;
  createdAt?: any;
}

export default function FarmerAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = firestore()
      .collection(Collections.ANNOUNCEMENTS)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snap) => {
          const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
          // Filter: show announcements for 'all' or 'farmers'
          const filtered = all.filter(a => a.audience === 'all' || a.audience === 'farmers');
          setItems(filtered);
          setLoading(false);
        },
        () => setLoading(false)
      );
    return () => unsub();
  }, []);

  const getPriorityColor = (p: string) =>
    p === 'high' ? '#F44336' : p === 'medium' ? '#FF9800' : '#4CAF50';

  const getPriorityIcon = (p: string) =>
    p === 'high' ? 'alert' : p === 'medium' ? 'bell' : 'check';

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Announcements & Bulletins</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Content */}
      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        <Text style={s.count}>{items.length} announcement{items.length !== 1 ? 's' : ''}</Text>

        {items.length === 0 && (
          <View style={s.empty}>
            <Icon name="bell" size={48} color={Colors.textLight} />
            <Text style={s.emptyTitle}>No Announcements</Text>
            <Text style={s.emptyText}>Check back later for updates from the admin team.</Text>
          </View>
        )}

        {items.map(a => (
          <TouchableOpacity
            key={a.id}
            style={s.card}
            onPress={() => setExpandedId(expandedId === a.id ? null : a.id)}
            activeOpacity={0.8}
          >
            {/* Priority indicator */}
            <View style={[s.priorityBar, { backgroundColor: getPriorityColor(a.priority) }]} />

            <View style={s.cardBody}>
              <View style={s.cardTop}>
                <View style={[s.priorityIcon, { backgroundColor: getPriorityColor(a.priority) + '15' }]}>
                  <Icon name={getPriorityIcon(a.priority) as any} size={16} color={getPriorityColor(a.priority)} />
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardTitle}>{a.title}</Text>
                  <View style={s.cardMeta}>
                    <View style={[s.badge, { backgroundColor: getPriorityColor(a.priority) + '20' }]}>
                      <Text style={[s.badgeText, { color: getPriorityColor(a.priority) }]}>{a.priority}</Text>
                    </View>
                    {a.createdAt && <Text style={s.dateText}>{formatDate(a.createdAt)}</Text>}
                  </View>
                </View>
                <Icon name={expandedId === a.id ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSecondary} />
              </View>

              {/* Expandable content */}
              {expandedId === a.id ? (
                <Text style={s.cardContent}>{a.content}</Text>
              ) : (
                <Text style={s.cardPreview} numberOfLines={2}>{a.content}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  // List
  list: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  count: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  // Empty
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg },
  emptyText: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
  // Card
  card: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, overflow: 'hidden', ...Shadow.light },
  priorityBar: { width: 4, borderTopLeftRadius: BorderRadius.lg, borderBottomLeftRadius: BorderRadius.lg },
  cardBody: { flex: 1, padding: Spacing.lg },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  priorityIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  dateText: { fontSize: 11, color: Colors.textSecondary },
  cardContent: { fontSize: FontSize.sm, color: Colors.text, marginTop: Spacing.md, lineHeight: 20 },
  cardPreview: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18 },
});

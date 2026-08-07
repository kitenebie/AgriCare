import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { Collections } from '@/services/firebase';
import { logCrud } from '@/services/logService';

interface User { id: string; email: string; displayName: string; role: string; status: string; phoneNumber?: string; location?: string; }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = firestore().collection(Collections.USERS).onSnapshot(
      (snap) => { setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const filtered = users.filter(u => {
    const matchFilter = filter === 'all' || u.role === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete User', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await firestore().collection(Collections.USERS).doc(id).delete();
          await logCrud('User Deleted', `Deleted user: ${name}`, 'users', id);
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const getStatusColor = (status: string) => {
    if (status === 'active' || status === 'verified') return '#4CAF50';
    if (status === 'pending') return '#FF9800';
    return '#9E9E9E';
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /><Text style={s.loadText}>Loading users...</Text></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} /></TouchableOpacity>
        <Text style={s.headerTitle}>User Management</Text>
        <Text style={s.count}>{users.length}</Text>
      </View>

      <View style={s.searchRow}>
        <Icon name="search" size={16} color={Colors.textLight} />
        <TextInput style={s.searchInput} placeholder="Search users..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {['all', 'admin', 'farmer', 'technician'].map(f => (
          <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && <View style={s.empty}><Icon name="profile" size={48} color={Colors.textLight} /><Text style={s.emptyText}>No users found</Text></View>}
        {filtered.map(u => (
          <View key={u.id} style={s.card}>
            <Avatar name={u.displayName || u.email} size={40} />
            <View style={s.cardInfo}>
              <Text style={s.userName}>{u.displayName || 'No name'}</Text>
              <Text style={s.userEmail}>{u.email}</Text>
              <View style={s.cardMeta}>
                <View style={[s.roleBadge, { backgroundColor: u.role === 'admin' ? '#E3F2FD' : u.role === 'farmer' ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Text style={[s.roleText, { color: u.role === 'admin' ? '#1565C0' : u.role === 'farmer' ? '#2E7D32' : '#E65100' }]}>{u.role}</Text>
                </View>
                <View style={[s.statusDot, { backgroundColor: getStatusColor(u.status) }]} />
                <Text style={s.statusLabel}>{u.status}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(u.id, u.displayName || u.email)}>
              <Icon name="close" size={14} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadText: { marginTop: 12, color: Colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  count: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm, ...Shadow.light },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  filterScroll: { maxHeight: 44, marginTop: Spacing.md },
  filterContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  filterBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white, fontWeight: '700' },
  list: { flex: 1, paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.light },
  cardInfo: { flex: 1, marginLeft: Spacing.md },
  userName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  userEmail: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleText: { fontSize: 10, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 10, color: Colors.textSecondary },
  delBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.error + '15', justifyContent: 'center', alignItems: 'center' },
});

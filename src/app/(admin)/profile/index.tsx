import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { seedAll } from '@/services/seedDatabase';

export default function AdminProfileScreen() {

  const handleSeed = async () => {
    try {
      await seedAll();
      Alert.alert('Success', 'Database seeded!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Avatar name="Admin AgriCare" size={80} />
        <Text style={styles.name}>Admin AgriCare</Text>
        <Text style={styles.role}>System Administrator</Text>
      </View>
      <View style={styles.menu}>
        <MenuItem icon="profile" label="Account Settings" />
        <MenuItem icon="bell" label="Notification Settings" />
        <MenuItem icon="lock" label="Security" />
        <TouchableOpacity style={styles.menuItem} onPress={handleSeed}>
          <View style={styles.menuIcon}><Icon name="dna" size={18} color="#FF9800" /></View>
          <Text style={styles.menuLabel}>Seed Database (Dev)</Text>
          <Icon name="chevron-right" size={18} color={Colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.replace('/')}>
          <View style={[styles.menuIcon, { backgroundColor: '#FFEBEE' }]}><Icon name="logout" size={18} color={Colors.error} /></View>
          <Text style={[styles.menuLabel, { color: Colors.error }]}>Log Out</Text>
          <Icon name="chevron-right" size={18} color={Colors.textLight} />
        </TouchableOpacity>
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const MenuItem = ({ icon, label }: { icon: any; label: string }) => (
  <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
    <View style={styles.menuIcon}><Icon name={icon} size={18} color={Colors.primary} /></View>
    <Text style={styles.menuLabel}>{label}</Text>
    <Icon name="chevron-right" size={18} color={Colors.textLight} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { alignItems: 'center', paddingVertical: Spacing.xxxl, backgroundColor: Colors.primary, borderBottomLeftRadius: BorderRadius.xl * 2, borderBottomRightRadius: BorderRadius.xl * 2 },
  name: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white, marginTop: Spacing.md },
  role: { fontSize: FontSize.md, color: Colors.accent, marginTop: 2 },
  menu: { marginHorizontal: Spacing.lg, marginTop: Spacing.xl, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, ...Shadow.light },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  menuLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
});

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon } from '@/components/ui';

export default function RolesScreen() {

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Auth & Role Management</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Manage authentication and user roles</Text>
        <View style={styles.placeholder}>
          <Icon name="clipboard" size={48} color={Colors.textLight} />
          <Text style={styles.placeholderText}>Content for Auth & Role Management will be here</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg, paddingBottom: Spacing.xl,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  content: { flex: 1, padding: Spacing.lg },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  placeholderText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg, textAlign: 'center' },
});

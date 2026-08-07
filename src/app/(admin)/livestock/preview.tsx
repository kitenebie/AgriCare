import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { logCrud } from '@/services/logService';
import { Collections } from '@/services/firebase';

const typeOptions = [
  { value: 'large', label: 'Large Animal', color: '#4CAF50' },
  { value: 'small', label: 'Small Animal', color: '#FF9800' },
  { value: 'poultry', label: 'Poultry', color: '#2196F3' },
  { value: 'cow', label: 'Cattle / Cow', color: '#1D4ED8' },
  { value: 'swine', label: 'Swine / Pig', color: '#DB2777' },
  { value: 'other', label: 'Other', color: '#607D8B' },
];

export default function LivestockPreviewForm() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    type?: string;
    breeds?: string;
    description?: string;
    count?: string;
  }>();

  const isEditing = !!params.id;

  const [name, setName] = useState(params.name || '');
  const [type, setType] = useState(params.type || 'cow');
  const [breeds, setBreeds] = useState(params.breeds?.replace(/,/g, ', ') || '');
  const [description, setDescription] = useState(params.description || '');
  const [saving, setSaving] = useState(false);

  const selectedType = typeOptions.find((t) => t.value === type) || typeOptions[0];
  const breedList = breeds.split(',').map((b) => b.trim()).filter((b) => b.length > 0);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Category name is required.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        focusType: type,
        breeds: breedList,
        description: description.trim(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (isEditing && params.id) {
        await firestore().collection(Collections.LIVESTOCK_CATEGORIES).doc(params.id).update(data);
        await logCrud('Category Updated', 'Updated: ' + name.trim(), 'livestockCategories', params.id);
        Alert.alert('Updated', `"${name.trim()}" has been updated.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await firestore().collection(Collections.LIVESTOCK_CATEGORIES).add({
          ...data,
          count: 0,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        await logCrud('Category Created', 'Added: ' + name.trim(), 'livestockCategories');
        Alert.alert('Added', `"${name.trim()}" has been added.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!params.id) return;
    Alert.alert('Delete Category', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore().collection(Collections.LIVESTOCK_CATEGORIES).doc(params.id).delete();
            await logCrud('Category Deleted', 'Deleted: ' + name, 'livestockCategories', params.id);
            Alert.alert('Deleted', 'Category removed.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Category' : 'Add Category'}</Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleDelete}>
            <Icon name="close" size={20} color="#FFCDD2" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Live Preview Card */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>PREVIEW</Text>
          <View style={styles.previewContent}>
            <View style={[styles.previewIcon, { backgroundColor: selectedType.color + '18' }]}>
              <Icon name="hen" size={28} color={selectedType.color} />
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{name || 'Category Name'}</Text>
              <View style={styles.previewMeta}>
                <View style={[styles.previewBadge, { backgroundColor: selectedType.color + '20' }]}>
                  <Text style={[styles.previewBadgeText, { color: selectedType.color }]}>
                    {selectedType.label}
                  </Text>
                </View>
                <Text style={styles.previewBreedCount}>{breedList.length} breeds</Text>
                {isEditing && <Text style={styles.previewBreedCount}>{params.count || 0} animals</Text>}
              </View>
              <Text style={styles.previewBreeds} numberOfLines={1}>
                {breedList.length > 0 ? breedList.join(', ') : 'No breeds added yet'}
              </Text>
              {description.trim() ? (
                <Text style={styles.previewDesc} numberOfLines={2}>{description}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Category Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Cow, Goat, Chicken, Pig..."
            placeholderTextColor={Colors.textLight}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Animal Type *</Text>
          <View style={styles.typeList}>
            {typeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.typeBtn, type === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '10' }]}
                onPress={() => setType(opt.value)}
              >
                <View style={[styles.typeDot, { backgroundColor: opt.color }]} />
                <Text style={[styles.typeBtnText, type === opt.value && { color: opt.color, fontWeight: '700' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Breeds (comma separated)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Holstein Friesian, Brahman, Native..."
            placeholderTextColor={Colors.textLight}
            value={breeds}
            onChangeText={setBreeds}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Brief description of this category..."
            placeholderTextColor={Colors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>{isEditing ? 'Update Category' : 'Save Category'}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl,
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  body: { flex: 1, paddingHorizontal: Spacing.xl },
  // Preview
  previewCard: {
    backgroundColor: '#F0FAF0', borderRadius: BorderRadius.xl, padding: Spacing.lg,
    marginTop: Spacing.xl, borderWidth: 1, borderColor: '#C8E6C9', borderStyle: 'dashed',
  },
  previewLabel: { fontSize: 10, color: Colors.primary, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.md },
  previewContent: { flexDirection: 'row', alignItems: 'center' },
  previewIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  previewInfo: { flex: 1, marginLeft: Spacing.md },
  previewName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  previewBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  previewBadgeText: { fontSize: 10, fontWeight: '700' },
  previewBreedCount: { fontSize: 11, color: Colors.textSecondary },
  previewBreeds: { fontSize: 11, color: Colors.textLight, marginTop: 3 },
  previewDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  // Form
  form: { marginTop: Spacing.xxl },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2, fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeList: { gap: Spacing.sm },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border,
  },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  typeBtnText: { fontSize: FontSize.md, color: Colors.textSecondary },
  // Save
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: Spacing.lg + 2, alignItems: 'center', marginTop: Spacing.xxl },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});

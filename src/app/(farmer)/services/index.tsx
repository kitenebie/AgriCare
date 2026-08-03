import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, IconName } from '@/components/ui';
import { useFadeInUp } from '@/hooks/useAnimatedEntry';

interface ServiceItem {
  id: string;
  name: string;
  iconName: IconName;
}

const serviceTypes: ServiceItem[] = [
  { id: '1', name: 'Health Check', iconName: 'health-check' },
  { id: '2', name: 'Vaccination', iconName: 'vaccination' },
  { id: '3', name: 'Treatment', iconName: 'treatment' },
  { id: '4', name: 'De-worming', iconName: 'bug' },
  { id: '5', name: 'Artificial\nInsemination', iconName: 'dna' },
  { id: '6', name: 'Others', iconName: 'dots' },
];

export default function ServicesScreen() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const contentAnim = useFadeInUp(200);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Service</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={contentAnim}>
          {/* Select Service Type */}
          <Text style={styles.sectionTitle}>Select Service Type</Text>
          <View style={styles.serviceGrid}>
            {serviceTypes.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceItem,
                  selectedService === service.id && styles.serviceItemActive,
                ]}
                onPress={() => setSelectedService(service.id)}
              >
                <View style={[
                  styles.serviceIconBox,
                  selectedService === service.id && styles.serviceIconBoxActive,
                ]}>
                  <Icon
                    name={service.iconName}
                    size={28}
                    color={selectedService === service.id ? Colors.white : Colors.primary}
                    strokeWidth={1.5}
                  />
                </View>
                <Text style={[
                  styles.serviceName,
                  selectedService === service.id && styles.serviceNameActive,
                ]}>
                  {service.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Select Animal */}
          <Text style={styles.sectionTitle}>Select Animal</Text>
          <TouchableOpacity style={styles.selectRow}>
            <View style={styles.selectRowLeft}>
              <Image
                source={require('../../../../assets/app/man.png')}
                style={styles.animalThumb}
                contentFit="cover"
              />
              <Text style={styles.selectRowText}>Manny (Cow)</Text>
            </View>
            <Icon name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Preferred Date */}
          <Text style={styles.sectionTitle}>Preferred Date</Text>
          <TouchableOpacity style={styles.selectRow}>
            <View style={styles.selectRowLeft}>
              <Icon name="calendar" size={20} color={Colors.textSecondary} />
              <Text style={styles.selectRowText}>May 28, 2025</Text>
            </View>
          </TouchableOpacity>

          {/* Preferred Time */}
          <Text style={styles.sectionTitle}>Preferred Time</Text>
          <TouchableOpacity style={styles.selectRow}>
            <View style={styles.selectRowLeft}>
              <Icon name="clock" size={20} color={Colors.textSecondary} />
              <Text style={styles.selectRowText}>09:00 AM – 12:00 PM</Text>
            </View>
          </TouchableOpacity>

          {/* Describe Issue */}
          <Text style={styles.sectionTitle}>Describe the Issue / Request</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Please describe the issue or service needed..."
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Submit */}
          <TouchableOpacity style={styles.submitButton} activeOpacity={0.8}>
            <Text style={styles.submitButtonText}>Submit Request</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceItem: {
    width: '31%',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  serviceItemActive: {},
  serviceIconBox: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  serviceIconBoxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  serviceName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 14,
  },
  serviceNameActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  selectRowText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  animalThumb: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 100,
    backgroundColor: Colors.white,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});

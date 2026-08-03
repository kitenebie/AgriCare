import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, IconName } from '@/components/ui';
import { Appointment } from '@/types';
import { getStatusColor } from '@/utils/helpers';
import { useFadeInUp } from '@/hooks/useAnimatedEntry';

const serviceIconMap: Record<string, IconName> = {
  'Health Check': 'health-check',
  'Vaccination': 'vaccination',
  'Treatment': 'treatment',
  'De-worming': 'bug',
  'Artificial Insemination': 'dna',
};

interface AppointmentCardProps {
  appointment: Appointment;
  index: number;
  onPress?: () => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, index, onPress }) => {
  const animatedStyle = useFadeInUp(index * 120);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.statusBar, { backgroundColor: getStatusColor(appointment.status) }]} />
        <View style={styles.iconContainer}>
          <Icon
            name={serviceIconMap[appointment.serviceType] || 'clipboard'}
            size={22}
            color={Colors.primary}
          />
        </View>
        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={[styles.status, { color: getStatusColor(appointment.status) }]}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.serviceType}>{appointment.serviceType}</Text>
          <Text style={styles.animal}>Animal: {appointment.animalName}</Text>
          <View style={styles.dateRow}>
            <Icon name="calendar" size={12} color={Colors.textSecondary} />
            <Text style={styles.date}>{appointment.date}</Text>
          </View>
          <View style={styles.dateRow}>
            <Icon name="clock" size={12} color={Colors.textSecondary} />
            <Text style={styles.date}>{appointment.time}</Text>
          </View>
          <Text style={styles.technician}>Technician: {appointment.technician}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={Colors.textLight} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadow.light,
  },
  content: {
    flexDirection: 'row',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  status: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  serviceType: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  animal: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  technician: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
});

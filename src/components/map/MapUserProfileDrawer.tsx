import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/ui/FontScale';
import { Avatar, Icon, type IconName } from '@/components/ui';
import { BorderRadius, Colors, FontSize, Shadow, Spacing } from '@/constants/theme';

export interface MapProfileUser {
  id: string;
  displayName: string;
  photoURL?: string;
  location?: string;
  phoneNumber?: string;
  specialization?: string;
  expertise?: string[];
  rating?: number;
  reviewCount?: number;
}

interface MapUserProfileDrawerProps {
  user: MapProfileUser | null;
  userType: 'Farmer' | 'Technician';
  onClose: () => void;
  onMessage: () => void;
  onRequestService?: () => void;
  statusLabel?: string;
}

const DetailCard = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => (
  <View style={s.detailCard}>
    <View style={s.detailIcon}><Icon name={icon} size={18} color={Colors.primary} /></View>
    <View style={s.detailCopy}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  </View>
);

export const MapUserProfileDrawer: React.FC<MapUserProfileDrawerProps> = ({ user, userType, onClose, onMessage, onRequestService, statusLabel = 'Online now' }) => {
  const insets = useSafeAreaInsets();
  const specializations = user?.expertise?.length
    ? user.expertise
    : user?.specialization?.split(',').map(item => item.trim()).filter(Boolean) || [];

  return (
    <Modal visible={!!user} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close profile drawer" />
        <View style={[s.drawer, { paddingTop: Math.max(insets.top, Spacing.lg), paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <View style={s.header}>
            <View>
              <Text style={s.kicker}>AGRICARE • LIVE MAP</Text>
              <Text style={s.title}>{userType} Profile</Text>
            </View>
            <TouchableOpacity style={s.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close profile drawer" hitSlop={6}>
              <Icon name="close" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
          {user && (
            <>
              <ScrollView style={s.content} contentContainerStyle={s.contentInner} showsVerticalScrollIndicator={false}>
                <View style={s.profileCard}>
                  <View style={s.avatarFrame}><Avatar name={user.displayName} imageUrl={user.photoURL} size={82} /></View>
                  <Text style={s.name}>{user.displayName}</Text>
                  <View style={s.onlineBadge}><View style={s.onlineDot} /><Text style={s.onlineText}>{statusLabel}</Text></View>
                </View>
                <DetailCard icon="profile" label="Account type" value={userType} />
                {!!user.location && <DetailCard icon="location" label="Location" value={user.location} />}
                {!!user.phoneNumber && <DetailCard icon="phone" label="Phone number" value={user.phoneNumber} />}
                {userType === 'Technician' && specializations.length > 0 && (
                  <View style={s.detailCard}>
                    <View style={s.detailIcon}><Icon name="health-check" size={18} color={Colors.primary} /></View>
                    <View style={s.detailCopy}>
                      <Text style={s.detailLabel}>Specializations</Text>
                      <View style={s.tagList}>{specializations.map((item, index) => <View key={`${item}-${index}`} style={s.tag}><Text style={s.tagText}>{item}</Text></View>)}</View>
                    </View>
                  </View>
                )}
                {userType === 'Technician' && (
                  <DetailCard
                    icon="star"
                    label="Rating and reviews"
                    value={typeof user.rating === 'number' ? `${user.rating.toFixed(1)} stars · ${user.reviewCount || 0} reviews` : 'No reviews yet'}
                  />
                )}
              </ScrollView>
              {userType === 'Technician' && onRequestService && (
                <TouchableOpacity style={s.requestButton} onPress={onRequestService} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Request service from ${user.displayName}`}>
                  <Icon name="services" size={20} color={Colors.white} />
                  <Text style={s.messageText}>Request Service</Text>
                  <Icon name="chevron-right" size={18} color={Colors.white} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.messageButton} onPress={onMessage} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`Message ${user.displayName}`}>
                <Icon name="messages" size={20} color={Colors.white} />
                <Text style={s.messageText}>Message {user.displayName}</Text>
                <Icon name="chevron-right" size={18} color={Colors.white} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9, 25, 17, 0.58)' },
  drawer: { height: '95%', backgroundColor: Colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden', ...Shadow.heavy },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  kicker: { color: '#D6F4DE', fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.8 },
  title: { color: Colors.white, fontSize: FontSize.xl, fontWeight: '800', marginTop: 2 },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  content: { flex: 1 },
  contentInner: { padding: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.md },
  profileCard: { alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.light },
  avatarFrame: { padding: 4, borderRadius: 48, backgroundColor: Colors.white, ...Shadow.light },
  name: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', textAlign: 'center', marginTop: Spacing.sm },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: '#E8F5E9' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  onlineText: { color: Colors.primaryDark, fontSize: FontSize.xs, fontWeight: '700' },
  detailCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadow.light },
  detailIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9' },
  detailCopy: { flex: 1, gap: 4 },
  detailLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },
  detailValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  tag: { backgroundColor: '#E8F5E9', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  tagText: { color: Colors.primaryDark, fontSize: FontSize.sm, fontWeight: '600' },
  messageButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.full, backgroundColor: Colors.primary, ...Shadow.medium },
  requestButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.full, backgroundColor: Colors.primaryDark, ...Shadow.medium },
  messageText: { flex: 1, color: Colors.white, fontSize: FontSize.md, fontWeight: '700', textAlign: 'center' },
});

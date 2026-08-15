import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Switch, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { modalAlert } from '@/components/ui/ModalAlert';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { clearSession, getSession, saveSession, UserSession } from '@/services/sessionService';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const BIOMETRICS_KEY = '@agricare_biometrics_enabled';
const NOTIFICATIONS_KEY = '@agricare_notifications_enabled';

export default function TechnicianProfileScreen() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [photoURL, setPhotoURL] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Account Settings
  const [accountModal, setAccountModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [saving, setSaving] = useState(false);

  // Security
  const [securityModal, setSecurityModal] = useState(false);
  const [biometrics, setBiometrics] = useState(false);

  // Notifications
  const [notifModal, setNotifModal] = useState(false);
  const [notifsEnabled, setNotifsEnabled] = useState(true);

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      setUser(session);
      if (session) {
        setEditName(session.displayName);
        setEditEmail(session.email);
        try {
          const uid = auth().currentUser?.uid || session.uid;
          const doc = await firestore().collection('users').doc(uid).get();
          if (doc.exists) {
            const data = doc.data();
            if (data?.photoURL) setPhotoURL(data.photoURL);
            if (data?.phoneNumber) setEditPhone(data.phoneNumber);
            if (data?.location) setEditLocation(data.location);
          }
        } catch (e) {}
      }
      const bio = await AsyncStorage.getItem(BIOMETRICS_KEY);
      setBiometrics(bio === 'true');
      const notif = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      setNotifsEnabled(notif !== 'false');
      setLoading(false);
    };
    load();
  }, []);

  // ─── Logout ───
  const handleLogout = () => {
    modalAlert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          try {
            await clearSession();
            await auth().signOut();
          } catch (e) {}
          router.replace('/');
        }
      },
    ]);
  };

  // ─── Account Settings Save ───
  const handleSaveAccount = async () => {
    if (!editName.trim()) { modalAlert('Error', 'Name cannot be empty.'); return; }
    setSaving(true);
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        await currentUser.updateProfile({ displayName: editName.trim() });
        await firestore().collection('users').doc(currentUser.uid).update({
          displayName: editName.trim(),
          phoneNumber: editPhone.trim(),
          location: editLocation.trim()
        });
      }
      if (user) {
        const updated: UserSession = { ...user, displayName: editName.trim() };
        await saveSession(updated);
        setUser(updated);
      }
      modalAlert('Success', 'Profile updated.');
      setAccountModal(false);
    } catch (e: any) { modalAlert('Error', e.message); }
    finally { setSaving(false); }
  };

  // ─── Security ───
  const handleBiometricsToggle = async (enable: boolean) => {
    if (enable) {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) { modalAlert('Not Supported', 'This device does not support biometric authentication.'); return; }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) { modalAlert('Not Set Up', 'No biometrics enrolled on this device. Please set up fingerprint or face in your device settings.'); return; }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Verify to enable biometrics', fallbackLabel: 'Use passcode' });
      if (!result.success) return;
      setBiometrics(true);
      await AsyncStorage.setItem(BIOMETRICS_KEY, 'true');
      modalAlert('Enabled', 'Biometric login is now active.');
    } else {
      setBiometrics(false);
      await AsyncStorage.setItem(BIOMETRICS_KEY, 'false');
    }
  };

  // ─── Notifications ───
  const handleNotifsToggle = async (val: boolean) => {
    setNotifsEnabled(val);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, val ? 'true' : 'false');
  };

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Avatar name={user?.displayName || 'Technician'} imageUrl={photoURL} size={80} />
        <Text style={styles.name}>{user?.displayName || 'Technician'}</Text>
        <Text style={styles.role}>{user?.role || 'technician'}</Text>
      </View>
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setAccountModal(true)}>
          <View style={styles.menuIcon}><Icon name="profile" size={18} color={Colors.primary} /></View>
          <Text style={styles.menuLabel}>Account Settings</Text>
          <Icon name="chevron-right" size={18} color={Colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setNotifModal(true)}>
          <View style={styles.menuIcon}><Icon name="bell" size={18} color={Colors.primary} /></View>
          <Text style={styles.menuLabel}>Notification Settings</Text>
          <Icon name="chevron-right" size={18} color={Colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setSecurityModal(true)}>
          <View style={styles.menuIcon}><Icon name="lock" size={18} color={Colors.primary} /></View>
          <Text style={styles.menuLabel}>Security</Text>
          <Icon name="chevron-right" size={18} color={Colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <View style={[styles.menuIcon, { backgroundColor: '#FFEBEE' }]}><Icon name="logout" size={18} color={Colors.error} /></View>
          <Text style={[styles.menuLabel, { color: Colors.error }]}>Log Out</Text>
          <Icon name="chevron-right" size={18} color={Colors.textLight} />
        </TouchableOpacity>
      </View>
      <View style={{ height: 30 }} />

      {/* Account Settings Modal */}
      <Modal visible={accountModal} transparent animationType="slide">
        <View style={styles.overlay}><View style={styles.modal}>
          <View style={styles.modalHead}><Text style={styles.modalTitle}>Account Settings</Text><TouchableOpacity onPress={() => setAccountModal(false)}><Icon name="close" size={22} color={Colors.text} /></TouchableOpacity></View>
          <Text style={styles.label}>Display Name</Text>
          <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Your name" placeholderTextColor={Colors.textLight} />
          <Text style={styles.label}>Email</Text>
          <TextInput style={[styles.input, { color: Colors.textLight }]} value={editEmail} editable={false} />
          <Text style={{ fontSize: 11, color: Colors.textLight, marginTop: 4 }}>Email cannot be changed</Text>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="09xxxxxxxxx" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" />
          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={editLocation} onChangeText={setEditLocation} placeholder="Your location" placeholderTextColor={Colors.textLight} />
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveAccount} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </View></View>
      </Modal>

      {/* Security Modal */}
      <Modal visible={securityModal} transparent animationType="slide">
        <View style={styles.overlay}><View style={styles.modal}>
          <View style={styles.modalHead}><Text style={styles.modalTitle}>Security</Text><TouchableOpacity onPress={() => setSecurityModal(false)}><Icon name="close" size={22} color={Colors.text} /></TouchableOpacity></View>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Biometric Authentication</Text>
              <Text style={styles.settingDesc}>Use fingerprint or face to unlock</Text>
            </View>
            <Switch value={biometrics} onValueChange={handleBiometricsToggle} trackColor={{ false: '#E2E8F0', true: Colors.primary + '80' }} thumbColor={biometrics ? Colors.primary : '#f4f4f4'} />
          </View>
        </View></View>
      </Modal>

      {/* Notification Modal */}
      <Modal visible={notifModal} transparent animationType="slide">
        <View style={styles.overlay}><View style={styles.modal}>
          <View style={styles.modalHead}><Text style={styles.modalTitle}>Notifications</Text><TouchableOpacity onPress={() => setNotifModal(false)}><Icon name="close" size={22} color={Colors.text} /></TouchableOpacity></View>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Receive alerts for updates and messages</Text>
            </View>
            <Switch value={notifsEnabled} onValueChange={handleNotifsToggle} trackColor={{ false: '#E2E8F0', true: Colors.primary + '80' }} thumbColor={notifsEnabled ? Colors.primary : '#f4f4f4'} />
          </View>
        </View></View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { alignItems: 'center', paddingVertical: Spacing.xxxl, backgroundColor: Colors.primary, borderBottomLeftRadius: BorderRadius.xl * 2, borderBottomRightRadius: BorderRadius.xl * 2 },
  name: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white, marginTop: Spacing.md },
  role: { fontSize: FontSize.md, color: Colors.accent, marginTop: 2, textTransform: 'capitalize' },
  menu: { marginHorizontal: Spacing.lg, marginTop: Spacing.xl, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, ...Shadow.light },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  menuLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border, color: Colors.text },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.xxl },
  saveBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  settingLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  settingDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 }
});

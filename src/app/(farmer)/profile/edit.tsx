import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { AppText as Text, AppTextInput as TextInput } from '@/components/ui/FontScale';
import { Icon } from '@/components/ui';
import { Colors, FontSize, BorderRadius, Spacing } from '@/constants/theme';
import { modalAlert } from '@/components/ui/ModalAlert';
import IdentityVerificationResult from '@/components/auth/IdentityVerificationResult';
import LiveFaceCapture from '@/components/auth/LiveFaceCapture';
import { callBackend } from '@/services/backendApi';
import { getSession, saveSession } from '@/services/sessionService';

type ProfileChanges = { displayName: string; phoneNumber: string; location: string };

export default function FarmerEditProfileScreen() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [purok, setPurok] = useState('1');
  const [currentProfilePhotoUrl, setCurrentProfilePhotoUrl] = useState('');
  const [pendingProfile, setPendingProfile] = useState<ProfileChanges | null>(null);
  const [challengeToken, setChallengeToken] = useState('');
  const [faceUri, setFaceUri] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [matchStatus, setMatchStatus] = useState<'checking' | 'matched' | 'failed'>('checking');
  const [matchFailureKind, setMatchFailureKind] = useState<'mismatch' | 'image' | 'service' | 'registration'>('service');
  const [matchMessage, setMatchMessage] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const session = await getSession();
        if (!session) { router.replace('/(auth)/login' as any); return; }
        const snapshot = await firestore().collection('users').doc(session.uid).get();
        if (!snapshot.exists) throw new Error('Your profile could not be loaded.');
        const user = snapshot.data();
        if (active) {
          setEmail(user?.email || session.email || '');
          setDisplayName(user?.displayName || session.displayName || '');
          setPhoneNumber(user?.phoneNumber || '');
          setPurok(user?.location?.match(/^Purok\s+([1-7])/i)?.[1] || '1');
          setCurrentProfilePhotoUrl(user?.photoURL || '');
        }
      } catch (error: any) {
        if (active) modalAlert('Could Not Load Profile', error.message || 'Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const profileChanges = useCallback((): ProfileChanges | null => {
    const name = displayName.trim();
    const phone = phoneNumber.trim();
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'-]*$/.test(name)) {
      modalAlert('Invalid Name', 'Enter a valid full name.');
      return null;
    }
    if (!/^09\d{9}$/.test(phone)) {
      modalAlert('Invalid Phone Number', 'Enter an 11-digit mobile number beginning with 09.');
      return null;
    }
    if (!currentProfilePhotoUrl) {
      modalAlert('Profile Photo Required', 'Add a current profile photo before updating your profile.');
      return null;
    }
    return { displayName: name, phoneNumber: phone, location: `Purok ${purok}, Gabao, Irosin, Sorsogon` };
  }, [displayName, phoneNumber, currentProfilePhotoUrl, purok]);

  const beginVerification = async (changes: ProfileChanges) => {
    setSaving(true);
    try {
      const challenge = await callBackend<{ challengeToken: string }>('startFarmerProfileVerification', { profile: changes });
      setPendingProfile(changes);
      setChallengeToken(challenge.challengeToken);
      setFaceUri('');
      setShowResult(false);
      setShowCapture(true);
    } catch (error: any) {
      modalAlert('Unable to Start Verification', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChanges = () => {
    const changes = profileChanges();
    if (changes) void beginVerification(changes);
  };

  const handleFaceCapture = async (uri: string) => {
    setShowCapture(false);
    setFaceUri(uri);
    setMatchStatus('checking');
    setMatchMessage('Comparing your new selfie with your current profile photo.');
    setShowResult(true);
    setSaving(true);
    try {
      if (!pendingProfile || !challengeToken) throw new Error('Verification expired. Start again.');
      console.info('[Profile Selfie Match] Sending farmer update request', { capturedDataUri: uri.startsWith('data:image/') });
      const savedProfile = await callBackend<{ photoURL: string }>('completeFarmerProfileVerification', { profile: pendingProfile, challengeToken, faceImage: uri });
      setMatchStatus('matched');
      setMatchMessage('Your profile photos matched. Your changes and new profile selfie are saved.');
      try {
        const session = await getSession();
        if (session) await saveSession({ ...session, displayName: pendingProfile.displayName });
        await auth().currentUser?.updateProfile({ displayName: pendingProfile.displayName, photoURL: savedProfile.photoURL });
      } catch (error) {
        console.warn('[Profile] Saved profile, but local session refresh failed', error);
      }
    } catch (error: any) {
      const detail = error.message || 'Profile photo verification could not be completed.';
      console.warn('[Profile Photo Match] Farmer profile verification rejected', detail);
      setMatchFailureKind(/detect|image|readable|clear|photo|selfie/i.test(detail) ? 'image' : /match|face|ID/i.test(detail) ? 'mismatch' : 'service');
      setMatchStatus('failed');
      setMatchMessage(detail);
    } finally {
      setSaving(false);
    }
  };

  const retryVerification = () => {
    if (!pendingProfile || !challengeToken) return;
    setFaceUri('');
    setShowResult(false);
    setShowCapture(true);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (showCapture) return <LiveFaceCapture onCapture={handleFaceCapture} onClose={() => setShowCapture(false)} />;
  if (showResult) return (
    <IdentityVerificationResult
      status={matchStatus}
      failureKind={matchFailureKind}
      message={matchMessage}
      faceUri={currentProfilePhotoUrl}
      idUri={faceUri}
      profileComparison
      emailOtpPending={false}
      successTitle="Profile Updated Successfully"
      successMessage="Your new selfie matched your current profile photo. Your profile has been updated successfully."
      primaryLabel="Back to Profile"
      onPrimary={() => router.replace('/(farmer)/profile' as any)}
      onRetry={retryVerification}
      onCancel={() => { setShowResult(false); setChallengeToken(''); setPendingProfile(null); }}
      onSupport={() => modalAlert('Contact Support', 'Please contact your AgriCare administrator for assistance.')}
    />
  );

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backButton} accessibilityRole="button" accessibilityLabel="Back to profile">
          <Icon name="chevron-left" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.intro}>Update your contact details. A newly captured selfie must match your current profile photo before saving.</Text>
        <View style={s.avatarSection}>
          <Text style={s.label}>Current Profile Photo *</Text>
          {currentProfilePhotoUrl ? <ExpoImage source={{ uri: currentProfilePhotoUrl }} style={s.profileAvatar} contentFit="cover" cachePolicy="none" accessibilityLabel="Current profile photo avatar" /> : null}
          <Text style={s.avatarNote}>Your new selfie is compared with this saved profile photo before any changes are saved.</Text>
        </View>
        <Text style={s.label}>Full Name *</Text>
        <TextInput style={s.input} value={displayName} onChangeText={setDisplayName} placeholder="Your full name" />
        <Text style={s.label}>Email Address</Text>
        <TextInput style={[s.input, s.readonly]} value={email} editable={false} />
        <Text style={s.note}>Email changes require a separate verified email process.</Text>
        <Text style={s.label}>Phone Number *</Text>
        <TextInput style={s.input} value={phoneNumber} onChangeText={value => setPhoneNumber(value.replace(/\D/g, '').slice(0, 11))} placeholder="09XXXXXXXXX" keyboardType="number-pad" maxLength={11} />
        <Text style={s.label}>Purok *</Text>
        <View style={s.purokRow}>{Array.from({ length: 7 }, (_, index) => String(index + 1)).map(value => (
          <TouchableOpacity key={value} onPress={() => setPurok(value)} style={[s.purok, purok === value && s.purokSelected]} accessibilityRole="button" accessibilityState={{ selected: purok === value }}>
            <Text style={[s.purokText, purok === value && s.purokTextSelected]}>{value}</Text>
          </TouchableOpacity>
        ))}</View>
        <Text style={s.address}>Gabao, Irosin, Sorsogon</Text>
        <TouchableOpacity style={[s.saveButton, saving && s.disabled]} onPress={handleSaveChanges} disabled={saving} accessibilityRole="button">
          {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={s.saveText}>Verify Face and Save Changes</Text>}
        </TouchableOpacity>
        <Text style={s.note}>Your current or replacement ID is used only for matching. Profile changes remain unsaved until verification passes.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, backgroundColor: Colors.primary },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  content: { padding: Spacing.lg, paddingBottom: 36 },
  intro: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 22, marginBottom: Spacing.lg },
  label: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginTop: Spacing.md, marginBottom: Spacing.xs },
  input: { minHeight: 52, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, backgroundColor: Colors.white, color: Colors.text, fontSize: FontSize.md },
  readonly: { color: Colors.textLight },
  note: { color: Colors.textLight, fontSize: FontSize.xs, lineHeight: 18, marginTop: Spacing.xs },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.md },
  profileAvatar: { width: 112, height: 112, marginTop: Spacing.xs, borderRadius: 56, borderWidth: 3, borderColor: Colors.primary, backgroundColor: Colors.border },
  avatarNote: { color: Colors.textLight, fontSize: FontSize.xs, lineHeight: 18, textAlign: 'center', marginTop: Spacing.sm, maxWidth: 300 },
  purokRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  purok: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  purokSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  purokText: { color: Colors.text, fontWeight: '700' },
  purokTextSelected: { color: Colors.white },
  address: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.sm },
  saveButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl, borderRadius: BorderRadius.full, backgroundColor: Colors.primary },
  saveText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  disabled: { opacity: 0.65 },
});

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';

type Props = {
  status: 'checking' | 'matched' | 'failed';
  failureKind: 'mismatch' | 'image' | 'service' | 'registration';
  message: string;
  faceUri: string;
  idUri: string;
  emailOtpPending: boolean;
  onPrimary: () => void;
  onRetry: () => void;
  onSupport: () => void;
  onCancel?: () => void;
  successTitle?: string;
  successMessage?: string;
  primaryLabel?: string;
  profileComparison?: boolean;
};

const AImage = Animated.createAnimatedComponent(Image);

export default function IdentityVerificationResult({ status, failureKind, message, faceUri, idUri, emailOtpPending, onPrimary, onRetry, onSupport, onCancel, successTitle, successMessage, primaryLabel, profileComparison }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const enter = useRef(new Animated.Value(0)).current;
  const indicator = useRef(new Animated.Value(0)).current;
  const failed = status === 'failed';
  const success = status === 'matched';
  const previewWidth = Math.min((width - 58) / 2, 220);
  const detailTitle = failureKind === 'mismatch' ? 'Face Match' : failureKind === 'image' ? 'Image Check' : failureKind === 'registration' ? 'Registration' : 'Verification Service';
  const detailCopy = failureKind === 'mismatch'
    ? 'Your face does not match the face shown on the ID.'
    : failureKind === 'image' ? 'One or both images need a clearer, unobstructed face photo.'
      : failureKind === 'registration' ? 'Your identity matched, but the registration could not be saved.'
        : 'We could not complete verification right now.';

  useEffect(() => {
    enter.setValue(0);
    indicator.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    if (failed) {
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(indicator, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(indicator, { toValue: -1, duration: 90, useNativeDriver: true }),
        Animated.timing(indicator, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]).start();
    }
    if (success) {
      Animated.sequence([
        Animated.delay(100),
        Animated.spring(indicator, { toValue: 1, speed: 12, bounciness: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [failed, success, enter, indicator]);

  const shift = indicator.interpolate({ inputRange: [-1, 0, 1], outputRange: [-8, 0, 8] });
  const pop = indicator.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={s.screen}>
      <StatusBar style="light" />
        <View style={[s.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 420 190" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="verificationHeader" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#047857" />
              <Stop offset="1" stopColor="#10B981" />
            </LinearGradient>
          </Defs>
          <Path d="M0 0H420V108C340 160 247 132 175 120C101 108 49 125 0 154Z" fill="url(#verificationHeader)" />
          <Path d="M0 144C75 101 129 119 200 137C282 157 357 150 420 112V190H0Z" fill="#B8F3DF" opacity=".8" />
          <Path d="M0 157C86 118 146 144 224 158C302 173 368 153 420 132V190H0Z" fill="#F7FBFA" />
        </Svg>
        <View style={s.navRow}>
          <Pressable onPress={onCancel || onRetry} style={s.backButton} accessibilityRole="button" accessibilityLabel={onCancel ? 'Cancel verification and return to editing' : 'Back to registration'}>
            <Svg width={25} height={25} viewBox="0 0 24 24"><Path d="M19 12H5m0 0 7 7m-7-7 7-7" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
          <View style={s.headerText}>
            <Text style={s.headerTitle}>Identity Verification</Text>
            <Text style={s.headerSubtitle}>Face and ID Match</Text>
          </View>
          <View style={s.headerSeal}><SealIcon /></View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 16) + 96 }]}>
        {status === 'checking' ? (
          <View style={s.checking}>
            <ActivityIndicator size="large" color="#07875B" />
            <Text style={s.checkingTitle}>Checking your identity</Text>
              <Text style={s.copy}>{profileComparison ? 'We’re comparing your current profile photo with your new selfie.' : 'We’re comparing the face photo with the ID you provided.'}</Text>
              <PhotoPair faceUri={faceUri} idUri={idUri} width={previewWidth} checking profileComparison={profileComparison} />
          </View>
        ) : success ? (
          <Animated.View style={[s.resultContent, { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
            <Animated.View style={[s.heroWrap, { transform: [{ scale: pop }] }]}>
              <AImage source={require('../../../assets/images/identity-verification/success-shield.png')} style={s.shield} resizeMode="contain" />
            </Animated.View>
            <Text style={s.successTitle}>{successTitle || 'Verification Successful!'}</Text>
            <Text style={s.copy}>{successMessage || 'Your face and ID have been matched and verified.'}</Text>
            <PhotoPair faceUri={faceUri} idUri={idUri} width={previewWidth} passed profileComparison={profileComparison} />
            <View style={s.successInfo}>
              <SealIcon small />
              <View style={s.infoText}><Text style={s.infoTitle}>{profileComparison ? 'Profile Photo Match' : 'Face and ID Match'}</Text><Text style={s.infoCopy}>{profileComparison ? 'Your current profile photo matches your new selfie.' : 'Your identity has been successfully verified.'}</Text></View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={primaryLabel || 'Continue to email verification'}
              disabled={!emailOtpPending && !primaryLabel}
              onPress={onPrimary}
              style={({ pressed }) => [s.primaryButton, !emailOtpPending && !primaryLabel && s.disabledButton, pressed && s.pressed]}
            >
              {emailOtpPending ? <Text style={s.primaryText}>Continue to Email Verification  →</Text> : primaryLabel ? <Text style={s.primaryText}>{primaryLabel}</Text> : <ActivityIndicator color="#fff" />}
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View style={[s.resultContent, { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
            <Animated.View style={[s.failureHero, { transform: [{ translateX: shift }, { scale: pop }] }]}><FailureMark /></Animated.View>
            <Text style={s.failureTitle}>{failureKind === 'service' ? 'Verification Unavailable' : failureKind === 'registration' ? 'Registration Not Saved' : <Text style={s.failureTitle}>Verification <Text style={s.failureTitleRed}>Not Successful</Text></Text>}</Text>
            <Text style={s.copy}>{failureKind === 'mismatch' ? profileComparison ? 'We couldn’t match your new selfie with your saved profile photo. Please try again.' : 'We couldn’t match your face with the ID you provided. Don’t worry, you can try again.' : failureKind === 'image' ? 'We couldn’t detect a clear face in each image. You can retake or upload clearer photos.' : failureKind === 'registration' ? 'Your identity was verified, but registration could not be completed.' : 'We couldn’t complete the face and ID verification. Please try again.'}</Text>
            <PhotoPair faceUri={faceUri} idUri={idUri} width={previewWidth} failed profileComparison={profileComparison} />
            <View style={s.failureInfo}>
              <StatusRow title={failureKind === 'registration' ? 'Face Match' : profileComparison ? failureKind === 'mismatch' ? 'Profile Photo Match' : failureKind === 'image' ? 'Image Check' : 'Verification Service' : detailTitle} detail={failureKind === 'registration' ? 'Your face matches the photo on your ID.' : profileComparison && failureKind === 'mismatch' ? 'Your new selfie does not match your saved profile photo.' : profileComparison ? message : detailCopy} passed={failureKind === 'registration'} />
              <View style={s.divider} />
              <StatusRow title={profileComparison ? 'Saved Profile Photo' : failureKind === 'mismatch' || failureKind === 'registration' ? 'ID Readable' : 'Verification details'} detail={profileComparison ? 'Your current profile photo was used for comparison.' : failureKind === 'mismatch' ? 'Your ID was detected and is clear.' : message} passed={profileComparison || failureKind === 'mismatch' || failureKind === 'registration'} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Try face and ID verification again" onPress={onRetry} style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}><RefreshIcon /><Text style={s.primaryText}>Try Again</Text></Pressable>
          </Animated.View>
        )}
      </ScrollView>
      <View pointerEvents="none" style={s.landscape}>
        <Image source={require('../../../assets/images/identity-verification/farm-landscape.png')} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />
      </View>
    </SafeAreaView>
  );
}

function PhotoPair({ faceUri, idUri, width, passed = false, failed = false, checking = false, profileComparison = false }: { faceUri: string; idUri: string; width: number; passed?: boolean; failed?: boolean; checking?: boolean; profileComparison?: boolean }) {
  const [idPreviewFailed, setIdPreviewFailed] = useState(false);
  useEffect(() => setIdPreviewFailed(false), [idUri]);
  const tone = failed ? '#FB7D83' : passed ? '#42C878' : '#77D8B0';
  return (
    <View style={s.pairWrap}>
      <View style={[s.photoCard, { width, borderColor: tone }]}>
        <Image source={{ uri: faceUri }} style={s.facePhoto} resizeMode="cover" accessibilityLabel="Captured face photo" />
        <View style={s.photoLabel}><FacePhotoIcon /><Text style={s.photoLabelText}>{profileComparison ? 'Current Profile' : 'Your Face'}</Text></View>
        {passed && <View style={s.photoBadge}><CheckIcon /></View>}
      </View>
        <View style={[s.photoCard, { width, borderColor: tone }]}>
        <View style={s.idPhotoWrap}>{idUri && !idPreviewFailed ? <ExpoImage source={{ uri: idUri }} style={s.idPhoto} contentFit="cover" cachePolicy="none" accessibilityLabel={profileComparison ? 'New selfie' : 'Uploaded identification photo'} onError={({ error }) => { console.warn(profileComparison ? '[Profile Photo Match] New selfie preview failed to load' : '[Face ID Match] ID preview failed to load', error); setIdPreviewFailed(true); }} /> : <Text style={s.idPreviewError}>{profileComparison ? 'Selfie unavailable' : 'ID photo unavailable'}</Text>}</View>
        <View style={s.photoLabel}>{profileComparison ? <FacePhotoIcon /> : <IdPhotoIcon />}<Text style={s.photoLabelText}>{profileComparison ? 'New Selfie' : 'ID Photo'}</Text></View>
        {passed && <View style={s.photoBadge}><CheckIcon /></View>}
      </View>
      <View style={[s.centerBadge, { backgroundColor: failed ? '#EF4444' : '#13A773' }]}>{checking ? <ShieldStatusIcon /> : failed ? <XIcon /> : <ShieldStatusIcon />}</View>
    </View>
  );
}

function StatusRow({ title, detail, passed }: { title: string; detail: string; passed: boolean }) {
  return <View style={s.statusRow}><View style={[s.statusDot, { backgroundColor: passed ? '#16A66A' : '#EF4444' }]}>{passed ? <CheckIcon /> : <XIcon />}</View><View style={s.infoText}><Text style={s.infoTitle}>{title}</Text><Text style={s.infoCopy}>{detail}</Text></View></View>;
}

function Tip({ icon, text }: { icon: 'face' | 'sun' | 'glasses'; text: string }) {
  return <View style={s.tip}><Svg width={36} height={36} viewBox="0 0 36 36" fill="none" stroke="#07875B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {icon === 'face' ? <><Path d="M10 13V9a3 3 0 0 1 3-3h4M26 13V9a3 3 0 0 0-3-3h-4M10 23v4a3 3 0 0 0 3 3h4M26 23v4a3 3 0 0 1-3 3h-4"/><Circle cx="18" cy="17" r="4"/><Path d="M12 25c1.4-2.1 3.4-3 6-3s4.6.9 6 3"/></> : icon === 'sun' ? <><Circle cx="18" cy="18" r="6"/><Path d="M18 2v4m0 24v4M2 18h4m24 0h4M6.7 6.7l2.8 2.8m17 17 2.8 2.8m0-22.6-2.8 2.8m-17 17-2.8 2.8"/></> : <><Path d="M3 16h3l2-5h8l2 3h2l2-3h8l2 5h3M6 16v3a4 4 0 0 0 8 0v-3m8 0v3a4 4 0 0 0 8 0v-3m-14 0h6"/></>}
  </Svg><Text style={s.tipText}>{text}</Text></View>;
}

function CheckIcon() { return <Svg width={21} height={21} viewBox="0 0 24 24"><Path d="m5 12 4 4L19 6" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
function XIcon() { return <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="m6 6 12 12M18 6 6 18" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" /></Svg>; }
function FailureMark() { return <Svg width={78} height={78} viewBox="0 0 96 96"><Circle cx={48} cy={48} r={48} fill="#FEE2E2"/><Circle cx={48} cy={48} r={36} fill="#EF4444"/><Path d="m34 34 28 28m0-28L34 62" stroke="#fff" strokeWidth={7} strokeLinecap="round"/></Svg>; }
function ShieldStatusIcon() { return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M12 2 20 5v6c0 5-3.4 8.8-8 11-4.6-2.2-8-6-8-11V5z" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinejoin="round" /></Svg>; }
function SealIcon({ small = false }: { small?: boolean }) { return <Svg width={small ? 58 : 56} height={small ? 58 : 56} viewBox="0 0 64 64"><Path d="M32 4 53 12v18c0 14-9 24-21 30C20 54 11 44 11 30V12z" fill="#10B981" stroke="#A7F3D0" strokeWidth={3}/><Path d="M22 32c0-5 4-9 10-9s10 4 10 9v7H22zm10-12a6 6 0 1 0 0-12 6 6 0 0 0 0 12" fill="#D1FAE5"/><Circle cx="48" cy="46" r="11" fill="#D1FAE5"/><Path d="m43 46 4 4 7-8" fill="none" stroke="#047857" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/></Svg>; }
function FacePhotoIcon() { return <Svg width={17} height={17} viewBox="0 0 24 24"><Circle cx="12" cy="8" r="4" fill="#fff"/><Path d="M4 21c.7-4.2 3.4-6.5 8-6.5s7.3 2.3 8 6.5" fill="#fff"/></Svg>; }
function IdPhotoIcon() { return <Svg width={19} height={16} viewBox="0 0 24 20"><Path d="M2 2h20v16H2z" fill="none" stroke="#fff" strokeWidth={2}/><Circle cx="8" cy="8" r="2.5" fill="#fff"/><Path d="M4 14c.5-2 1.8-3 4-3s3.5 1 4 3m3-6h4m-4 4h4" stroke="#fff" strokeWidth={1.7} strokeLinecap="round"/></Svg>; }
function InfoIcon() { return <Svg width={25} height={25} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9} fill="none" stroke="#07875B" strokeWidth={2.4}/><Path d="M12 11v5m0-8h.01" stroke="#07875B" strokeWidth={2.4} strokeLinecap="round"/></Svg>; }
function RefreshIcon() { return <Svg width={25} height={25} viewBox="0 0 24 24"><Path d="M20 7v5h-5M4 17v-5h5m10.5-2A7.5 7.5 0 0 0 6.2 6.2L4 8m16 8-2.2 1.8A7.5 7.5 0 0 1 4.5 14" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg>; }
function SupportIcon() { return <Svg width={25} height={25} viewBox="0 0 24 24"><Path d="M4 13v-2a8 8 0 0 1 16 0v2m-16 0v3a2 2 0 0 0 2 2h2v-7H6a2 2 0 0 0-2 2zm16 0v3a2 2 0 0 1-2 2h-2v-7h2a2 2 0 0 1 2 2zm-8 7h2" fill="none" stroke="#08724F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg>; }

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FBFA' },
  header: { height: 150, overflow: 'hidden', paddingHorizontal: 18, zIndex: 1 },
  navRow: { flexDirection: 'row', alignItems: 'center', minHeight: 66 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { marginLeft: 12, flex: 1 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#E6FFF5', fontSize: 16, marginTop: 2 },
  headerSeal: { marginRight: 4 },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 2 },
  resultContent: { alignItems: 'center' },
  checking: { alignItems: 'center', paddingTop: 80 },
  checkingTitle: { color: '#10223B', fontSize: 25, fontWeight: '800', marginTop: 22 },
  heroWrap: { width: 144, height: 144, alignItems: 'center', justifyContent: 'center', marginTop: -8, marginBottom: -6 },
  shield: { width: 144, height: 144 },
  successTitle: { color: '#075B3F', fontSize: 25, lineHeight: 30, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  failureTitle: { color: '#10223B', fontSize: 22, lineHeight: 28, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  failureTitleRed: { color: '#C9232B' },
  copy: { color: '#667085', fontSize: 14, lineHeight: 19, textAlign: 'center', marginTop: 5, marginBottom: 10 },
  failureHero: { marginTop: 0, marginBottom: -4 },
  pairWrap: { flexDirection: 'row', justifyContent: 'center', gap: 10, width: '100%', position: 'relative', marginVertical: 8 },
  photoCard: { height: 140, borderRadius: 17, borderWidth: 2, padding: 4, backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#0B7553', shadowOpacity: 0.12, shadowRadius: 9, elevation: 2 },
  facePhoto: { width: '100%', height: 98, borderRadius: 12, backgroundColor: '#E5F2ED' },
  idPhotoWrap: { width: '100%', height: 98, borderRadius: 12, backgroundColor: '#F0F4F2', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  idPhoto: { width: '100%', height: '100%' },
  idPreviewError: { fontSize: 10, color: '#64748B', textAlign: 'center', paddingHorizontal: 8 },
  photoLabel: { position: 'absolute', left: 4, right: 4, bottom: 4, height: 32, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: 'rgba(16,35,51,.78)', flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  photoLabelText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  photoBadge: { position: 'absolute', right: 6, top: 70, width: 26, height: 26, borderRadius: 13, backgroundColor: '#16A66A', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  centerBadge: { position: 'absolute', top: 48, left: '50%', marginLeft: -19, width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  successInfo: { width: '100%', minHeight: 68, borderRadius: 18, padding: 12, marginTop: 5, marginBottom: 8, backgroundColor: '#E7F8F1', flexDirection: 'row', alignItems: 'center', gap: 10 },
  failureInfo: { width: '100%', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7, marginTop: 4, marginBottom: 8, backgroundColor: '#FFF0F0' },
  statusRow: { flexDirection: 'row', gap: 10, minHeight: 52, alignItems: 'center' },
  statusDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: '#fff', marginLeft: 48 },
  infoText: { flex: 1 },
  infoTitle: { color: '#11243C', fontSize: 15, fontWeight: '800' },
  infoCopy: { color: '#667085', fontSize: 12, lineHeight: 16, marginTop: 2 },
  tipsCard: { width: '100%', borderRadius: 18, padding: 12, backgroundColor: '#EAF8F3', marginBottom: 10 },
  tipsTitle: { color: '#08724F', fontSize: 14, fontWeight: '800' },
  tipsHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  tipsRow: { flexDirection: 'row', alignItems: 'stretch' },
  tip: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 5, paddingHorizontal: 4 },
  tipText: { color: '#10223B', fontSize: 11, lineHeight: 14, textAlign: 'center' },
  tipDivider: { width: 1, backgroundColor: '#BCE7D7', marginVertical: 4 },
  primaryButton: { width: '100%', minHeight: 50, borderRadius: 27, backgroundColor: '#07875B', borderWidth: 1, borderColor: '#16B978', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 5, shadowColor: '#07875B', shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  secondaryButton: { width: '100%', minHeight: 46, borderRadius: 25, borderWidth: 2, borderColor: '#07875B', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8, backgroundColor: '#fff' },
  secondaryText: { color: '#08724F', fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.75 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  landscape: { position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: 92 },
});

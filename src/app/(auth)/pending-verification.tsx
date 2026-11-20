import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { AppText as Text } from '@/components/ui/FontScale';
import { VerificationProgressCard } from '@/components/auth/VerificationProgressCard';
import { clearSession, getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';

const REVIEW_WINDOW = '1–24 hours';
const GREEN = '#00845A';
const NAVY = '#10192F';
const BODY = '#526078';

type VerificationState = 'loading' | 'pending' | 'approved' | 'other' | 'error';

export default function PendingVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [state, setState] = useState<VerificationState>('loading');
  const [accountStatus, setAccountStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let redirectedToDashboard = false;

    getSession().then(session => {
      if (cancelled) return;
      if (!session?.uid) {
        router.replace('/(auth)/login');
        return;
      }
      if (session.role === 'farmer') {
        router.replace('/(farmer)/home' as any);
        return;
      }

      unsubscribe = firestore().collection(Collections.USERS).doc(session.uid).onSnapshot(
        snapshot => {
          const data = snapshot.data();
          if (!data) {
            setState('error');
            return;
          }
          const status = String(data.status || 'unknown').toLowerCase();
          setAccountStatus(status);
          if (status === 'pending') setState('pending');
          else if (['active', 'approved', 'verified'].includes(status)) {
            setState('approved');
            if (session.role === 'technician' && !redirectedToDashboard) {
              redirectedToDashboard = true;
              router.replace('/(technician)/dashboard' as any);
            }
          }
          else if (status === 'rejected') {
            router.replace({ pathname: '/(auth)/rejected', params: { reason: data.rejectionReason || 'Your documents did not meet our verification requirements.' } });
          } else setState('other');
        },
        error => {
          console.warn('[Pending Verification] Status subscription failed', error);
          setState('error');
        },
      );
    }).catch(error => {
      console.warn('[Pending Verification] Could not load session', error);
      setState('error');
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const handleLogin = async () => {
    await clearSession();
    router.replace('/(auth)/login');
  };

  const approved = state === 'approved';
  const pending = state === 'pending';
  const otherStatus = accountStatus.replace(/[_-]+/g, ' ');

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={s.screen}>
      <StatusBar style="light" />
      <View style={s.header}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 432 150" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="pendingHeader" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#006B49" />
              <Stop offset={0.72} stopColor="#00845A" />
              <Stop offset="1" stopColor="#21A96E" />
            </LinearGradient>
          </Defs>
          <Path d="M0 0H432V94C354 139 277 122 202 111C126 99 61 116 0 142Z" fill="url(#pendingHeader)" />
          <Path d="M309 0H432V74C402 91 378 85 354 72C334 61 319 39 309 0Z" fill="#91E6B8" opacity=".16" />
          <Path d="M0 124C76 83 133 100 205 119C287 140 365 128 432 91V150H0Z" fill="#B8F0D9" />
          <Path d="M0 139C72 100 142 119 219 134C303 151 373 132 432 112V150H0Z" fill="#FFFFFF" />
        </Svg>
        <View style={[s.navRow, { paddingTop: Math.max(insets.top ? 4 : 12, 8) }]}>
          <Pressable onPress={handleLogin} style={s.backButton} accessibilityRole="button" accessibilityLabel="Back to login">
            <ArrowLeft />
          </Pressable>
          <View style={s.brand}>
            <LeafMark />
            <Text style={s.brandText}>AgriCare</Text>
          </View>
          <View style={s.navSpacer} />
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingHorizontal: Math.max(20, Math.min(28, width * 0.06)), paddingBottom: 86 }]}
        showsVerticalScrollIndicator={false}
      >
        {state === 'loading' ? (
          <View style={s.statusState}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={s.stateCopy}>Loading your verification status…</Text>
          </View>
        ) : state === 'error' ? (
          <View style={s.statusState}>
            <LockIcon color="#8391A5" />
            <Text style={s.stateTitle}>Status unavailable</Text>
            <Text style={s.stateCopy}>We couldn’t load your account status. Please try again or return to login.</Text>
          </View>
        ) : state === 'other' ? (
          <View style={s.statusState}>
            <LockIcon color="#8391A5" />
            <Text style={s.stateTitle}>Account status</Text>
            <Text style={s.stateCopy}>Your account is currently marked as “{otherStatus}”. Please contact AgriCare support if you need help.</Text>
          </View>
        ) : (
          <>
            <Image
              source={approved
                ? require('../../../assets/images/identity-verification/success-shield.png')
                : require('../../../assets/images/identity-verification/pending-verification.png')}
              style={[s.illustration, { width: Math.min(width * 0.48, 202), height: Math.min(width * 0.48, 202) }]}
              resizeMode="contain"
              accessibilityLabel={approved ? 'Verified account shield' : '3D clipboard with identification document and review clock'}
            />

            <Text style={[s.title, approved && s.approvedTitle]}>
              {approved ? 'Account Approved' : <>Account Pending{'\n'}<Text style={s.titleGreen}>Verification</Text></>}
            </Text>
            <Text style={s.description}>
              {approved
                ? 'Your account has been verified successfully. Opening your technician dashboard…'
                : 'Your registration has been submitted successfully! An AgriCare administrator will review and verify your account.'}
            </Text>

            <VerificationProgressCard approved={approved} />

            {pending && (
              <View style={s.notice}>
                <BellIcon />
                <Text style={s.noticeText}>
                  You will receive a push notification once your account has been verified. This usually takes <Text style={s.noticeEmphasis}>{REVIEW_WINDOW}.</Text>
                </Text>
              </View>
            )}
          </>
        )}

        {!approved && (
          <Pressable onPress={handleLogin} accessibilityRole="button" style={({ pressed }) => [s.loginButton, pressed && s.pressed]}>
            <LoginArrow />
            <Text style={s.loginText}>Back to Login</Text>
          </Pressable>
        )}
      </ScrollView>

      <View pointerEvents="none" style={s.bottomWave}>
        <Svg width="100%" height="100%" viewBox="0 0 432 84" preserveAspectRatio="none">
          <Path d="M0 27C83 2 140 23 218 38C302 54 361 29 432 9V84H0Z" fill="#DCF7EC" />
          <Path d="M0 51C87 25 149 51 222 62C306 76 378 52 432 30V84H0Z" fill="#B6EBCF" />
          <Path d="M0 68C79 46 145 66 214 77C300 90 370 66 432 50V84H0Z" fill="#76D69E" />
        </Svg>
      </View>
    </SafeAreaView>
  );
}

function ArrowLeft() {
  return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M19 12H5m0 0 7 7m-7-7 7-7" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function LeafMark() {
  return <Svg width={30} height={30} viewBox="0 0 32 32"><Path d="M26 5C14 5 6 10 6 19c0 5 4 8 8 8 9 0 12-10 12-22Z" fill="none" stroke="#D9FBE9" strokeWidth={2.4} strokeLinejoin="round"/><Path d="M8 26c4-7 8-11 15-16" fill="none" stroke="#D9FBE9" strokeWidth={2.2} strokeLinecap="round"/><Path d="M15 18c-3-1-5-1-7-1m12-5c1 2 2 4 2 7" fill="none" stroke="#D9FBE9" strokeWidth={1.5} strokeLinecap="round"/></Svg>;
}

function BellIcon() {
  return <View style={s.bellWrap}><Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" fill="none" stroke="#E59600" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
}

function LockIcon({ color }: { color: string }) {
  return <View style={s.lockCircle}><Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6V10Z" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
}

function LoginArrow() {
  return <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M14 5h5v14h-5M10 8l4 4-4 4m4-4H3" fill="none" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 94, backgroundColor: GREEN },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  navSpacer: { width: 44 },
  scroll: { flex: 1, zIndex: 1 },
  content: { alignItems: 'center', paddingTop: 0, gap: 0 },
  illustration: { marginTop: -1, marginBottom: 0 },
  title: { color: NAVY, fontSize: 27, fontWeight: '800', lineHeight: 32, textAlign: 'center', marginBottom: 7 },
  titleGreen: { color: GREEN },
  approvedTitle: { color: GREEN },
  description: { color: BODY, fontSize: 15, lineHeight: 21, textAlign: 'center', marginBottom: 14, maxWidth: 390 },
  notice: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFF7E2', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 11, marginTop: 10 },
  bellWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFEDB8', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  noticeText: { flex: 1, color: '#66501C', fontSize: 13, lineHeight: 19 },
  noticeEmphasis: { color: '#573C00', fontSize: 13, fontWeight: '800' },
  loginButton: { width: '100%', minHeight: 50, borderWidth: 1.5, borderColor: GREEN, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.94)', marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, zIndex: 2 },
  loginText: { color: GREEN, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  bottomWave: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 74, zIndex: 0 },
  statusState: { minHeight: 350, width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 12 },
  stateTitle: { color: NAVY, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  stateCopy: { color: BODY, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  lockCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#EDF1F4', alignItems: 'center', justifyContent: 'center' },
});

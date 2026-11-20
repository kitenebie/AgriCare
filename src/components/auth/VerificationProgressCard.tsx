import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText as Text } from '@/components/ui/FontScale';

const GREEN = '#19B63B';
const ORANGE = '#F59A00';
const GRAY = '#8391A5';

export function VerificationProgressCard({ approved }: { approved: boolean }) {
  const steps = [
    { title: 'Registration Submitted', description: 'Your profile and ID uploaded', badge: 'Completed', state: 'complete' as const },
    { title: 'Admin Review', description: approved ? 'Your documents were reviewed' : 'Verifying your identity and documents', badge: approved ? 'Completed' : 'In Progress', state: approved ? 'complete' as const : 'current' as const },
    { title: 'Account Approved', description: approved ? 'You can now continue to AgriCare' : 'You’ll receive a notification', badge: approved ? 'Approved' : 'Pending', state: approved ? 'complete' as const : 'pending' as const },
  ];

  return (
    <View style={s.card} accessibilityLabel="Verification progress">
      {steps.map((step, index) => (
        <React.Fragment key={step.title}>
          <View style={[s.step, step.state === 'current' && s.current]}>
            <StatusIcon state={step.state} />
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepDescription}>{step.description}</Text>
            </View>
            <Text style={[s.badge, step.state === 'complete' ? s.doneBadge : step.state === 'current' ? s.currentBadge : s.pendingBadge]}>{step.badge}</Text>
          </View>
          {index < steps.length - 1 && <View style={[s.connector, step.state === 'complete' && s.connectorDone]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

function StatusIcon({ state }: { state: 'complete' | 'current' | 'pending' }) {
  if (state === 'complete') return <View style={[s.statusIcon, { backgroundColor: GREEN }]}><Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m5 12 4 4L19 6" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
  if (state === 'current') return <View style={[s.statusIcon, { backgroundColor: ORANGE }]}><Svg width={18} height={18} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={8.5} fill="none" stroke="#FFFFFF" strokeWidth={1.8} /><Path d="M12 7v5l3.5 2" fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
  return <View style={[s.statusIcon, { backgroundColor: '#EDF1F4' }]}><Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6V10Z" fill="none" stroke={GRAY} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
}

const s = StyleSheet.create({
  card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#EEF2F3', shadowColor: '#10251C', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  step: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 7, paddingVertical: 6, borderRadius: 14 },
  current: { backgroundColor: '#FFF8EB' },
  statusIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepContent: { flex: 1, minWidth: 0 },
  stepTitle: { color: '#10192F', fontSize: 13, lineHeight: 17, fontWeight: '800' },
  stepDescription: { color: '#66748A', fontSize: 10, lineHeight: 13, marginTop: 2 },
  badge: { overflow: 'hidden', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5, fontSize: 10, lineHeight: 13, fontWeight: '800', textAlign: 'center', flexShrink: 0 },
  doneBadge: { color: '#16873A', backgroundColor: '#E5F6E8' },
  currentBadge: { color: '#B66B00', backgroundColor: '#FFE8BD' },
  pendingBadge: { color: '#718096', backgroundColor: '#EDF1F4' },
  connector: { width: 2, height: 8, marginLeft: 22, backgroundColor: '#E5EAF0' },
  connectorDone: { backgroundColor: '#B9E9C3' },
});

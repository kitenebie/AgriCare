/**
 * App Version Guard
 * Checks Firestore appVersion/patch document against local app version.
 * Shows a non-closable modal if update is required.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon } from '@/components/ui';
import Constants from 'expo-constants';

const LOCAL_APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export default function VersionGuard({ children }: { children: React.ReactNode }) {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [downloadURL, setDownloadURL] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const doc = await firestore().collection('appVersion').doc('patch').get();
        if (doc.exists) {
          const data = doc.data();
          const remoteVersion = data?.version || '';
          const url = data?.downloadURL || '';

          if (remoteVersion && remoteVersion !== LOCAL_APP_VERSION) {
            setDownloadURL(url);
            setNeedsUpdate(true);
          }
        }
      } catch (e) {
        console.warn('[VersionGuard] Error checking version:', e);
      } finally {
        setChecking(false);
      }
    };
    checkVersion();
  }, []);

  const handleDownload = () => {
    if (downloadURL) {
      Linking.openURL(downloadURL);
    }
  };

  return (
    <>
      {children}
      <Modal visible={needsUpdate} transparent animationType="fade" statusBarTranslucent>
        <View style={s.overlay}>
          <View style={s.card}>
            {/* Icon */}
            <View style={s.iconCircle}>
              <Icon name="refresh" size={40} color={Colors.primary} />
            </View>

            {/* Title */}
            <Text style={s.title}>Update Required</Text>

            {/* Description */}
            <Text style={s.description}>
              A new version of AgriCare is available. Please update to continue using the app.
            </Text>

            {/* Version Info */}
            <View style={s.versionRow}>
              <View style={s.versionItem}>
                <Text style={s.versionLabel}>Current</Text>
                <Text style={s.versionValue}>{LOCAL_APP_VERSION}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={Colors.textLight} />
              <View style={s.versionItem}>
                <Text style={s.versionLabel}>Latest</Text>
                <Text style={[s.versionValue, { color: Colors.primary }]}>New Version</Text>
              </View>
            </View>

            {/* Download Button */}
            {downloadURL ? (
              <TouchableOpacity style={s.updateBtn} onPress={handleDownload} activeOpacity={0.8}>
                <Icon name="download" size={18} color={Colors.white} />
                <Text style={s.updateBtnText}>Download Update</Text>
              </TouchableOpacity>
            ) : (
              <Text style={s.noUrlText}>Please contact support for the latest version.</Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.xxl,
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  versionItem: {
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: 11,
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  versionValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    width: '100%',
  },
  updateBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
  noUrlText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

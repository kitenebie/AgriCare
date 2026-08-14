import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { modalAlert } from '@/components/ui/ModalAlert';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CaptureIdScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const cameraRef = useRef<CameraView>(null);

  // Take photo
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) setCapturedUri(photo.uri);
    } catch (e: any) {
      modalAlert('Error', e.message || 'Failed to capture photo.');
    }
  };

  // Upload from gallery
  const handleUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setCapturedUri(result.assets[0].uri);
      }
    } catch (e: any) {
      modalAlert('Error', e.message || 'Failed to pick image.');
    }
  };

  // Confirm and go back
  const handleConfirm = () => {
    if (!capturedUri) return;
    router.back();
    // Pass URI via global event or params
    router.setParams({ idImageUri: capturedUri });
  };

  // Retake
  const handleRetake = () => setCapturedUri(null);

  // Permission not granted
  if (!permission) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!permission.granted) {
    return (
      <View style={[s.center, { paddingHorizontal: Spacing.xl }]}>
        <Icon name="camera" size={64} color={Colors.textLight} />
        <Text style={s.permTitle}>Camera Access Required</Text>
        <Text style={s.permDesc}>We need camera access to capture your ID for verification.</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.uploadAltBtn} onPress={handleUpload}>
          <Text style={s.uploadAltText}>Upload from Gallery instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Preview captured image
  if (capturedUri) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.previewHeader}>
          <Text style={s.previewTitle}>Review Your ID</Text>
          <Text style={s.previewSubtitle}>Make sure all details are clearly visible</Text>
        </View>
        <View style={s.previewWrapper}>
          <Image source={{ uri: capturedUri }} style={s.previewImage} resizeMode="contain" />
        </View>
        <View style={[s.previewActions, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={s.retakeBtn} onPress={handleRetake}>
            <Icon name="camera" size={18} color={Colors.text} />
            <Text style={s.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
            <Icon name="check" size={18} color={Colors.white} />
            <Text style={s.confirmBtnText}>Use This Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera view
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Camera */}
      <View style={s.cameraContainer}>
        <CameraView ref={cameraRef} style={s.camera} facing={facing}>
          {/* ID Frame Overlay */}
          <View style={s.overlay}>
            <View style={s.overlayTop} />
            <View style={s.overlayMiddle}>
              <View style={s.overlaySide} />
              <View style={s.idFrame}>
                <View style={[s.corner, s.cornerTL]} />
                <View style={[s.corner, s.cornerTR]} />
                <View style={[s.corner, s.cornerBL]} />
                <View style={[s.corner, s.cornerBR]} />
                <Text style={s.frameText}>Position your ID within the frame</Text>
              </View>
              <View style={s.overlaySide} />
            </View>
            <View style={s.overlayBottom} />
          </View>
        </CameraView>
      </View>

      {/* Controls */}
      <View style={[s.controls, { paddingBottom: insets.bottom + 16 }]}>
        {/* Upload Button */}
        <TouchableOpacity style={s.sideBtn} onPress={handleUpload}>
          <Icon name="gallery" size={24} color={Colors.text} />
          <Text style={s.sideBtnText}>Upload</Text>
        </TouchableOpacity>

        {/* Capture Button */}
        <TouchableOpacity style={s.captureBtn} onPress={handleCapture} activeOpacity={0.7}>
          <View style={s.captureBtnInner} />
        </TouchableOpacity>

        {/* Flip Camera */}
        <TouchableOpacity style={s.sideBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
          <Icon name="refresh" size={24} color={Colors.text} />
          <Text style={s.sideBtnText}>Flip</Text>
        </TouchableOpacity>
      </View>

      {/* Back */}
      <TouchableOpacity style={[s.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
        <Icon name="close" size={22} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  // Permission
  permTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.lg, textAlign: 'center' },
  permDesc: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22 },
  permBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 32, paddingVertical: 14, marginTop: Spacing.xl },
  permBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  uploadAltBtn: { marginTop: Spacing.lg },
  uploadAltText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600' },
  // Camera
  cameraContainer: { flex: 1, overflow: 'hidden' },
  camera: { flex: 1 },
  // ID Frame Overlay
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: 220 },
  overlaySide: { flex: 0.08, backgroundColor: 'rgba(0,0,0,0.6)' },
  idFrame: { flex: 1, borderWidth: 2, borderColor: Colors.white, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  frameText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: Colors.primary, borderWidth: 3 },
  cornerTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  // Controls
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 20, backgroundColor: '#111' },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.white },
  sideBtn: { alignItems: 'center', gap: 4 },
  sideBtnText: { color: Colors.white, fontSize: 11, fontWeight: '500' },
  // Back
  backBtn: { position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  // Preview
  previewHeader: { alignItems: 'center', paddingVertical: Spacing.lg, backgroundColor: '#111' },
  previewTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  previewSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  previewWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  previewImage: { width: '100%', height: '100%', borderRadius: 12 },
  previewActions: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 16, backgroundColor: '#111' },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: BorderRadius.full, backgroundColor: Colors.white },
  retakeBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: BorderRadius.full, backgroundColor: Colors.primary },
  confirmBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.white }
});

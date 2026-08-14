import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { modalAlert } from '@/components/ui/ModalAlert';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { signUp } from '@/services/authService';
import { uploadImageToSupabase } from '@/services/storage';
import * as ImagePicker from 'expo-image-picker';

type Role = 'farmer' | 'technician';

// Generate a random session ID for face detection
const generateSessionId = () => `agricare_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

const EXPERTISE_OPTIONS = [
  { id: 'cow_treatment', label: 'Cow Healthcare & Treatment 🐄', category: 'cow' },
  { id: 'swine_treatment', label: 'Swine Healthcare & Treatment 🐖', category: 'swine' },
  { id: 'cow_breeding', label: 'Cow Breeding & Artificial Insemination 🧬🐄', category: 'cow' },
  { id: 'swine_breeding', label: 'Swine Breeding & Gestation 🧬🐖', category: 'swine' },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    location?: string;
    role?: string;
    fromRejected?: string;
  }>();
  const isFromRejected = params.fromRejected === 'true';

  const [displayName, setDisplayName] = useState(params.displayName || '');
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(params.phoneNumber || '');
  const [location, setLocation] = useState(params.location || '');
  const [role, setRole] = useState<Role>((params.role as Role) || 'farmer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile Photo (required for both farmer and technician)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  // Technician Specific States
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([
    'Cow Healthcare & Treatment 🐄',
  ]);
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [idImageUrl, setIdImageUrl] = useState('');

  // Face Detection WebView state
  const [cameraVisible, setCameraVisible] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const webviewRef = useRef<WebView>(null);

  const faceDetectionUrl = `https://earms.online/face-detection/${sessionId}`;

  const openFaceDetection = useCallback(() => {
    setCameraVisible(true);
  }, []);

  // Injected JS to intercept captured face image from the web page
  const injectedJavaScript = `
    (function() {
      if (window.__rnFaceCaptureInjected) return true;
      window.__rnFaceCaptureInjected = true;

      const RN = window.ReactNativeWebView;
      let sent = false;

      function postMessage(payload) {
        if (!RN) return;
        RN.postMessage(JSON.stringify(payload));
      }

      function normalizeImageString(value) {
        if (!value || typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('data:image')) return trimmed;
        if (trimmed.startsWith('http') || trimmed.startsWith('file:')) return trimmed;
        const looksBase64 = /^[A-Za-z0-9+\\/]+={0,2}$/.test(trimmed);
        if (looksBase64 && trimmed.length > 200) {
          return 'data:image/jpeg;base64,' + trimmed;
        }
        return null;
      }

      function extractImage(value) {
        if (!value) return null;
        if (typeof value === 'string') return normalizeImageString(value);
        if (typeof value === 'object') {
          return (
            normalizeImageString(value.img) ||
            normalizeImageString(value.image) ||
            normalizeImageString(value.previewImage) ||
            normalizeImageString(value.base64PreviewImage) ||
            normalizeImageString(value.base64) ||
            normalizeImageString(value.data) ||
            null
          );
        }
        return null;
      }

      function closeCamera() {
        postMessage({ type: 'close-camera' });
      }

      function sendPhotoOnce(raw) {
        if (sent) return;
        const imageData = extractImage(raw);
        if (!imageData) return;
        sent = true;
        postMessage({ type: 'photo-captured', photoUri: imageData });
        setTimeout(closeCamera, 150);
      }

      window.__faceCaptureSuccess = function(payload, base64PreviewImage) {
        sendPhotoOnce(base64PreviewImage || payload);
      };

      const originalLog = console.log;
      console.log = function() {
        try {
          const args = Array.prototype.slice.call(arguments);
          for (let i = 0; i < args.length; i += 1) {
            const imageData = extractImage(args[i]);
            if (imageData) {
              const firstArg = args[0];
              const captureLog = typeof firstArg === 'string' && firstArg.toLowerCase().indexOf('capture') !== -1;
              if (captureLog || (args[i] && args[i].img)) {
                sendPhotoOnce(imageData);
                break;
              }
            }
          }
        } catch (err) {}
        return originalLog.apply(console, arguments);
      };

      function scanForImage() {
        if (sent || !document) return;
        var images = document.querySelectorAll('img');
        for (var i = 0; i < images.length; i++) {
          var src = images[i].src || '';
          if (src.indexOf('data:image') === 0) { sendPhotoOnce(src); return; }
        }
        var canvas = document.querySelector('canvas');
        if (canvas && canvas.toDataURL) {
          try {
            var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            if (dataUrl && dataUrl.indexOf('data:image') === 0) sendPhotoOnce(dataUrl);
          } catch (err) {}
        }
      }

      function startObservers() {
        scanForImage();
        if (typeof MutationObserver === 'function') {
          var observer = new MutationObserver(function() { scanForImage(); });
          var target = document.documentElement || document.body;
          if (target) observer.observe(target, { childList: true, subtree: true, attributes: true });
        }
        var intervalId = setInterval(function() {
          if (sent) { clearInterval(intervalId); return; }
          scanForImage();
        }, 500);
        setTimeout(function() { clearInterval(intervalId); }, 30000);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObservers);
      } else {
        startObservers();
      }
      return true;
    })();
  `;

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'photo-captured' && data.photoUri) {
        // Immediately upload to Supabase
        const bucket = role === 'technician' ? 'technician_profile_photo' : 'farmer_profile_photo';
        setProfilePhotoUrl(data.photoUri); // Show preview right away
        setCameraVisible(false);

        uploadImageToSupabase(data.photoUri, bucket)
          .then((result) => {
            if (result.success && result.publicUrl) {
              setProfilePhotoUrl(result.publicUrl); // Replace with public URL
              console.log('[Register] Profile photo uploaded:', result.publicUrl);
            } else {
              console.warn('[Register] Upload failed, keeping local URI:', result.error);
            }
          })
          .catch((err) => console.warn('[Register] Upload error:', err));
      } else if (data.type === 'close-camera') {
        setCameraVisible(false);
      }
    } catch (error) {
      console.warn('[Register] Error parsing webview message:', error);
    }
  }, [role]);

  // Toggle Multiple Expertise Selection
  const toggleExpertise = (label: string) => {
    if (selectedExpertise.includes(label)) {
      if (selectedExpertise.length === 1) {
        modalAlert('Required', 'Please keep at least one expertise role selected.');
        return;
      }
      setSelectedExpertise(selectedExpertise.filter((item) => item !== label));
    } else {
      setSelectedExpertise([...selectedExpertise, label]);
    }
  };

  // Pick Proof Image
  const handlePickProof = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const localUri = result.assets[0].uri;
        setUploadingProof(true);

        try {
          const bucket = role === 'technician' ? 'technician_proof' : 'farmers_proof';
          const result = await uploadImageToSupabase(localUri, bucket);
          if (result.success && result.publicUrl) {
            setProofImageUrl(result.publicUrl);
          } else {
            console.warn('Supabase upload failed, using local URI:', result.error);
            setProofImageUrl(localUri);
          }
        } catch (uploadErr) {
          console.warn('Upload error, using local URI:', uploadErr);
          setProofImageUrl(localUri);
        } finally {
          setUploadingProof(false);
        }
      }
    } catch (err: any) {
      modalAlert('Image Error', err.message || 'Failed to pick proof image.');
      setUploadingProof(false);
    }
  };

  const handleRegister = async () => {
    // Basic Validation
    if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
      modalAlert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      modalAlert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      modalAlert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (!profilePhotoUrl) {
      modalAlert('Error', 'Please take or upload a profile photo.');
      return;
    }

    // Technician Specific Validation
    if (role === 'technician') {
      if (selectedExpertise.length === 0) {
        modalAlert('Error', 'Please select at least one expertise role.');
        return;
      }
      if (!proofImageUrl.trim()) {
        modalAlert(
          'Proof Required',
          'Please upload a photo of your technician license, ID, or certificate of qualification.'
        );
        return;
      }
    }

    // Farmer requires ID photo
    if (role === 'farmer' && !idImageUrl) {
      modalAlert('Error', 'Please capture or upload your valid ID for verification.');
      return;
    }

    setLoading(true);
    try {
      // Upload farmer ID if provided
      let uploadedIdUrl = '';
      if (role === 'farmer' && idImageUrl) {
        const idResult = await uploadImageToSupabase(idImageUrl, 'farmers_proof');
        if (idResult.success && idResult.publicUrl) {
          uploadedIdUrl = idResult.publicUrl;
        }
      }

      // Upload profile photo
      let uploadedProfileUrl = '';
      if (profilePhotoUrl) {
        // Already uploaded immediately on capture — profilePhotoUrl is the public URL
        uploadedProfileUrl = profilePhotoUrl;
      }

      await signUp(
        email.trim(),
        password,
        displayName.trim(),
        role,
        role === 'technician'
          ? {
              expertise: selectedExpertise,
              proofImageUrl: proofImageUrl.trim(),
              phoneNumber: phoneNumber.trim(),
              location: location.trim(),
              photoURL: uploadedProfileUrl,
            }
          : {
              phoneNumber: phoneNumber.trim(),
              location: location.trim(),
              idImageUrl: uploadedIdUrl,
              photoURL: uploadedProfileUrl,
            }
      );

      modalAlert(
        '✅ Registration Submitted!',
        'Your account is pending verification by an admin. You will be notified once your account is approved.',
        [
          {
            text: 'Continue',
            onPress: () => {
              router.replace('/(auth)/pending-verification');
            },
          },
        ]
      );
    } catch (error: any) {
      let message = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak. Use at least 6 characters.';
      }
      modalAlert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Full-screen Face Detection WebView ───
  if (cameraVisible) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <WebView
          ref={webviewRef}
          style={StyleSheet.absoluteFillObject}
          source={{ uri: faceDetectionUrl }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          injectedJavaScript={injectedJavaScript}
          startInLoadingState={true}
          originWhitelist={['*']}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
        />
        <TouchableOpacity
          style={{ position: 'absolute', top: insets.top + 12, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setCameraVisible(false)}
        >
          <Icon name="close" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (isFromRejected) {
              router.replace('/(auth)/rejected' as any);
            } else {
              router.back();
            }
          }} style={styles.backButton}>
            <Icon name="chevron-right" size={22} color={Colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isFromRejected ? 'Re-Register' : 'Create Account'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Role Selector */}
        <Text style={styles.sectionLabel}>I am registering as a:</Text>
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleOption, role === 'farmer' && styles.roleOptionActive, isFromRejected && role !== 'farmer' && { opacity: 0.4 }]}
            onPress={() => { if (!isFromRejected) setRole('farmer'); }}
            activeOpacity={isFromRejected ? 1 : 0.8}
            disabled={isFromRejected}
          >
            <Icon name="paw" size={24} color={role === 'farmer' ? Colors.white : Colors.primary} />
            <Text style={[styles.roleText, role === 'farmer' && styles.roleTextActive]}>Farmer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, role === 'technician' && styles.roleOptionActive, isFromRejected && role !== 'technician' && { opacity: 0.4 }]}
            onPress={() => { if (!isFromRejected) setRole('technician'); }}
            activeOpacity={isFromRejected ? 1 : 0.8}
            disabled={isFromRejected}
          >
            <Icon name="health-check" size={24} color={role === 'technician' ? Colors.white : Colors.primary} />
            <Text style={[styles.roleText, role === 'technician' && styles.roleTextActive]}>Technician</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Full Name */}
          <Text style={styles.inputLabel}>Full Name *</Text>
          <View style={styles.inputContainer}>
            <Icon name="profile" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.textLight}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <Text style={styles.inputLabel}>Email Address *</Text>
          <View style={styles.inputContainer}>
            <Icon name="messages" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Phone Number */}
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Icon name="tag" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="+63 9XX XXX XXXX"
              placeholderTextColor={Colors.textLight}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* Location */}
          <Text style={styles.inputLabel}>Location / Barangay, Municipality</Text>
          <View style={styles.inputContainer}>
            <Icon name="location" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="e.g. San Miguel, Bulacan"
              placeholderTextColor={Colors.textLight}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Password */}
          <Text style={styles.inputLabel}>Password *</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Create a password (min 6 chars)"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon name={showPassword ? 'close-eye' : 'eye'} size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={styles.inputLabel}>Confirm Password *</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor={Colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>

          {/* ─── PROFILE PHOTO (Required for both roles) ─── */}
          <View style={styles.technicianSection}>
            <View style={styles.techSectionHeader}>
              <Icon name="camera" size={20} color="#15803D" />
              <Text style={styles.techSectionTitle}>Profile Photo *</Text>
            </View>
            <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18 }}>
              Take a clear selfie of yourself. This will be your profile picture.
            </Text>
            {profilePhotoUrl ? (
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Image source={{ uri: profilePhotoUrl }} style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: Colors.primary }} resizeMode="cover" />
                <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setProfilePhotoUrl('')}>
                  <Text style={{ color: Colors.error, fontWeight: '600', fontSize: 13 }}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.uploadProofBtn, { marginBottom: 8 }]}
              onPress={openFaceDetection}
            >
              <Icon name="camera" size={18} color="#15803D" />
              <Text style={styles.uploadProofBtnText}>{profilePhotoUrl ? 'Retake Photo' : 'Take Photo'}</Text>
            </TouchableOpacity>
          </View>

          {/* ─── FARMER ID CAPTURE ─── */}
          {role === 'farmer' && (
            <View style={styles.technicianSection}>
              <View style={styles.techSectionHeader}>
                <Icon name="profile" size={20} color="#15803D" />
                <Text style={styles.techSectionTitle}>Valid ID Verification</Text>
              </View>
              <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18 }}>
                Please capture or upload a valid government-issued ID for verification.
              </Text>
              {idImageUrl ? (
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <Image source={{ uri: idImageUrl }} style={{ width: '100%', height: 160, borderRadius: 12 }} resizeMode="cover" />
                  <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setIdImageUrl('')}>
                    <Text style={{ color: Colors.error, fontWeight: '600', fontSize: 13 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity
                style={[styles.uploadProofBtn, { marginBottom: 8 }]}
                onPress={() => {
                  modalAlert('Capture ID', 'Choose an option', [
                    { text: 'Camera', onPress: async () => {
                      const { status } = await ImagePicker.requestCameraPermissionsAsync();
                      if (status !== 'granted') { modalAlert('Permission Denied', 'Camera permission is required.'); return; }
                      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
                      if (!result.canceled && result.assets?.[0]?.uri) setIdImageUrl(result.assets[0].uri);
                    }},
                    { text: 'Upload from Gallery', onPress: async () => {
                      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
                      if (!result.canceled && result.assets?.[0]?.uri) setIdImageUrl(result.assets[0].uri);
                    }},
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <Icon name="camera" size={18} color="#15803D" />
                <Text style={styles.uploadProofBtnText}>{idImageUrl ? 'Change ID Photo' : 'Capture ID'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── TECHNICIAN SPECIFIC FIELDS ─── */}
          {role === 'technician' && (
            <View style={styles.technicianSection}>
              <View style={styles.techSectionHeader}>
                <Icon name="health-check" size={20} color="#15803D" />
                <Text style={styles.techSectionTitle}>Technician Specializations & Proof</Text>
              </View>

              {/* Multiple Expertise Role Selector */}
              <Text style={styles.inputLabel}>
                Expertise & Roles (Multiple Selection Allowed) *
              </Text>
              <Text style={styles.expertiseSub}>
                Select all areas you are qualified to service:
              </Text>

              <View style={styles.expertiseContainer}>
                {EXPERTISE_OPTIONS.map((opt) => {
                  const isSelected = selectedExpertise.includes(opt.label);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.expertiseChip,
                        isSelected && styles.expertiseChipSelected,
                      ]}
                      onPress={() => toggleExpertise(opt.label)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.checkboxIconBox}>
                        <Icon
                          name={isSelected ? 'check' : 'plus'}
                          size={14}
                          color={isSelected ? Colors.white : '#64748B'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.expertiseChipText,
                          isSelected && styles.expertiseChipTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Upload Proof Image */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                Upload Proof of Technician Qualification *
              </Text>
              <Text style={styles.expertiseSub}>
                Please attach a photo of your vet license, certificate, accreditation card, or ID.
              </Text>

              {proofImageUrl ? (
                <View style={styles.proofPreviewContainer}>
                  <Image source={{ uri: proofImageUrl }} style={styles.proofPreviewImage} />
                  <TouchableOpacity
                    style={styles.removeProofBtn}
                    onPress={() => setProofImageUrl('')}
                  >
                    <Icon name="close" size={14} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.proofUploadRow}>
                <TouchableOpacity
                  style={styles.uploadProofBtn}
                  onPress={handlePickProof}
                  disabled={uploadingProof}
                  activeOpacity={0.8}
                >
                  {uploadingProof ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Icon name="image" size={20} color={Colors.primary} />
                      <Text style={styles.uploadProofBtnText}>
                        {proofImageUrl ? 'Change Proof Photo' : 'Upload Proof Image'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, styles.urlInput]}
                  placeholder="Or paste Proof Image URL..."
                  placeholderTextColor={Colors.textLight}
                  value={proofImageUrl}
                  onChangeText={setProofImageUrl}
                  autoCapitalize="none"
                />
              </View>

              {/* Info Banner */}
              <View style={styles.infoBox}>
                <Icon name="alert" size={18} color="#D97706" />
                <Text style={styles.infoText}>
                  Technician registrations are submitted to AgriCare Admin for credential verification before appointment dispatching.
                </Text>
              </View>
            </View>
          )}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading || uploadingProof}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.registerButtonText}>
                {role === 'technician' ? 'Submit Technician Registration' : 'Create Farmer Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  roleOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  roleTextActive: {
    color: Colors.white,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },

  // ─── Technician Section Styles ───
  technicianSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  techSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  techSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15803D',
  },
  expertiseSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  expertiseContainer: {
    gap: 8,
    marginBottom: 12,
  },
  expertiseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  expertiseChipSelected: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  checkboxIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  expertiseChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  expertiseChipTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },

  // Proof Upload
  proofUploadRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  uploadProofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  uploadProofBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  urlInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  proofPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  proofPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removeProofBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: Spacing.md,
    gap: 8,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  loginText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '700',
  },
});

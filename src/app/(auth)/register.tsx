import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { signUp } from '@/services/authService';
import { uploadImageToSupabase } from '@/services/storage';
import * as ImagePicker from 'expo-image-picker';

type Role = 'farmer' | 'technician';

const EXPERTISE_OPTIONS = [
  { id: 'cow_treatment', label: 'Cow Healthcare & Treatment 🐄', category: 'cow' },
  { id: 'swine_treatment', label: 'Swine Healthcare & Treatment 🐖', category: 'swine' },
  { id: 'cow_breeding', label: 'Cow Breeding & Artificial Insemination 🧬🐄', category: 'cow' },
  { id: 'swine_breeding', label: 'Swine Breeding & Gestation 🧬🐖', category: 'swine' },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [role, setRole] = useState<Role>('farmer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Technician Specific States
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([
    'Cow Healthcare & Treatment 🐄',
  ]);
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [idImageUrl, setIdImageUrl] = useState('');

  // Toggle Multiple Expertise Selection
  const toggleExpertise = (label: string) => {
    if (selectedExpertise.includes(label)) {
      if (selectedExpertise.length === 1) {
        Alert.alert('Required', 'Please keep at least one expertise role selected.');
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
          const result = await uploadImageToSupabase(localUri, "animals");
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
      Alert.alert('Image Error', err.message || 'Failed to pick proof image.');
      setUploadingProof(false);
    }
  };

  const handleRegister = async () => {
    // Basic Validation
    if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    // Technician Specific Validation
    if (role === 'technician') {
      if (selectedExpertise.length === 0) {
        Alert.alert('Error', 'Please select at least one expertise role.');
        return;
      }
      if (!proofImageUrl.trim()) {
        Alert.alert(
          'Proof Required',
          'Please upload a photo of your technician license, ID, or certificate of qualification.'
        );
        return;
      }
    }

    setLoading(true);
    try {
      // Upload farmer ID if provided
      let uploadedIdUrl = '';
      if (role === 'farmer' && idImageUrl) {
        const idResult = await uploadImageToSupabase(idImageUrl, 'animals');
        if (idResult.success && idResult.publicUrl) {
          uploadedIdUrl = idResult.publicUrl;
        }
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
            }
          : {
              phoneNumber: phoneNumber.trim(),
              location: location.trim(),
              idImageUrl: uploadedIdUrl,
            }
      );

      Alert.alert(
        'Account Created!',
        role === 'technician'
          ? 'Your technician registration and proof documents have been submitted. An admin will verify your account shortly.'
          : 'Your farmer account has been created. Welcome to AgriCare!',
        [
          {
            text: 'Continue',
            onPress: () => {
              if (role === 'farmer') {
                router.replace('/(farmer)/home');
              } else {
                router.replace('/(technician)/dashboard');
              }
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
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="chevron-right" size={22} color={Colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Role Selector */}
        <Text style={styles.sectionLabel}>I am registering as a:</Text>
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleOption, role === 'farmer' && styles.roleOptionActive]}
            onPress={() => setRole('farmer')}
            activeOpacity={0.8}
          >
            <Icon name="paw" size={24} color={role === 'farmer' ? Colors.white : Colors.primary} />
            <Text style={[styles.roleText, role === 'farmer' && styles.roleTextActive]}>Farmer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, role === 'technician' && styles.roleOptionActive]}
            onPress={() => setRole('technician')}
            activeOpacity={0.8}
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
              <Icon name={showPassword ? 'close' : 'search'} size={20} color={Colors.textSecondary} />
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
                  Alert.alert('Capture ID', 'Choose an option', [
                    { text: 'Camera', onPress: async () => {
                      const { status } = await ImagePicker.requestCameraPermissionsAsync();
                      if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera permission is required.'); return; }
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

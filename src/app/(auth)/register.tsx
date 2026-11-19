              import React, { useState, useRef, useCallback, useMemo } from 'react';
              import { FlatList, Modal, View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { AppTextInput as TextInput, AppText as Text } from '@/components/ui/FontScale';
              import { modalAlert } from '@/components/ui/ModalAlert';
              import { router, useLocalSearchParams } from 'expo-router';
              import { useSafeAreaInsets } from 'react-native-safe-area-context';
              import WebView from 'react-native-webview';
              import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
              import { Icon } from '@/components/ui';
import IdentityVerificationResult from '@/components/auth/IdentityVerificationResult';
              import { signUp } from '@/services/authService';
              import { sendRegistrationEmailOtp, verifyRegistrationEmailOtp } from '@/services/emailVerificationService';
              import { uploadImageToSupabase } from '@/services/storage';
              import * as ImagePicker from 'expo-image-picker';
import { decode as base64Decode } from 'base64-arraybuffer';
import { File, Paths } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
              import regions from '../../../assets/addresses/region.json';
              import provinces from '../../../assets/addresses/province.json';
              import municipalities from '../../../assets/addresses/muncity.json';
              // shortcut: bundle the 5.5 MB barangay list; split it if bundle startup cost becomes a problem.
              import barangays from '../../../assets/addresses/barangay.json';

              type Role = 'farmer' | 'technician';
              type AddressPicker = 'purok' | 'region' | 'province' | 'municipality' | 'barangay' | null;
              type AddressOption = { value: string; label: string };

              const getInitialAddress = (address = '') => {
                const parts = address.split(',').map((part) => part.trim());
                const province = provinces.find((item) => parts.includes(item.description));
                const municipality = province && municipalities.find((item) =>
                  parts.includes(item.description) &&
                  String(item.code).padStart(9, '0').slice(0, 4) === String(province.code).padStart(9, '0').slice(0, 4)
                );
                return {
                  region: regions.find((item) => item.region_id === province?.region_id) || null,
                  province: province || null,
                  municipality: municipality || null,
                  barangay: municipality && barangays.find((item) =>
                    item.muncity_id === municipality.muncity_id && parts.includes(item.description)
                  ) || null,
                };
              };

              const getInitialStreetPurok = (address = '') => {
                const parts = address.split(',').map((part) => part.trim());
                const barangayIndex = parts.findIndex((part) => barangays.some((item) => item.description === part));
                return barangayIndex > 0 ? parts.slice(0, barangayIndex).join(', ') : '';
              };

              // Generate a random session ID for face detection
              const generateSessionId = () => `agricare_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

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
                const isStrongPassword = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}/.test(password);
                const passwordsMatch = password === confirmPassword;
                const [phoneNumber, setPhoneNumber] = useState((params.phoneNumber || '').replace(/\D/g, '').slice(0, 11));
                const [farmerPurok, setFarmerPurok] = useState(() => {
                  const match = params.location?.match(/^Purok ([1-7])/i);
                  return match?.[1] || '1';
                });
                const [selectedAddress, setSelectedAddress] = useState(() => getInitialAddress(params.location));
                const [streetPurok, setStreetPurok] = useState(() => getInitialStreetPurok(params.location));
                const [addressPicker, setAddressPicker] = useState<AddressPicker>(null);
                const [role, setRole] = useState<Role>((params.role as Role) || 'farmer');
                const [registrationStep, setRegistrationStep] = useState(0);
                const [showPassword, setShowPassword] = useState(false);
                const [loading, setLoading] = useState(false);
                const [emailVerified, setEmailVerified] = useState(false);
                const [verificationTicket, setVerificationTicket] = useState('');
                const [showOtpModal, setShowOtpModal] = useState(false);
                const [otpCode, setOtpCode] = useState('');
                const [otpLoading, setOtpLoading] = useState(false);
                const [showMatchResult, setShowMatchResult] = useState(false);
                const [matchStatus, setMatchStatus] = useState<'checking' | 'matched' | 'failed' | 'saved'>('checking');
                const [matchMessage, setMatchMessage] = useState('');
                const [matchFailureKind, setMatchFailureKind] = useState<'mismatch' | 'image' | 'service' | 'registration'>('service');
                const [faceIdVerified, setFaceIdVerified] = useState(false);
                const [emailOtpPending, setEmailOtpPending] = useState(false);
                const registrationSteps = role === 'technician'
                  ? ['Account', 'Password', 'Address', 'Face Photo', 'ID Photo', 'Credentials']
                  : ['Account', 'Password', 'Address', 'Face Photo', 'ID Photo'];

                function continueRegistration() {
                  if (registrationStep === 0) {
                    if (!displayName.trim()) return modalAlert('Name Required', 'Enter your full name.');
                    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'-]*$/.test(displayName.trim())) return modalAlert('Invalid Name', 'Use letters only, with spaces, apostrophes, or hyphens.');
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return modalAlert('Invalid Email', 'Enter a valid email address.');
                    if (!/^\d{11}$/.test(phoneNumber)) return modalAlert('Invalid Phone Number', 'Enter an 11-digit phone number.');
                  } else if (registrationStep === 1) {
                    if (!password || !confirmPassword) return modalAlert('Password Required', 'Enter and confirm your password.');
                    if (!passwordsMatch) return modalAlert('Error', 'Passwords do not match.');
                    if (!isStrongPassword) return modalAlert('Weak Password', 'Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.');
                  } else if (registrationStep === 2) {
                    if (role === 'technician' && !streetPurok.trim()) return modalAlert('Street / Purok Required', 'Enter your street or purok.');
                    if (role === 'technician' && (!selectedAddress.region || !selectedAddress.province || !selectedAddress.municipality || !selectedAddress.barangay)) return modalAlert('Address Required', 'Please select region, province, city/municipality, and barangay.');
                  } else if (registrationStep === 3) {
                    if (!profilePhotoUrl) return modalAlert('Profile Photo Required', 'Please take or upload a profile photo.');
                  } else if (registrationStep === 4) {
                    if (!idImageUrl) return modalAlert('ID Required', 'Please capture or upload an ID with a clear face photo.');
                  } else if (role === 'technician') {
                    if (!specializationInput.split(',').some((item) => item.trim())) return modalAlert('Specialization Required', 'Enter at least one specialization.');
                    if (!proofImageUrl.trim()) return modalAlert('Proof Required', 'Please upload a photo of your technician license, ID, or certificate of qualification.');
                  }

                  if (registrationStep === registrationSteps.length - 1) handleRegister();
                  else setRegistrationStep((step) => step + 1);
                }

                const addressOptions = useMemo<AddressOption[]>(() => {
                  switch (addressPicker) {
                    case 'purok':
                      return Array.from({ length: 7 }, (_, index) => ({ value: String(index + 1), label: `Purok ${index + 1}` }));
                    case 'region':
                      return regions.map((item) => ({ value: String(item.region_id), label: item.description }));
                    case 'province':
                      return provinces.filter((item) => item.region_id === selectedAddress.region?.region_id)
                        .map((item) => ({ value: String(item.province_id), label: item.description }));
                    case 'municipality':
                      return municipalities.filter((item) =>
                        String(item.code).padStart(9, '0').slice(0, 4) === String(selectedAddress.province?.code).padStart(9, '0').slice(0, 4)
                      ).map((item) => ({ value: String(item.muncity_id), label: item.description }));
                    case 'barangay':
                      return barangays.filter((item) => item.muncity_id === selectedAddress.municipality?.muncity_id)
                        .map((item) => ({ value: String(item.barangay_id), label: item.description }));
                    default:
                      return [];
                  }
                }, [addressPicker, selectedAddress]);

                const handleAddressPick = (option: AddressOption) => {
                  if (addressPicker === 'purok') {
                    setFarmerPurok(option.value);
                  } else if (addressPicker === 'region') {
                    const region = regions.find((item) => String(item.region_id) === option.value) || null;
                    setSelectedAddress({ region, province: null, municipality: null, barangay: null });
                  } else if (addressPicker === 'province') {
                    const province = provinces.find((item) => String(item.province_id) === option.value) || null;
                    setSelectedAddress((current) => ({ ...current, province, municipality: null, barangay: null }));
                  } else if (addressPicker === 'municipality') {
                    const municipality = municipalities.find((item) => String(item.muncity_id) === option.value) || null;
                    setSelectedAddress((current) => ({ ...current, municipality, barangay: null }));
                  } else if (addressPicker === 'barangay') {
                    const barangay = barangays.find((item) => String(item.barangay_id) === option.value) || null;
                    setSelectedAddress((current) => ({ ...current, barangay }));
                  }
                  setAddressPicker(null);
                };

                const handleVerifyEmailOtp = async () => {
                  if (!/^\d{6}$/.test(otpCode)) {
                    modalAlert('Invalid Code', 'Enter the 6-digit code sent to your email.');
                    return;
                  }
                  setOtpLoading(true);
                  try {
                    const ticket = await verifyRegistrationEmailOtp(email.trim(), otpCode);
                    console.info('[Registration] verified OTP ticket metadata', { length: ticket.length });
                    setVerificationTicket(ticket);
                    setEmailVerified(true);
                    setShowOtpModal(false);
                    setOtpCode('');
                    await handleRegister(ticket);
                  } catch (error: any) {
                    modalAlert('Verification Failed', error.message || 'Check the code and try again.');
                  } finally {
                    setOtpLoading(false);
                  }
                };

                // Profile Photo (required for both farmer and technician)
                const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

                // Technician Specific States
                const [specializationInput, setSpecializationInput] = useState('');
                const [proofImageUrl, setProofImageUrl] = useState('');
                const [uploadingProof, setUploadingProof] = useState(false);
                const [idImageUrl, setIdImageUrl] = useState('');
                const [faceImageUri, setFaceImageUri] = useState('');

                // Face Detection WebView state
                const [cameraVisible, setCameraVisible] = useState(false);
                const [sessionId] = useState(generateSessionId);
                const webviewRef = useRef<WebView>(null);
                const registrationScrollRef = useRef<ScrollView>(null);
                const captureSectionY = useRef(0);
                useEffect(() => { registrationScrollRef.current?.scrollTo({ y: 0, animated: false }); }, [registrationStep]);

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
                      setFaceImageUri(data.photoUri);
                      setFaceIdVerified(false);
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

                async function handleRegister(ticket = verificationTicket) {
                  console.info('[Registration] submit ticket metadata', { length: ticket?.length || 0 });
                  // Basic Validation
                  if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
                    modalAlert('Error', 'Please fill in all required fields.');
                    return;
                  }
                  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'-]*$/.test(displayName.trim())) {
                    modalAlert('Invalid Name', 'Use letters only, with spaces, apostrophes, or hyphens.');
                    return;
                  }
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                    modalAlert('Invalid Email', 'Enter a valid email address.');
                    return;
                  }
                  if (!/^\d{11}$/.test(phoneNumber)) {
                    modalAlert('Invalid Phone Number', 'Enter an 11-digit phone number.');
                    return;
                  }
                  if (!passwordsMatch) {
                    modalAlert('Error', 'Passwords do not match.');
                    return;
                  }
                  if (!isStrongPassword) {
                    modalAlert('Weak Password', 'Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.');
                    return;
                  }
                  if (!profilePhotoUrl) {
                    modalAlert('Error', 'Please take or upload a profile photo.');
                    return;
                  }

                  // Technician Specific Validation
                  const technicianExpertise = specializationInput.split(',').map((item) => item.trim()).filter(Boolean);
                  if (role === 'technician') {
                    if (!streetPurok.trim()) {
                      modalAlert('Street / Purok Required', 'Enter your street or purok.');
                      return;
                    }
                    if (!selectedAddress.region || !selectedAddress.province || !selectedAddress.municipality || !selectedAddress.barangay) {
                      modalAlert('Address Required', 'Please select region, province, city/municipality, and barangay.');
                      return;
                    }
                    if (technicianExpertise.length === 0) {
                      modalAlert('Error', 'Enter at least one specialization.');
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

                  if (!idImageUrl) {
                    modalAlert('ID Required', 'Please capture or upload your valid ID for verification.');
                    return;
                  }
                  if (!faceImageUri) {
                    modalAlert('Face Photo Required', 'Please take a clear face photo for ID matching.');
                    return;
                  }

                  const registrationLocation = role === 'technician'
                    ? `${streetPurok.trim()}, ${selectedAddress.barangay?.description || ''}, ${selectedAddress.municipality?.description || ''}, ${selectedAddress.province?.description || ''}`
                    : `Purok ${farmerPurok}, Gabao, Irosin, Sorsogon`;

                  setLoading(true);
                  let faceIdMatched = faceIdVerified;
                  const faceMatchTempFiles: File[] = [];
                  try {
                    if (!faceIdVerified) {
                      setMatchStatus('checking');
                      setMatchMessage('Comparing your face photo with your ID...');
                      setShowMatchResult(true);
                      const form = new FormData();
                      const appendImage = async (key: string, uri: string, filename: string) => {
                        if (uri.startsWith('data:')) {
                          const image = uri.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
                          if (!image) throw new Error('Captured face image is not valid. Please retake it.');
                          const faceMatchTempFile = new File(Paths.cache, `${Date.now()}_${filename}`);
                          faceMatchTempFile.create();
                          faceMatchTempFile.write(new Uint8Array(base64Decode(image[2])));
                          faceMatchTempFiles.push(faceMatchTempFile);
                          form.append(key, faceMatchTempFile);
                        } else {
                          form.append(key, new File(uri));
                        }
                      };
                      await appendImage('reference_image', idImageUrl, 'id.jpg');
                      await appendImage('compare_image', faceImageUri, 'face.jpg');
                      const response = await expoFetch('https://meet.earms.site/api/v1/match', { method: 'POST', body: form });
                      const matchResult = await response.json().catch(() => ({}));
                      if (!response.ok || !matchResult.match) {
                        const detail = typeof matchResult.detail === 'string'
                          ? matchResult.detail
                          : Array.isArray(matchResult.detail) ? matchResult.detail.map((item: any) => item.msg).join(', ') : '';
                        const errorMessage = detail || matchResult.message || 'The face in your photo does not match the ID. Please retake both images.';
                        const faceHint = /exactly one detectable face|found 0/i.test(errorMessage)
                          ? ' Retake a clear, front-facing selfie and upload an ID with one clear, unobstructed face photo.'
                          : '';
                        console.warn('[Face ID Match] Verification rejected', { status: response.status, detail: errorMessage });
                        setMatchFailureKind(response.ok ? 'mismatch' : response.status === 422 ? 'image' : 'service');
                        setMatchStatus('failed');
                        setMatchMessage(`${response.ok ? errorMessage : detail || matchResult.message || 'Face and ID verification is unavailable. Please try again.'}${faceHint}`);
                        return;
                      }
                      setFaceIdVerified(true);
                    } else {
                      setMatchStatus('matched');
                      setMatchMessage('Face and ID matched. Saving your registration...');
                      setShowMatchResult(true);
                    }
                    faceIdMatched = true;
                    setMatchStatus('matched');
                    setMatchMessage('Face and ID matched.');

                    if (!ticket) {
                      await sendRegistrationEmailOtp(email.trim());
                      setEmailVerified(false);
                      setVerificationTicket('');
                      setOtpCode('');
                      setEmailOtpPending(true);
                      setMatchMessage('Face and ID matched. Continue to verify your email.');
                      return;
                    }
                    setMatchMessage('Face and ID matched. Saving your registration...');

                    // Upload ID for registration
                    let uploadedIdUrl = '';
                    if (idImageUrl) {
                      const idResult = await uploadImageToSupabase(idImageUrl, role === 'technician' ? 'technician_proof' : 'farmers_proof');
                      if (idResult.success && idResult.publicUrl) {
                        uploadedIdUrl = idResult.publicUrl;
                      } else {
                        throw new Error('Could not upload your ID. Please try again.');
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
                      ticket,
                      role === 'technician'
                        ? {
                            expertise: technicianExpertise,
                            proofImageUrl: proofImageUrl.trim(),
                            idImageUrl: uploadedIdUrl,
                            phoneNumber: phoneNumber.trim(),
                            location: registrationLocation,
                            photoURL: uploadedProfileUrl,
                          }
                        : {
                            phoneNumber: phoneNumber.trim(),
                            location: registrationLocation,
                            idImageUrl: uploadedIdUrl,
                            photoURL: uploadedProfileUrl,
                          }
                    );

                    setMatchStatus('saved');
                    setMatchMessage('Face and ID matched. Your registration has been saved.');
                  } catch (error: any) {
                    let message = error.message || 'Registration failed. Please try again.';
                    if (!faceIdMatched) console.error('[Face ID Match] Verification request failed', message);
                    if (error.code === 'auth/email-already-in-use') {
                      message = 'An account with this email already exists.';
                    } else if (error.code === 'auth/invalid-email') {
                      message = 'Invalid email address.';
                    } else if (error.code === 'auth/weak-password') {
                      message = 'Password is too weak. Use at least 6 characters.';
                    }
                    setMatchStatus('failed');
                    setMatchFailureKind(faceIdMatched && ticket ? 'registration' : 'service');
                    setMatchMessage(faceIdMatched
                      ? ticket ? `Face and ID matched, but registration could not be saved: ${message}` : `Face and ID matched, but email verification could not continue: ${message}`
                      : message);
                  } finally {
                    faceMatchTempFiles.forEach((file) => { try { file.delete(); } catch {} });
                    setLoading(false);
                  }
                }

                // ─── Full-screen Face Detection WebView ───
                if (cameraVisible) {
                  return (
                    <View style={{ flex: 1, backgroundColor: '#000' }}>
                      <WebView
                        ref={webviewRef}
                        style={StyleSheet.absoluteFill}
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
                        style={{ position: 'absolute', top: 12, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setCameraVisible(false)}
                      >
                        <Icon name="close" size={22} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  );
                }

                if (showMatchResult) {
                  return (
                    <IdentityVerificationResult
                      status={matchStatus}
                      failureKind={matchFailureKind}
                      message={matchMessage}
                      faceUri={faceImageUri}
                      idUri={idImageUrl}
                      emailOtpPending={emailOtpPending}
                      onPrimary={() => {
                        if (matchStatus === 'saved') router.replace('/(auth)/pending-verification');
                        else if (emailOtpPending) { setEmailOtpPending(false); setShowMatchResult(false); setShowOtpModal(true); }
                      }}
                      onRetry={() => {
                        setShowMatchResult(false);
                        setFaceIdVerified(false);
                        setEmailOtpPending(false);
                        setTimeout(() => registrationScrollRef.current?.scrollTo({ y: captureSectionY.current, animated: true }), 100);
                      }}
                      onSupport={() => modalAlert('Contact Support', 'Please contact your AgriCare administrator for assistance.')}
                    />
                  );
                }

                return (
                  <KeyboardAvoidingView
                    style={styles.container}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  >
                    <ScrollView
                      ref={registrationScrollRef}
                      contentContainerStyle={[
                        styles.content,
                        { paddingTop: 20, paddingBottom: insets.bottom + 104 },
                      ]}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      automaticallyAdjustKeyboardInsets
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
                        <Icon name="chevron-left" size={22} color={Colors.text} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{isFromRejected ? 'Re-Register' : 'Create Account'}</Text>
                        <View style={{ width: 36 }} />
                      </View>

                      <View style={styles.stepProgress}>
                        <Text style={styles.stepText}>Step {registrationStep + 1} of {registrationSteps.length} · {registrationSteps[registrationStep]}</Text>
                        <View style={styles.stepTrack}><View style={[styles.stepFill, { width: `${((registrationStep + 1) / registrationSteps.length) * 100}%` }]} /></View>
                      </View>

                      <View style={styles.form}>
                      {registrationStep === 0 && <>
                      {/* Role Selector */}
                      <Text style={styles.sectionLabel}>I am registering as a: <Text style={styles.required}>*</Text></Text>
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
                        {/* Full Name */}
                        <Text style={styles.inputLabel}>Full Name <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputContainer}>
                          <Icon name="profile" size={20} color={Colors.textSecondary} />
                          <TextInput
                            style={styles.input}
                            placeholder="Enter your full name"
                            placeholderTextColor={Colors.textLight}
                            value={displayName}
                            onChangeText={(value) => setDisplayName(value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ .'-]/g, ''))}
                            autoCapitalize="words"
                          />
                        </View>

                        {/* Email */}
                        <Text style={styles.inputLabel}>Email Address <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputContainer}>
                          <Icon name="messages" size={20} color={Colors.textSecondary} />
                          <TextInput
                            style={styles.input}
                            placeholder="Enter your email address"
                            placeholderTextColor={Colors.textLight}
                            value={email}
                            onChangeText={(value) => {
                              setEmail(value);
                              setEmailVerified(false);
                              setVerificationTicket('');
                            }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        </View>
                        <Text style={[styles.emailHint, emailVerified && styles.emailVerified]}>
                          {emailVerified ? 'Email verified' : 'A verification code will be sent before registration.'}
                        </Text>

                        {/* Phone Number */}
                        <Text style={styles.inputLabel}>Phone Number <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputContainer}>
                          <Icon name="phone" size={20} color={Colors.textSecondary} />
                          <TextInput
                            style={styles.input}
                            placeholder="09XXXXXXXXX"
                            placeholderTextColor={Colors.textLight}
                            value={phoneNumber}
                            onChangeText={(value) => setPhoneNumber(value.replace(/\D/g, '').slice(0, 11))}
                            keyboardType="number-pad"
                            maxLength={11}
                          />
                        </View>
                      </>}

                      {registrationStep === 2 && <>
                        {role === 'technician' && (
                          <>
                            <Text style={styles.inputLabel}>Street / Purok <Text style={styles.required}>*</Text></Text>
                            <View style={styles.inputContainer}>
                              <Icon name="location" size={20} color={Colors.textSecondary} />
                              <TextInput
                                style={styles.input}
                                placeholder="Enter street or purok"
                                placeholderTextColor={Colors.textLight}
                                value={streetPurok}
                                onChangeText={setStreetPurok}
                              />
                            </View>
                          </>
                        )}

                        {role === 'farmer' ? (
                          <>
                            <Text style={styles.inputLabel}>Purok <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity style={styles.inputContainer} onPress={() => setAddressPicker('purok')}>
                              <Icon name="location" size={20} color={Colors.textSecondary} />
                              <Text style={styles.input}>Purok {farmerPurok}</Text>
                              <Text style={styles.selectArrow}>⌄</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          [
                            { key: 'region', label: 'Region', value: selectedAddress.region?.description, disabled: false },
                            { key: 'province', label: 'Province', value: selectedAddress.province?.description, disabled: !selectedAddress.region },
                            { key: 'municipality', label: 'City / Municipality', value: selectedAddress.municipality?.description, disabled: !selectedAddress.province },
                            { key: 'barangay', label: 'Barangay', value: selectedAddress.barangay?.description, disabled: !selectedAddress.municipality },
                          ].map((field) => (
                            <React.Fragment key={field.key}>
                              <Text style={styles.inputLabel}>{field.label} <Text style={styles.required}>*</Text></Text>
                              <TouchableOpacity
                                style={[styles.inputContainer, field.disabled && styles.disabledSelect]}
                                disabled={field.disabled}
                                onPress={() => setAddressPicker(field.key as AddressPicker)}
                              >
                                <Icon name="location" size={20} color={Colors.textSecondary} />
                                <Text style={[styles.input, !field.value && styles.selectPlaceholder]}>
                                  {field.value || `Select ${field.label}`}
                                </Text>
                                <Text style={styles.selectArrow}>⌄</Text>
                              </TouchableOpacity>
                            </React.Fragment>
                          ))
                        )}
                      </>}

                      {registrationStep === 1 && <>
                        {/* Password */}
                        <Text style={styles.inputLabel}>Password <Text style={styles.required}>*</Text></Text>
                        <View style={styles.inputContainer}>
                          <Icon name="lock" size={20} color={Colors.textSecondary} />
                          <TextInput
                            style={styles.input}
                            placeholder="8+ chars: uppercase, lowercase, number, symbol"
                            placeholderTextColor={Colors.textLight}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                          />
                          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Icon name={showPassword ? 'close-eye' : 'eye'} size={20} color={Colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        {password.length > 0 && !isStrongPassword ? (
                          <Text style={styles.fieldErrorText}>Use 8+ characters with uppercase and lowercase letters, a number, and a symbol.</Text>
                        ) : (
                          <Text style={styles.emailHint}>8+ characters, uppercase, lowercase, number, and symbol.</Text>
                        )}

                        {/* Confirm Password */}
                        <Text style={styles.inputLabel}>Confirm Password <Text style={styles.required}>*</Text></Text>
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
                        {confirmPassword.length > 0 && !passwordsMatch && (
                          <Text style={styles.fieldErrorText}>Passwords do not match.</Text>
                        )}
                      </>}

                      {registrationStep === 3 && <>
                        {/* ─── PROFILE PHOTO (Required for both roles) ─── */}
                        <View style={styles.technicianSection} onLayout={(event) => { captureSectionY.current = event.nativeEvent.layout.y; }}>
                          <View style={styles.techSectionHeader}>
                            <Icon name="camera" size={20} color="#15803D" />
                            <Text style={styles.techSectionTitle}>Profile Photo <Text style={styles.required}>*</Text></Text>
                          </View>
                          <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18 }}>
                            Take a clear selfie of yourself. This will be your profile picture.
                          </Text>
                          {profilePhotoUrl ? (
                            <View style={{ alignItems: 'center', marginBottom: 12 }}>
                              <Image source={{ uri: profilePhotoUrl }} style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: Colors.primary }} resizeMode="cover" />
                            </View>
                          ) : null}
                          <TouchableOpacity
                            style={[styles.uploadProofBtn, { marginBottom: 8 }]}
                            onPress={openFaceDetection}
                          >
                            <Icon name="camera" size={18} color="#15803D" />
                            <Text style={styles.uploadProofBtnText}>{profilePhotoUrl ? 'Change Photo' : 'Take Photo'}</Text>
                          </TouchableOpacity>
                        </View>
                      </>}

                      {registrationStep === 4 && <>
                        {/* ─── FARMER ID CAPTURE ─── */}
                        {role === 'farmer' && (
                          <View style={styles.technicianSection}>
                            <View style={styles.techSectionHeader}>
                              <Icon name="profile" size={20} color="#15803D" />
                              <Text style={styles.techSectionTitle}>Valid ID Verification <Text style={styles.required}>*</Text></Text>
                            </View>
                            <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18 }}>
                              Please capture or upload a valid government-issued ID. The ID must include a clear face photo for matching.
                            </Text>
                            {idImageUrl ? (
                              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                                <Image source={{ uri: idImageUrl }} style={{ width: '100%', height: 160, borderRadius: 12 }} resizeMode="cover" />
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
                                    if (!result.canceled && result.assets?.[0]?.uri) { setIdImageUrl(result.assets[0].uri); setFaceIdVerified(false); }
                                  }},
                                  { text: 'Upload from Gallery', onPress: async () => {
                                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
                                    if (!result.canceled && result.assets?.[0]?.uri) { setIdImageUrl(result.assets[0].uri); setFaceIdVerified(false); }
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

                        {role === 'technician' && (
                          <View style={styles.technicianSection}>
                            <View style={styles.techSectionHeader}>
                              <Icon name="profile" size={20} color="#15803D" />
                              <Text style={styles.techSectionTitle}>Face and ID Verification <Text style={styles.required}>*</Text></Text>
                            </View>
                            <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18 }}>
                              Capture a clear face photo above and upload a government-issued ID that includes a clear face photo for matching.
                            </Text>
                            {idImageUrl ? <Image source={{ uri: idImageUrl }} style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }} resizeMode="cover" /> : null}
                            <TouchableOpacity style={styles.uploadProofBtn} onPress={() => modalAlert('Upload ID', 'Choose an option', [
                              { text: 'Camera', onPress: async () => {
                                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                                if (status !== 'granted') { modalAlert('Permission Denied', 'Camera permission is required.'); return; }
                                const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
                                if (!result.canceled && result.assets?.[0]?.uri) { setIdImageUrl(result.assets[0].uri); setFaceIdVerified(false); }
                              } },
                              { text: 'Upload from Gallery', onPress: async () => {
                                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
                                if (!result.canceled && result.assets?.[0]?.uri) { setIdImageUrl(result.assets[0].uri); setFaceIdVerified(false); }
                              } },
                              { text: 'Cancel', style: 'cancel' },
                            ])}>
                              <Icon name="image" size={20} color={Colors.primary} />
                              <Text style={styles.uploadProofBtnText}>
                                {idImageUrl ? 'Change ID Photo' : 'Upload ID Photo'}{!idImageUrl && <Text style={styles.required}> *</Text>}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </>}

                        {/* ─── TECHNICIAN SPECIFIC FIELDS ─── */}
                        {registrationStep === 5 && role === 'technician' && (
                          <View style={styles.technicianSection}>
                            <View style={styles.techSectionHeader}>
                              <Icon name="health-check" size={20} color="#15803D" />
                              <Text style={styles.techSectionTitle}>Technician Specializations & Proof</Text>
                            </View>

                            <Text style={styles.inputLabel}>Technician Specializations <Text style={styles.required}>*</Text></Text>
                            <Text style={styles.expertiseSub}>
                              Separate specializations with commas.
                            </Text>
                            <View style={styles.inputContainer}>
                              <TextInput
                                style={styles.input}
                                value={specializationInput}
                                onChangeText={setSpecializationInput}
                                placeholder="e.g., Cattle care, vaccination, breeding"
                                accessibilityLabel="Technician specializations, separated by commas"
                                returnKeyType="done"
                              />
                            </View>

                            {/* Upload Proof Image */}
                            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                              Upload Proof of Technician Qualification <Text style={styles.required}>*</Text>
                            </Text>
                            <Text style={styles.expertiseSub}>
                              Please attach a photo of your vet license, certificate, accreditation card, or ID.
                            </Text>

                            {proofImageUrl ? (
                              <View style={styles.proofPreviewContainer}>
                                <Image source={{ uri: proofImageUrl }} style={styles.proofPreviewImage} />
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

                      </View>

                      {/* Login Link */}
                      {registrationStep === 0 && <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                          <Text style={styles.loginLink}>Log In</Text>
                        </TouchableOpacity>
                      </View>}
                    </ScrollView>
                    <View style={[styles.wizardFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                      {registrationStep > 0 && <TouchableOpacity style={styles.wizardBack} onPress={() => setRegistrationStep((step) => step - 1)} disabled={loading}>
                        <Text style={styles.wizardBackText}>Back</Text>
                      </TouchableOpacity>}
                      <TouchableOpacity
                        style={[styles.registerButton, styles.wizardNext, (loading || uploadingProof) && styles.registerButtonDisabled]}
                        onPress={continueRegistration}
                        disabled={loading || uploadingProof}
                        activeOpacity={0.8}
                      >
                        {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.registerButtonText}>
                          {registrationStep === registrationSteps.length - 1 ? (role === 'technician' ? 'Submit Technician Registration' : 'Create Farmer Account') : 'Continue'}
                        </Text>}
                      </TouchableOpacity>
                    </View>
                    <Modal
                      transparent
                      visible={!!addressPicker}
                      animationType="slide"
                      onRequestClose={() => setAddressPicker(null)}
                    >
                      <View style={styles.addressModalBackdrop}>
                        <View style={[styles.addressModal, { marginBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 56 : 0) }]}>
                          <Text style={styles.addressModalTitle}>
                            {addressPicker === 'purok' ? 'Select Purok' : `Select ${addressPicker}`}
                          </Text>
                          <FlatList
                            data={addressOptions}
                            keyExtractor={(item) => item.value}
                            contentContainerStyle={{ paddingBottom: Spacing.sm }}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                              <TouchableOpacity style={styles.addressOption} onPress={() => handleAddressPick(item)}>
                                <Text style={styles.addressOptionText}>{item.label}</Text>
                              </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.addressOptionText}>No options available.</Text>}
                          />
                        </View>
                      </View>
                    </Modal>
                    <Modal
                      transparent
                      visible={showOtpModal}
                      animationType="fade"
                      onRequestClose={() => setShowOtpModal(false)}
                    >
                      <View style={styles.otpModalBackdrop}>
                        <View style={styles.otpModalCard}>
                          <Text style={styles.otpTitle}>Verify your email</Text>
                          <Text style={styles.otpDescription}>Enter the 6-digit code sent to {email.trim()}.</Text>
                          <TextInput
                            style={styles.otpInput}
                            value={otpCode}
                            onChangeText={(value) => setOtpCode(value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            keyboardType="number-pad"
                            maxLength={6}
                            autoFocus
                          />
                          <TouchableOpacity
                            style={[styles.registerButton, (otpLoading || otpCode.length !== 6) && styles.registerButtonDisabled]}
                            onPress={handleVerifyEmailOtp}
                            disabled={otpLoading || otpCode.length !== 6}
                          >
                            {otpLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.registerButtonText}>Verify email</Text>}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.otpResend}
                            disabled={otpLoading}
                            onPress={async () => {
                              setOtpLoading(true);
                              try {
                                await sendRegistrationEmailOtp(email.trim());
                                setOtpCode('');
                                modalAlert('Code Sent', 'A new verification code was sent to your email.');
                              } catch (error: any) {
                                modalAlert('Could Not Send Code', error.message || 'Please try again later.');
                              } finally {
                                setOtpLoading(false);
                              }
                            }}
                          >
                            <Text style={styles.otpResendText}>Resend code</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setShowOtpModal(false)}>
                            <Text style={styles.otpCancel}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
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
                stepProgress: { marginBottom: Spacing.xl },
                stepText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 8 },
                stepTrack: { height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' },
                stepFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
                wizardFooter: {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.md,
                  paddingHorizontal: Spacing.xl,
                  paddingTop: Spacing.sm,
                  backgroundColor: Colors.white,
                  borderTopWidth: 1,
                  borderTopColor: '#E2E8F0',
                },
                wizardBack: {
                  minWidth: 84,
                  alignItems: 'center',
                  paddingVertical: Spacing.md,
                  borderWidth: 1,
                  borderColor: Colors.primary,
                  borderRadius: BorderRadius.full,
                },
                wizardBackText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '700' },
                wizardNext: { flex: 1, marginTop: 0 },
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
                required: { color: '#DC2626' },
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
                selectPlaceholder: {
                  color: Colors.textLight,
                },
                selectArrow: {
                  color: Colors.textSecondary,
                  fontSize: 20,
                },
                disabledSelect: {
                  opacity: 0.5,
                },
                addressModalBackdrop: {
                  flex: 1,
                  justifyContent: 'flex-end',
                  backgroundColor: 'rgba(15, 23, 42, 0.45)',
                },
                addressModal: {
                  maxHeight: '70%',
                  backgroundColor: Colors.white,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: Spacing.lg,
                },
                addressModalTitle: {
                  fontSize: FontSize.lg,
                  fontWeight: '700',
                  color: Colors.text,
                  marginBottom: Spacing.md,
                  textTransform: 'capitalize',
                },
                addressOption: {
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E2E8F0',
                },
                addressOptionText: {
                  fontSize: FontSize.md,
                  color: Colors.text,
                },
                emailHint: {
                  color: Colors.textSecondary,
                  fontSize: FontSize.xs,
                  marginTop: -Spacing.xs,
                  marginBottom: Spacing.md,
                },
                emailVerified: { color: Colors.primary, fontWeight: '700' },
                fieldErrorText: { color: Colors.error, fontSize: FontSize.xs, marginTop: Spacing.xs },
                otpModalBackdrop: {
                  flex: 1,
                  justifyContent: 'center',
                  padding: Spacing.lg,
                  backgroundColor: 'rgba(15, 23, 42, 0.55)',
                },
                otpModalCard: {
                  backgroundColor: Colors.white,
                  borderRadius: BorderRadius.lg,
                  padding: Spacing.lg,
                },
                otpTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
                otpDescription: { color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: Spacing.md },
                otpInput: {
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  textAlign: 'center',
                  letterSpacing: 8,
                  fontSize: FontSize.xl,
                  color: Colors.text,
                  marginBottom: Spacing.md,
                },
                otpResend: { alignItems: 'center', padding: Spacing.md },
                otpResendText: { color: Colors.primary, fontWeight: '700' },
                otpCancel: { textAlign: 'center', color: Colors.textSecondary, padding: Spacing.sm },

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

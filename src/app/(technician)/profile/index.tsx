import { Avatar, Icon } from "@/components/ui";
import {
  FONT_SIZE_CHOICES,
  AppText as Text,
  AppTextInput as TextInput,
  useFontScale,
} from "@/components/ui/FontScale";
import { modalAlert } from "@/components/ui/ModalAlert";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  clearSession,
  getSession,
  saveSession,
  UserSession,
} from "@/services/sessionService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import regions from "../../../../assets/addresses/region.json";
import provinces from "../../../../assets/addresses/province.json";
import municipalities from "../../../../assets/addresses/muncity.json";
import barangays from "../../../../assets/addresses/barangay.json";

const BIOMETRICS_KEY = "@agricare_biometrics_enabled";
type AddressPicker = "region" | "province" | "municipality" | "barangay" | null;
type AddressOption = { value: string; label: string };

const getInitialAddress = (address = "") => {
  const parts = address.split(",").map((part) => part.trim());
  const province = provinces.find((item) => parts.includes(item.description));
  const municipality = province && municipalities.find((item) =>
    parts.includes(item.description) &&
    String(item.code).padStart(9, "0").slice(0, 4) === String(province.code).padStart(9, "0").slice(0, 4)
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

const getInitialStreetPurok = (address = "") => {
  const parts = address.split(",").map((part) => part.trim());
  const barangayIndex = parts.findIndex((part) => barangays.some((item) => item.description === part));
  return barangayIndex > 0 ? parts.slice(0, barangayIndex).join(", ") : "";
};

export default function TechnicianProfileScreen() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [photoURL, setPhotoURL] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Account Settings
  const [accountModal, setAccountModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStreetPurok, setEditStreetPurok] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(getInitialAddress);
  const [addressPicker, setAddressPicker] = useState<AddressPicker>(null);
  const [saving, setSaving] = useState(false);

  const addressOptions = useMemo<AddressOption[]>(() => {
    switch (addressPicker) {
      case "region":
        return regions.map((item) => ({ value: String(item.region_id), label: item.description }));
      case "province":
        return provinces.filter((item) => item.region_id === selectedAddress.region?.region_id)
          .map((item) => ({ value: String(item.province_id), label: item.description }));
      case "municipality":
        return municipalities.filter((item) =>
          String(item.code).padStart(9, "0").slice(0, 4) === String(selectedAddress.province?.code).padStart(9, "0").slice(0, 4)
        ).map((item) => ({ value: String(item.muncity_id), label: item.description }));
      case "barangay":
        return barangays.filter((item) => item.muncity_id === selectedAddress.municipality?.muncity_id)
          .map((item) => ({ value: String(item.barangay_id), label: item.description }));
      default:
        return [];
    }
  }, [addressPicker, selectedAddress]);

  const handleAddressPick = (option: AddressOption) => {
    if (addressPicker === "region") {
      const region = regions.find((item) => String(item.region_id) === option.value) || null;
      setSelectedAddress({ region, province: null, municipality: null, barangay: null });
    } else if (addressPicker === "province") {
      const province = provinces.find((item) => String(item.province_id) === option.value) || null;
      setSelectedAddress((current) => ({ ...current, province, municipality: null, barangay: null }));
    } else if (addressPicker === "municipality") {
      const municipality = municipalities.find((item) => String(item.muncity_id) === option.value) || null;
      setSelectedAddress((current) => ({ ...current, municipality, barangay: null }));
    } else if (addressPicker === "barangay") {
      const barangay = barangays.find((item) => String(item.barangay_id) === option.value) || null;
      setSelectedAddress((current) => ({ ...current, barangay }));
    }
    setAddressPicker(null);
  };

  // Security
  const [securityModal, setSecurityModal] = useState(false);
  const [biometrics, setBiometrics] = useState(false);

  // Notifications
  const [notifModal, setNotifModal] = useState(false);
  const [fontSizeModal, setFontSizeModal] = useState(false);
  const { choice: fontSizeChoice, setChoice: setFontSizeChoice } =
    useFontScale();

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      setUser(session);
      if (session) {
        setEditName(session.displayName);
        setEditEmail(session.email);
        try {
          const uid = auth().currentUser?.uid || session.uid;
          const doc = await firestore().collection("users").doc(uid).get();
          if (doc.exists) {
            const data = doc.data();
            if (data?.photoURL) setPhotoURL(data.photoURL);
            if (data?.phoneNumber) setEditPhone(data.phoneNumber);
            if (data?.location) {
              setSelectedAddress(getInitialAddress(data.location));
              setEditStreetPurok(getInitialStreetPurok(data.location));
            }
          }
        } catch (e) {}
      }
      const bio = await AsyncStorage.getItem(BIOMETRICS_KEY);
      setBiometrics(bio === "true");
      setLoading(false);
    };
    load();
  }, []);

  // ─── Logout ───
  const handleLogout = () => {
    modalAlert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await clearSession();
            await auth().signOut();
          } catch (e) {}
          router.replace("/");
        },
      },
    ]);
  };

  // ─── Account Settings Save ───
  const handleSaveAccount = async () => {
    if (!editName.trim()) {
      modalAlert("Error", "Name cannot be empty.");
      return;
    }
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'-]*$/.test(editName.trim())) {
      modalAlert("Invalid Name", "Use letters only, with spaces, apostrophes, or hyphens.");
      return;
    }
    if (editPhone.trim() && !/^\d{11}$/.test(editPhone.trim())) {
      modalAlert("Invalid Phone Number", "Enter an 11-digit phone number.");
      return;
    }
    if (!editStreetPurok.trim()) {
      modalAlert("Street / Purok Required", "Enter your street or purok.");
      return;
    }
    if (!selectedAddress.region || !selectedAddress.province || !selectedAddress.municipality || !selectedAddress.barangay) {
      modalAlert("Address Required", "Please select region, province, city/municipality, and barangay.");
      return;
    }
    setSaving(true);
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        await currentUser.updateProfile({ displayName: editName.trim() });
        await firestore().collection("users").doc(currentUser.uid).update({
          displayName: editName.trim(),
          phoneNumber: editPhone.trim(),
          location: `${editStreetPurok.trim()}, ${selectedAddress.barangay.description}, ${selectedAddress.municipality.description}, ${selectedAddress.province.description}`,
        });
      }
      if (user) {
        const updated: UserSession = { ...user, displayName: editName.trim() };
        await saveSession(updated);
        setUser(updated);
      }
      modalAlert("Success", "Profile updated.");
      setAccountModal(false);
    } catch (e: any) {
      modalAlert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Security ───
  const handleBiometricsToggle = async (enable: boolean) => {
    if (enable) {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        modalAlert(
          "Not Supported",
          "This device does not support biometric authentication.",
        );
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        modalAlert(
          "Not Set Up",
          "No biometrics enrolled on this device. Please set up fingerprint or face in your device settings.",
        );
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Verify to enable biometrics",
        fallbackLabel: "Use passcode",
      });
      if (!result.success) return;
      setBiometrics(true);
      await AsyncStorage.setItem(BIOMETRICS_KEY, "true");
      modalAlert("Enabled", "Biometric login is now active.");
    } else {
      setBiometrics(false);
      await AsyncStorage.setItem(BIOMETRICS_KEY, "false");
    }
  };

  if (loading)
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require("../../../../assets/images/technician/Lush Green Botanical Wave Background.png")}
          style={styles.header}
          resizeMode="cover"
        >
          <View style={styles.avatarRing}>
            <Avatar
              name={user?.displayName || "Technician"}
              imageUrl={photoURL}
              size={120}
            />
          </View>
          <Text style={styles.name}>{user?.displayName || "Technician"}</Text>
          <Text style={styles.role}>Technician</Text>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </ImageBackground>
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setAccountModal(true)}
          >
            <View style={[styles.menuIcon, styles.accountIcon]}>
              <Icon name="profile" size={30} color="#34B866" />
            </View>
            <View style={styles.menuCopy}>
              <Text style={styles.menuLabel}>Account Settings</Text>
              <Text style={styles.menuDescription}>
                Manage your personal information
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={Colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setFontSizeModal(true)}
          >
            <View style={[styles.fontSizeIcon, styles.accountIcon]}>
              <Text style={styles.fontSizeIconText}>Aa</Text>
            </View>
            <View style={styles.menuCopy}>
              <Text style={styles.menuLabel}>Font Size</Text>
              <Text style={styles.menuDescription}>
                Adjust the app text size
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={Colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setSecurityModal(true)}
          >
            <View style={[styles.menuIcon, styles.securityIcon]}>
              <Icon name="lock" size={30} color="#6941FF" />
            </View>
            <View style={styles.menuCopy}>
              <Text style={styles.menuLabel}>Security</Text>
              <Text style={styles.menuDescription}>
                Change password and security options
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={Colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={[styles.menuIcon, styles.notificationIcon]}>
              <Icon name="logout" size={30} color="#EF4056" />
            </View>
            <View style={styles.menuCopy}>
              <Text style={[styles.menuLabel, { color: Colors.error }]}>
                Log Out
              </Text>
              <Text style={styles.menuDescription}>
                Sign out from your account
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 30 }} />

        {/* Account Settings Modal */}
        <Modal visible={accountModal} transparent animationType="slide">
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.overlay}>
              <View style={[styles.modal, { maxHeight: "85%" }]}>
                <View style={styles.modalHead}>
                  <Text style={styles.modalTitle}>Account Settings</Text>
                  <TouchableOpacity onPress={() => setAccountModal(false)}>
                    <Icon name="close" size={22} color={Colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={{ flexShrink: 1 }}
                  keyboardShouldPersistTaps="handled"
                  automaticallyAdjustKeyboardInsets
                >
                  <Text style={styles.label}>Display Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Your name"
                    placeholderTextColor={Colors.textLight}
                  />
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, { color: Colors.textLight }]}
                    value={editEmail}
                    editable={false}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.textLight,
                      marginTop: 4,
                    }}
                  >
                    Email cannot be changed
                  </Text>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={editPhone}
                    onChangeText={(value) => setEditPhone(value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="09xxxxxxxxx"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="number-pad"
                    maxLength={11}
                  />
                  <Text style={styles.label}>Street / Purok *</Text>
                  <TextInput
                    style={styles.input}
                    value={editStreetPurok}
                    onChangeText={setEditStreetPurok}
                    placeholder="Enter street or purok"
                    placeholderTextColor={Colors.textLight}
                  />
                  {[
                    { key: "region" as const, label: "Region", value: selectedAddress.region?.description, disabled: false },
                    { key: "province" as const, label: "Province", value: selectedAddress.province?.description, disabled: !selectedAddress.region },
                    { key: "municipality" as const, label: "City / Municipality", value: selectedAddress.municipality?.description, disabled: !selectedAddress.province },
                    { key: "barangay" as const, label: "Barangay", value: selectedAddress.barangay?.description, disabled: !selectedAddress.municipality },
                  ].map((field) => (
                    <Fragment key={field.key}>
                      <Text style={styles.label}>{field.label} *</Text>
                      <TouchableOpacity
                        style={[styles.input, styles.addressSelect, field.disabled && styles.disabledSelect]}
                        disabled={field.disabled}
                        onPress={() => setAddressPicker(field.key)}
                        accessibilityRole="button"
                      >
                        <Text style={{ color: field.value ? Colors.text : Colors.textLight }}>{field.value || `Select ${field.label}`}</Text>
                        <Text style={{ color: Colors.textLight }}>⌄</Text>
                      </TouchableOpacity>
                    </Fragment>
                  ))}
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={handleSaveAccount}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
                <Modal
                  transparent
                  visible={!!addressPicker}
                  animationType="slide"
                  onRequestClose={() => setAddressPicker(null)}
                >
                  <View style={styles.addressModalBackdrop}>
                    <View style={styles.addressModal}>
                      <Text style={styles.addressModalTitle}>Select {addressPicker}</Text>
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
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Security Modal */}
        <Modal visible={securityModal} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>Security</Text>
                <TouchableOpacity onPress={() => setSecurityModal(false)}>
                  <Icon name="close" size={22} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>
                    Biometric Authentication
                  </Text>
                  <Text style={styles.settingDesc}>
                    Use fingerprint or face to unlock
                  </Text>
                </View>
                <Switch
                  value={biometrics}
                  onValueChange={handleBiometricsToggle}
                  trackColor={{ false: "#E2E8F0", true: Colors.primary + "80" }}
                  thumbColor={biometrics ? Colors.primary : "#f4f4f4"}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Notification Modal */}
        <Modal visible={notifModal} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>Notifications</Text>
                <TouchableOpacity onPress={() => setNotifModal(false)}>
                  <Icon name="close" size={22} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDesc}>
                    Notifications are always on
                  </Text>
                </View>
                <Icon name="check-circle" size={24} color={Colors.primary} />
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={fontSizeModal} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>Font Size</Text>
                <TouchableOpacity onPress={() => setFontSizeModal(false)}>
                  <Icon name="close" size={22} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.settingDesc}>
                Adjust text size across the app
              </Text>
              {FONT_SIZE_CHOICES.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.settingRow}
                  accessibilityRole="button"
                  onPress={() => {
                    void setFontSizeChoice(option.value);
                    setFontSizeModal(false);
                  }}
                >
                  <Text style={styles.settingLabel}>{option.label}</Text>
                  {fontSizeChoice === option.value && (
                    <Icon
                      name="check-circle"
                      size={22}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 32,
    backgroundColor: Colors.primary,
  },
  avatarRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 3,
    borderColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.white,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  role: {
    fontSize: FontSize.md,
    color: "#D6F4DE",
    marginTop: 2,
    textTransform: "capitalize",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  statusText: { fontSize: FontSize.md, fontWeight: "600", color: "#075B2B" },
  menu: {
    marginTop: -Spacing.xl,
    zIndex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  menuItem: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E4E2E2",
  },
  menuIcon: {
    width: 50,
    height: 50,
    marginRight: Spacing.lg,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  accountIcon: { backgroundColor: "#E5F6E9" },
  notificationIcon: { backgroundColor: "#FDE8EA" },
  securityIcon: { backgroundColor: "#EEE9FF" },
  menuCopy: { flex: 1, gap: Spacing.xs },
  menuDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fontSizeIcon: {
    width: 50,
    height: 50,
    marginRight: Spacing.lg,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  fontSizeIconText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.primary,
  },
  menuLabel: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
  },
  addressSelect: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  disabledSelect: { opacity: 0.5 },
  addressModalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.45)" },
  addressModal: { maxHeight: "70%", backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg },
  addressModalTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text, marginBottom: Spacing.md },
  addressOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  addressOptionText: { fontSize: FontSize.md, color: Colors.text },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    marginTop: Spacing.xxl,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  settingLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  settingDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

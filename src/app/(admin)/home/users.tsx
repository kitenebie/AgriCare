import { Icon, Avatar } from "@/components/ui";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { db, Collections } from "@/services/firebase";
import firestore, { collection, onSnapshot } from "@react-native-firebase/firestore";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface UserRecord {
  id: string;
  displayName: string;
  email: string;
  role: "admin" | "farmer" | "technician";
  phoneNumber?: string;
  status: "active" | "approved" | "pending" | "inactive" | "rejected";
  photoURL?: string;
  proofImageUrl?: string;
  expertise?: string[];
  specialization?: string;
  location?: string;
  licenseNumber?: string;
  totalAnimals?: number;
  createdAt?: any;
}

const safeStr = (val: any, fallback = ""): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (val.toDate && typeof val.toDate === "function") {
      try {
        return val.toDate().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } catch (e) {
        return fallback;
      }
    }
    if (val._seconds !== undefined || val.seconds !== undefined) {
      try {
        const secs = val._seconds ?? val.seconds;
        return new Date(secs * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } catch (e) {
        return fallback;
      }
    }
    if (val.displayName) return String(val.displayName);
    if (val.name) return String(val.name);
    return fallback;
  }
  return String(val);
};

const INITIAL_MOCK_USERS: UserRecord[] = [
  {
    id: "admin_001",
    email: "admin@agricare.ph",
    displayName: "Admin AgriCare",
    role: "admin",
    phoneNumber: "+63 900 000 0001",
    status: "active",
    location: "Malolos, Bulacan",
  },
  {
    id: "tech_001",
    email: "pedro.santos@agricare.ph",
    displayName: "Pedro Santos",
    role: "technician",
    phoneNumber: "+63 917 111 2222",
    status: "active",
    specialization: "Large Ruminants & Artificial Insemination",
    licenseNumber: "VET-LIC-88219",
    location: "San Miguel, Bulacan",
  },
  {
    id: "tech_002",
    email: "ana.reyes@agricare.ph",
    displayName: "Ana Reyes",
    role: "technician",
    phoneNumber: "+63 918 222 3333",
    status: "active",
    specialization: "Poultry & Swine Healthcare",
    licenseNumber: "VET-LIC-44102",
    location: "Angat, Bulacan",
  },
  {
    id: "tech_003",
    email: "mark.delacruz@agricare.ph",
    displayName: "Mark Dela Cruz",
    role: "technician",
    phoneNumber: "+63 919 333 4444",
    status: "active",
    specialization: "Goats & Small Ruminant Parasitology",
    licenseNumber: "VET-LIC-19034",
    location: "San Ildefonso, Bulacan",
  },
  {
    id: "tech_004",
    email: "rosa.mendoza@agricare.ph",
    displayName: "Rosa Mendoza",
    role: "technician",
    phoneNumber: "+63 920 444 5555",
    status: "pending",
    specialization: "General Livestock Vaccination",
    licenseNumber: "VET-LIC-99120",
    location: "Norzagaray, Bulacan",
  },
  {
    id: "tech_005",
    email: "carlos.villanueva@agricare.ph",
    displayName: "Carlos Villanueva",
    role: "technician",
    phoneNumber: "+63 921 555 6666",
    status: "pending",
    specialization: "Cattle Nutrition & Breeding",
    licenseNumber: "VET-LIC-31298",
    location: "DRT, Bulacan",
  },
  {
    id: "farmer_001",
    email: "juan@agricare.ph",
    displayName: "Juan Dela Cruz",
    role: "farmer",
    phoneNumber: "+63 912 345 6789",
    status: "active",
    location: "San Miguel, Bulacan",
    totalAnimals: 12,
  },
  {
    id: "farmer_002",
    email: "maria@agricare.ph",
    displayName: "Maria Garcia",
    role: "farmer",
    phoneNumber: "+63 913 456 7890",
    status: "active",
    location: "Angat, Bulacan",
    totalAnimals: 8,
  },
  {
    id: "farmer_003",
    email: "jose@agricare.ph",
    displayName: "Jose Rivera",
    role: "farmer",
    phoneNumber: "+63 914 567 8901",
    status: "active",
    location: "Norzagaray, Bulacan",
    totalAnimals: 5,
  },
  {
    id: "farmer_004",
    email: "lorna@agricare.ph",
    displayName: "Lorna Santos",
    role: "farmer",
    phoneNumber: "+63 915 678 9012",
    status: "active",
    location: "San Ildefonso, Bulacan",
    totalAnimals: 20,
  },
  {
    id: "farmer_005",
    email: "pedro.farmer@agricare.ph",
    displayName: "Pedro Reyes",
    role: "farmer",
    phoneNumber: "+63 916 789 0123",
    status: "inactive",
    location: "DRT, Bulacan",
    totalAnimals: 3,
  },
];

type MainTab = "technicians" | "farmers" | "admin";

export default function UsersManagementScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MainTab>("technicians");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [addAdminModalVisible, setAddAdminModalVisible] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  const [detailUser, setDetailUser] = useState<UserRecord | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // ─── Realtime Firestore Listener ───
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onSnapshot(
        collection(db, Collections.USERS),
        (snapshot) => {
          if (snapshot) {
            const fetchedUsers: UserRecord[] = snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                displayName: safeStr(d.displayName || d.name, "User"),
                email: safeStr(d.email, ""),
                role: (safeStr(d.role, "farmer") as any),
                phoneNumber: safeStr(d.phoneNumber || d.phone, ""),
                status: (safeStr(d.status, "active") as any),
                photoURL: safeStr(d.photoURL, ""),
                proofImageUrl: safeStr(d.proofImageUrl, ""),
                expertise: Array.isArray(d.expertise) ? d.expertise.map((e: any) => safeStr(e)) : [],
                specialization: safeStr(d.specialization, ""),
                location: safeStr(d.location, "Bulacan"),
                licenseNumber: safeStr(d.licenseNumber, ""),
                totalAnimals: typeof d.totalAnimals === "number" ? d.totalAnimals : 0,
                createdAt: safeStr(d.createdAt, ""),
              };
            });

            setUsers(fetchedUsers);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore users listen error:", error.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.warn("onSnapshot setup error:", err.message);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // ─── Filtered Lists by Tab ───
  const techniciansList = useMemo(() => {
    return users.filter(
      (u) =>
        u.role === "technician" &&
        (u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.specialization &&
            u.specialization.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [users, searchQuery]);

  const farmersList = useMemo(() => {
    return users.filter(
      (u) =>
        u.role === "farmer" &&
        (u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.location &&
            u.location.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [users, searchQuery]);

  const adminList = useMemo(() => {
    return users.filter(
      (u) =>
        u.role === "admin" &&
        (u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery]);

  // Total admin count overall (used for delete rule: cannot delete if admin count <= 1)
  const totalAdminCount = useMemo(() => {
    return users.filter((u) => u.role === "admin").length;
  }, [users]);

  // ─── Technician Approval Action ───
  const handleApproveTechnician = async (techId: string, techName: string) => {
    Alert.alert(
      "Approve Technician",
      `Are you sure you want to approve ${techName}'s technician account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve Account",
          style: "default",
          onPress: async () => {
            // Local state update first for snappy UX
            setUsers((prev) =>
              prev.map((u) =>
                u.id === techId ? { ...u, status: "active" } : u
              )
            );

            try {
              await firestore()
                .collection(Collections.USERS)
                .doc(techId)
                .set({ status: "active" }, { merge: true });
            } catch (err: any) {
              console.warn("Firestore update error:", err.message);
            }

            Alert.alert("Approved", `${techName} has been approved as an active Vet Technician!`);
          },
        },
      ]
    );
  };

  const handleRejectTechnician = async (techId: string, techName: string) => {
    Alert.alert(
      "Reject Application",
      `Reject ${techName}'s technician registration?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject / Deactivate",
          style: "destructive",
          onPress: async () => {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === techId ? { ...u, status: "rejected" } : u
              )
            );

            try {
              await firestore()
                .collection(Collections.USERS)
                .doc(techId)
                .set({ status: "rejected" }, { merge: true });
            } catch (err: any) {
              console.warn("Firestore update error:", err.message);
            }
          },
        },
      ]
    );
  };

  // ─── Add Admin Action ───
  const handleCreateAdmin = async () => {
    if (!newAdminName.trim() || !newAdminEmail.trim()) {
      Alert.alert("Missing Fields", "Please provide a name and valid email for the new Admin.");
      return;
    }

    setSubmittingAdmin(true);
    const newId = `admin_${Date.now()}`;
    const newAdminObj: UserRecord = {
      id: newId,
      displayName: newAdminName.trim(),
      email: newAdminEmail.trim().toLowerCase(),
      phoneNumber: newAdminPhone.trim() || "+63 900 000 0000",
      role: "admin",
      status: "active",
      location: "Central HQ, Bulacan",
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    // Update local state
    setUsers((prev) => [newAdminObj, ...prev]);

    try {
      await firestore().collection(Collections.USERS).doc(newId).set(newAdminObj);
    } catch (err: any) {
      console.warn("Firestore create admin error:", err.message);
    }

    setSubmittingAdmin(false);
    setAddAdminModalVisible(false);
    setNewAdminName("");
    setNewAdminEmail("");
    setNewAdminPhone("");
    Alert.alert("Admin Created", `Administrator "${newAdminObj.displayName}" added successfully.`);
  };

  // ─── Delete Admin Action ───
  const handleDeleteAdmin = (adminId: string, adminName: string) => {
    // RULE ENFORCEMENT: Cannot delete if admin count is 1 or less
    if (totalAdminCount <= 1) {
      Alert.alert(
        "Action Restricted",
        "Cannot delete this administrator. System requires at least 1 active Admin account at all times."
      );
      return;
    }

    Alert.alert(
      "Delete Admin",
      `Are you sure you want to remove administrator "${adminName}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Admin",
          style: "destructive",
          onPress: async () => {
            setUsers((prev) => prev.filter((u) => u.id !== adminId));

            try {
              await firestore().collection(Collections.USERS).doc(adminId).delete();
            } catch (err: any) {
              console.warn("Firestore delete admin error:", err.message);
            }

            Alert.alert("Deleted", `Admin "${adminName}" was removed.`);
          },
        },
      ]
    );
  };

  const openUserDetail = (user: UserRecord) => {
    setDetailUser(user);
    setDetailModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top + 8, 40) },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Icon
              name="chevron-right"
              size={20}
              color={Colors.white}
              strokeWidth={2.5}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>User Management</Text>

          {activeTab === "admin" ? (
            <TouchableOpacity
              style={styles.addAdminHeaderBtn}
              onPress={() => setAddAdminModalVisible(true)}
              activeOpacity={0.8}
            >
              <Icon name="plus" size={16} color="#15803D" />
              <Text style={styles.addAdminHeaderBtnText}>Add Admin</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        {/* 3 Main Role Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "technicians" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("technicians")}
            activeOpacity={0.8}
          >
            <Icon
              name="technician"
              size={16}
              color={activeTab === "technicians" ? "#1B5E20" : "rgba(255,255,255,0.7)"}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "technicians" && styles.tabBtnTextActive,
              ]}
            >
              Technicians ({techniciansList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "farmers" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("farmers")}
            activeOpacity={0.8}
          >
            <Icon
              name="farmer"
              size={16}
              color={activeTab === "farmers" ? "#1B5E20" : "rgba(255,255,255,0.7)"}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "farmers" && styles.tabBtnTextActive,
              ]}
            >
              Farmers ({farmersList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "admin" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("admin")}
            activeOpacity={0.8}
          >
            <Icon
              name="user-cog"
              size={16}
              color={activeTab === "admin" ? "#1B5E20" : "rgba(255,255,255,0.7)"}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "admin" && styles.tabBtnTextActive,
              ]}
            >
              Admin ({adminList.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Scroll View */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 80, 100),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input */}
        <View style={styles.searchBarContainer}>
          <Icon name="search" size={18} color="#718096" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor="#A0AEC0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Icon name="close" size={16} color="#A0AEC0" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>Loading user records...</Text>
          </View>
        ) : (
          <>
            {/* TAB 1: TECHNICIANS */}
            {activeTab === "technicians" && (
              <View style={styles.userListGap}>
                {techniciansList.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Icon name="technician" size={40} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>No Technicians Found</Text>
                    <Text style={styles.emptySubtitle}>
                      No technician accounts match your query.
                    </Text>
                  </View>
                ) : (
                  techniciansList.map((tech) => {
                    const isPending =
                      tech.status === "pending" || tech.status === "inactive";

                    return (
                      <View key={tech.id} style={styles.userCard}>
                        <TouchableOpacity
                          style={styles.userCardMain}
                          onPress={() => openUserDetail(tech)}
                          activeOpacity={0.8}
                        >
                          <Avatar name={tech.displayName} size={44} />
                          <View style={styles.userCardInfo}>
                            <View style={styles.userHeaderLine}>
                              <Text style={styles.userNameText}>
                                {tech.displayName}
                              </Text>
                              <View
                                style={[
                                  styles.statusBadge,
                                  isPending
                                    ? styles.statusPendingBg
                                    : styles.statusActiveBg,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusBadgeText,
                                    isPending
                                      ? styles.statusPendingText
                                      : styles.statusActiveText,
                                  ]}
                                >
                                  {isPending ? "Pending Approval" : "Approved"}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.userSubText}>{tech.email}</Text>
                            {tech.specialization && (
                              <Text style={styles.userSpecText} numberOfLines={1}>
                                🩺 {tech.specialization}
                              </Text>
                            )}
                            <Text style={styles.userLocText}>
                              📍 {tech.location || "Bulacan"} • {tech.phoneNumber || "No phone"}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Approval / Deactivation Button Toolbar */}
                        <View style={styles.techActionDock}>
                          {isPending ? (
                            <View style={styles.techApproveRow}>
                              <TouchableOpacity
                                style={styles.approveBtn}
                                onPress={() =>
                                  handleApproveTechnician(tech.id, tech.displayName)
                                }
                                activeOpacity={0.8}
                              >
                                <Icon name="check" size={16} color={Colors.white} />
                                <Text style={styles.approveBtnText}>
                                  Approve Technician
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.rejectBtn}
                                onPress={() =>
                                  handleRejectTechnician(tech.id, tech.displayName)
                                }
                                activeOpacity={0.8}
                              >
                                <Icon name="close" size={16} color="#DC2626" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View style={styles.approvedNoticeRow}>
                              <View style={styles.approvedCheckIcon}>
                                <Icon name="check-circle" size={14} color="#15803D" />
                                <Text style={styles.approvedNoticeText}>
                                  Accredited Vet Technician
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() =>
                                  handleRejectTechnician(tech.id, tech.displayName)
                                }
                              >
                                <Text style={styles.deactivateLinkText}>
                                  Deactivate
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB 2: FARMERS (VIEWING ONLY) */}
            {activeTab === "farmers" && (
              <View style={styles.userListGap}>
                <View style={styles.viewOnlyInfoBanner}>
                  <Icon name="lock" size={14} color="#1E40AF" />
                  <Text style={styles.viewOnlyBannerText}>
                    Farmers Directory (Viewing & Audit Mode)
                  </Text>
                </View>

                {farmersList.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Icon name="farmer" size={40} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>No Farmers Found</Text>
                    <Text style={styles.emptySubtitle}>
                      No registered farmer accounts in system.
                    </Text>
                  </View>
                ) : (
                  farmersList.map((farmer) => (
                    <TouchableOpacity
                      key={farmer.id}
                      style={styles.farmerCard}
                      onPress={() => openUserDetail(farmer)}
                      activeOpacity={0.85}
                    >
                      <Avatar name={farmer.displayName} size={44} />
                      <View style={styles.userCardInfo}>
                        <View style={styles.userHeaderLine}>
                          <Text style={styles.userNameText}>
                            {farmer.displayName}
                          </Text>
                          <View style={styles.farmerRolePill}>
                            <Text style={styles.farmerRolePillText}>Farmer</Text>
                          </View>
                        </View>

                        <Text style={styles.userSubText}>{farmer.email}</Text>

                        <View style={styles.farmerMetaRow}>
                          <Text style={styles.userLocText}>
                            📍 {farmer.location || "Bulacan"}
                          </Text>
                          <View style={styles.animalCountBadge}>
                            <Icon name="paw" size={12} color="#15803D" />
                            <Text style={styles.animalCountText}>
                              {farmer.totalAnimals || 0} Livestock
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: ADMIN (ADD & DELETE WITH RESTRICTIONS) */}
            {activeTab === "admin" && (
              <View style={styles.userListGap}>
                {/* Admin Add Quick Action Banner */}
                <TouchableOpacity
                  style={styles.addAdminBannerBtn}
                  onPress={() => setAddAdminModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.addAdminBannerIcon}>
                    <Icon name="plus" size={20} color={Colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addAdminBannerTitle}>
                      Add New Administrator
                    </Text>
                    <Text style={styles.addAdminBannerSub}>
                      Grant full management access to a team member
                    </Text>
                  </View>
                </TouchableOpacity>

                {adminList.map((admin) => {
                  // Rule: Cannot delete if only 1 admin record left
                  const canDelete = totalAdminCount > 1;

                  return (
                    <View key={admin.id} style={styles.adminCard}>
                      <TouchableOpacity
                        style={styles.adminCardMain}
                        onPress={() => openUserDetail(admin)}
                        activeOpacity={0.8}
                      >
                        <Avatar name={admin.displayName} size={44} />
                        <View style={styles.userCardInfo}>
                          <View style={styles.userHeaderLine}>
                            <Text style={styles.userNameText}>
                              {admin.displayName}
                            </Text>
                            <View style={styles.adminBadge}>
                              <Icon name="user-cog" size={12} color="#9333EA" />
                              <Text style={styles.adminBadgeText}>System Admin</Text>
                            </View>
                          </View>

                          <Text style={styles.userSubText}>{admin.email}</Text>
                          <Text style={styles.userLocText}>
                            📞 {admin.phoneNumber || "HQ Admin"} • Active
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Delete Admin Bar */}
                      <View style={styles.adminDeleteBar}>
                        {canDelete ? (
                          <TouchableOpacity
                            style={styles.deleteAdminBtn}
                            onPress={() =>
                              handleDeleteAdmin(admin.id, admin.displayName)
                            }
                            activeOpacity={0.75}
                          >
                            <Icon name="trash" size={14} color="#DC2626" />
                            <Text style={styles.deleteAdminBtnText}>
                              Delete Admin Record
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.protectedAdminNotice}>
                            <Icon name="lock" size={13} color="#D97706" />
                            <Text style={styles.protectedAdminText}>
                              Primary Admin (Protected — cannot delete sole admin)
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── ADD ADMIN MODAL ─── */}
      <Modal
        visible={addAdminModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddAdminModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "85%" }]}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Create New Admin</Text>
              <TouchableOpacity
                onPress={() => setAddAdminModalVisible(false)}
                style={styles.modalCloseCircle}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalSheetBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fieldLabel}>Admin Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Maria Santos"
                placeholderTextColor="#A0AEC0"
                value={newAdminName}
                onChangeText={setNewAdminName}
              />

              <Text style={styles.fieldLabel}>Email Address *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="admin.maria@agricare.ph"
                placeholderTextColor="#A0AEC0"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newAdminEmail}
                onChangeText={setNewAdminEmail}
              />

              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="+63 900 123 4567"
                placeholderTextColor="#A0AEC0"
                keyboardType="phone-pad"
                value={newAdminPhone}
                onChangeText={setNewAdminPhone}
              />

              <View style={styles.adminPrivilegeBox}>
                <Icon name="shield-alert" size={16} color="#9333EA" />
                <Text style={styles.adminPrivilegeText}>
                  This user will be granted full access to Knowledge Base, Announcements, User Management, and Forum Administration.
                </Text>
              </View>
            </ScrollView>

            <View
              style={[
                styles.modalSheetFooter,
                { paddingBottom: Math.max(insets.bottom + 14, 24) },
              ]}
            >
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setAddAdminModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitAdminBtn}
                onPress={handleCreateAdmin}
                disabled={submittingAdmin}
              >
                {submittingAdmin ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Icon name="check" size={18} color={Colors.white} />
                    <Text style={styles.submitAdminText}>Confirm Admin</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── USER PROFILE DETAIL READER MODAL ─── */}
      <Modal
        visible={detailModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.detailCardContainer}>
            {detailUser && (
              <>
                <View style={styles.detailCardHeader}>
                  <Avatar name={detailUser.displayName} size={54} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.detailUserName}>
                      {detailUser.displayName}
                    </Text>
                    <Text style={styles.detailUserRole}>
                      {detailUser.role.toUpperCase()} • {detailUser.status.toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDetailModalVisible(false)}
                    style={styles.detailCloseIconBtn}
                  >
                    <Icon name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailCardBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Email:</Text>
                    <Text style={styles.detailRowVal}>{detailUser.email}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Phone:</Text>
                    <Text style={styles.detailRowVal}>
                      {detailUser.phoneNumber || "Not provided"}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Location:</Text>
                    <Text style={styles.detailRowVal}>
                      {detailUser.location || "Bulacan, PH"}
                    </Text>
                  </View>

                  {detailUser.role === "technician" && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailRowLabel}>Specialization:</Text>
                        <Text style={styles.detailRowVal}>
                          {detailUser.specialization || "General Veterinary"}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailRowLabel}>License No:</Text>
                        <Text style={styles.detailRowVal}>
                          {detailUser.licenseNumber || "VET-LICENSE-ACTIVE"}
                        </Text>
                      </View>
                    </>
                  )}

                  {detailUser.role === "farmer" && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Livestock Count:</Text>
                      <Text style={styles.detailRowVal}>
                        {detailUser.totalAnimals || 0} Registered Animals
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.closeDetailFullBtn}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.closeDetailFullText}>Close Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },
  header: {
    backgroundColor: "#1B5E20",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "180deg" }],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.white,
  },
  addAdminHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addAdminHeaderBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: Colors.white,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  tabBtnTextActive: {
    color: "#1B5E20",
    fontWeight: "700",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
    ...Shadow.light,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#2D3748",
    marginLeft: 8,
    padding: 0,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: "#718096",
    marginTop: 12,
  },
  userListGap: {
    gap: Spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 40,
    marginTop: 20,
    ...Shadow.light,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },

  // ─── User Card Common ───
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    ...Shadow.light,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  userCardMain: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  userCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userHeaderLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  userSubText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  userSpecText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
    marginBottom: 4,
  },
  userLocText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  statusActiveBg: {
    backgroundColor: "#DCFCE7",
  },
  statusActiveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  statusPendingBg: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusPendingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },

  // Technician Actions
  techActionDock: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  techApproveRow: {
    flexDirection: "row",
    gap: 8,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#15803D",
    paddingVertical: 9,
    borderRadius: 12,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.white,
  },
  rejectBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  approvedNoticeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  approvedCheckIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  approvedNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
  },
  deactivateLinkText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },

  // Farmer Card (Viewing Only)
  viewOnlyInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  viewOnlyBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E40AF",
  },
  farmerCard: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    ...Shadow.light,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  farmerRolePill: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  farmerRolePillText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  farmerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  animalCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  animalCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },

  // Admin Card & Add Admin Banner
  addAdminBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    ...Shadow.light,
    borderWidth: 1.5,
    borderColor: "#15803D",
    borderStyle: "dashed",
    marginBottom: 4,
  },
  addAdminBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#15803D",
    justifyContent: "center",
    alignItems: "center",
  },
  addAdminBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  addAdminBannerSub: {
    fontSize: 12,
    color: "#64748B",
  },
  adminCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    ...Shadow.light,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  adminCardMain: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3E8FF",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9333EA",
  },
  adminDeleteBar: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  deleteAdminBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    paddingVertical: 8,
    borderRadius: 12,
  },
  deleteAdminBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  protectedAdminNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  protectedAdminText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "600",
  },

  // ─── Modal Sheet Add Admin ───
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSheetBody: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    marginBottom: Spacing.lg,
  },
  adminPrivilegeBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F3E8FF",
    padding: 12,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  adminPrivilegeText: {
    fontSize: 12,
    color: "#6B21A8",
    lineHeight: 18,
    flex: 1,
  },
  modalSheetFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  cancelModalText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  submitAdminBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#1B5E20",
  },
  submitAdminText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },

  // ─── Detail Reader Modal ───
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  detailCardContainer: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.xl,
    ...Shadow.medium,
  },
  detailCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  detailUserName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  detailUserRole: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
    marginTop: 2,
  },
  detailCloseIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  detailCardBody: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailRowLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  detailRowVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  closeDetailFullBtn: {
    backgroundColor: "#1B5E20",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  closeDetailFullText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
});

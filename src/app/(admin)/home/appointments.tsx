import { Icon, Avatar } from "@/components/ui";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { Collections } from "@/services/firebase";
import firestore from "@react-native-firebase/firestore";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface AppointmentRecord {
  id: string;
  serviceType: string;
  animalId?: string;
  animalName: string;
  farmerId: string;
  farmerName: string;
  technicianId: string;
  technicianName: string;
  date: string;
  time: string;
  status: "upcoming" | "pending" | "completed" | "cancelled";
  description: string;
  location: string;
  createdAt?: any;
}

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const INITIAL_MOCK_APPOINTMENTS: AppointmentRecord[] = [
  {
    id: "appt_001",
    serviceType: "Health Check",
    animalId: "animal_001",
    animalName: "Manny (Cow)",
    farmerId: "farmer_001",
    farmerName: "Juan Dela Cruz",
    technicianId: "tech_001",
    technicianName: "Pedro Santos",
    date: "2026-08-05",
    time: "09:00 AM",
    status: "upcoming",
    description: "Regular quarterly check-up and physical assessment.",
    location: "San Miguel, Bulacan",
  },
  {
    id: "appt_002",
    serviceType: "Vaccination",
    animalId: "animal_002",
    animalName: "Brownie (Chicken)",
    farmerId: "farmer_001",
    farmerName: "Juan Dela Cruz",
    technicianId: "tech_002",
    technicianName: "Ana Reyes",
    date: "2026-08-07",
    time: "10:00 AM",
    status: "upcoming",
    description: "Newcastle disease vaccine booster.",
    location: "San Miguel, Bulacan",
  },
  {
    id: "appt_003",
    serviceType: "De-worming",
    animalId: "animal_003",
    animalName: "Kiko (Goat)",
    farmerId: "farmer_001",
    farmerName: "Juan Dela Cruz",
    technicianId: "tech_003",
    technicianName: "Mark Dela Cruz",
    date: "2026-08-10",
    time: "01:00 PM",
    status: "pending",
    description: "De-worming treatment needed for goat herd.",
    location: "San Miguel, Bulacan",
  },
  {
    id: "appt_004",
    serviceType: "Health Check",
    animalId: "animal_006",
    animalName: "Daisy (Cow)",
    farmerId: "farmer_002",
    farmerName: "Maria Garcia",
    technicianId: "tech_001",
    technicianName: "Pedro Santos",
    date: "2026-08-04",
    time: "02:00 PM",
    status: "upcoming",
    description: "Pregnancy check and lactation advice.",
    location: "Angat, Bulacan",
  },
  {
    id: "appt_005",
    serviceType: "Treatment",
    animalId: "animal_007",
    animalName: "Whitey (Goat)",
    farmerId: "farmer_002",
    farmerName: "Maria Garcia",
    technicianId: "tech_003",
    technicianName: "Mark Dela Cruz",
    date: "2026-08-03",
    time: "09:00 AM",
    status: "upcoming",
    description: "Treating respiratory infection symptoms.",
    location: "Angat, Bulacan",
  },
  {
    id: "appt_006",
    serviceType: "Vaccination",
    animalId: "animal_008",
    animalName: "Blackie (Pig)",
    farmerId: "farmer_003",
    farmerName: "Jose Rivera",
    technicianId: "tech_002",
    technicianName: "Ana Reyes",
    date: "2026-07-28",
    time: "11:00 AM",
    status: "completed",
    description: "Hog cholera vaccine administered successfully.",
    location: "Norzagaray, Bulacan",
  },
  {
    id: "appt_007",
    serviceType: "Artificial Insemination",
    animalId: "animal_001",
    animalName: "Manny (Cow)",
    farmerId: "farmer_001",
    farmerName: "Juan Dela Cruz",
    technicianId: "tech_002",
    technicianName: "Ana Reyes",
    date: "2026-07-20",
    time: "08:00 AM",
    status: "completed",
    description: "AI procedure for breeding completed.",
    location: "San Miguel, Bulacan",
  },
  {
    id: "appt_008",
    serviceType: "Health Check",
    animalId: "animal_010",
    animalName: "Kabayo (Horse)",
    farmerId: "farmer_004",
    farmerName: "Lorna Santos",
    technicianId: "tech_001",
    technicianName: "Pedro Santos",
    date: "2026-07-15",
    time: "03:00 PM",
    status: "completed",
    description: "Annual health assessment and dental check.",
    location: "San Ildefonso, Bulacan",
  },
  {
    id: "appt_009",
    serviceType: "De-worming",
    animalId: "animal_004",
    animalName: "Babe (Pig)",
    farmerId: "farmer_001",
    farmerName: "Juan Dela Cruz",
    technicianId: "tech_003",
    technicianName: "Mark Dela Cruz",
    date: "2026-07-10",
    time: "10:00 AM",
    status: "cancelled",
    description: "Cancelled by farmer - animal fully recovered.",
    location: "San Miguel, Bulacan",
  },
];

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

export default function AdminAppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentRecord | null>(null);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = firestore().collection(Collections.APPOINTMENTS).onSnapshot(
        (snapshot) => {
          if (snapshot) {
            const data: AppointmentRecord[] = snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                serviceType: safeStr(d.serviceType, "Health Check"),
                animalId: safeStr(d.animalId, ""),
                animalName: safeStr(d.animalName, "Livestock"),
                farmerId: safeStr(d.farmerId, "farmer_001"),
                farmerName: safeStr(d.farmerName, "Farmer User"),
                technicianId: safeStr(d.technicianId, "tech_001"),
                technicianName: safeStr(d.technicianName, "Technician"),
                date: safeStr(d.date, "2026-08-01"),
                time: safeStr(d.time, "09:00 AM"),
                status: (safeStr(d.status, "upcoming") as any),
                description: safeStr(d.description, "No notes provided."),
                location: safeStr(d.location, "Bulacan"),
                createdAt: safeStr(d.createdAt, ""),
              };
            });
            setAppointments(data);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore appointments listen error:", error.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.warn("onSnapshot setup error:", err.message);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const matchesStatus =
        selectedStatus === "all" || item.status === selectedStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.farmerName.toLowerCase().includes(q) ||
        item.technicianName.toLowerCase().includes(q) ||
        item.animalName.toLowerCase().includes(q) ||
        item.serviceType.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [appointments, selectedStatus, searchQuery]);

  const counts = useMemo(() => {
    return {
      total: appointments.length,
      upcoming: appointments.filter((a) => a.status === "upcoming").length,
      pending: appointments.filter((a) => a.status === "pending").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
    };
  }, [appointments]);

  const openDetailModal = (item: AppointmentRecord) => {
    setSelectedAppt(item);
    setDetailModalVisible(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return { bg: "#DBEAFE", text: "#1D4ED8", label: "Upcoming" };
      case "pending":
        return { bg: "#FEF3C7", text: "#D97706", label: "Pending" };
      case "completed":
        return { bg: "#DCFCE7", text: "#15803D", label: "Completed" };
      case "cancelled":
        return { bg: "#FEE2E2", text: "#DC2626", label: "Cancelled" };
      default:
        return { bg: "#F1F5F9", text: "#64748B", label: status };
    }
  };

  return (
    <View style={styles.container}>
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

          <Text style={styles.headerTitle}>Appointments & Consultations</Text>

          <View style={styles.readOnlyBadge}>
            <Icon name="lock" size={12} color="#15803D" />
            <Text style={styles.readOnlyBadgeText}>Admin Monitor</Text>
          </View>
        </View>

        {/* Interactive Clickable Stats Row */}
        <View style={styles.statsSummaryRow}>
          <TouchableOpacity
            style={[
              styles.statSummaryPill,
              selectedStatus === "all" && styles.statSummaryPillActive,
            ]}
            onPress={() => setSelectedStatus("all")}
            activeOpacity={0.75}
          >
            <Text style={styles.statSummaryVal}>{counts.total}</Text>
            <Text style={styles.statSummaryText}>Total</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statSummaryPill,
              selectedStatus === "upcoming" && styles.statSummaryPillActive,
            ]}
            onPress={() => setSelectedStatus("upcoming")}
            activeOpacity={0.75}
          >
            <Text style={[styles.statSummaryVal, { color: "#60A5FA" }]}>
              {counts.upcoming}
            </Text>
            <Text style={styles.statSummaryText}>Upcoming</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statSummaryPill,
              selectedStatus === "pending" && styles.statSummaryPillActive,
            ]}
            onPress={() => setSelectedStatus("pending")}
            activeOpacity={0.75}
          >
            <Text style={[styles.statSummaryVal, { color: "#FBBF24" }]}>
              {counts.pending}
            </Text>
            <Text style={styles.statSummaryText}>Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statSummaryPill,
              selectedStatus === "completed" && styles.statSummaryPillActive,
            ]}
            onPress={() => setSelectedStatus("completed")}
            activeOpacity={0.75}
          >
            <Text style={[styles.statSummaryVal, { color: "#4ADE80" }]}>
              {counts.completed}
            </Text>
            <Text style={styles.statSummaryText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statSummaryPill,
              selectedStatus === "cancelled" && styles.statSummaryPillActive,
            ]}
            onPress={() => setSelectedStatus("cancelled")}
            activeOpacity={0.75}
          >
            <Text style={[styles.statSummaryVal, { color: "#F87171" }]}>
              {counts.cancelled}
            </Text>
            <Text style={styles.statSummaryText}>Cancelled</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 80, 100),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchBarContainer}>
          <Icon name="search" size={18} color="#718096" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search farmer, tech, animal, location..."
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusScroll}
          contentContainerStyle={styles.statusScrollContent}
        >
          {STATUS_FILTERS.map((st) => {
            const isSelected = selectedStatus === st.value;
            return (
              <TouchableOpacity
                key={st.value}
                style={[
                  styles.statusPill,
                  isSelected && styles.statusPillActive,
                ]}
                onPress={() => setSelectedStatus(st.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    isSelected && styles.statusPillTextActive,
                  ]}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>Loading appointment records...</Text>
          </View>
        ) : filteredAppointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="calendar" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Appointments Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No results match "${searchQuery}"`
                : "No appointment records in system."}
            </Text>
          </View>
        ) : (
          <View style={styles.apptList}>
            {filteredAppointments.map((appt) => {
              const statusStyle = getStatusBadge(appt.status);

              return (
                <TouchableOpacity
                  key={appt.id}
                  style={styles.apptCard}
                  onPress={() => openDetailModal(appt)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.serviceBadge}>
                      <Icon name="calendar" size={13} color="#15803D" />
                      <Text style={styles.serviceBadgeText}>
                        {appt.serviceType}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusStyle.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: statusStyle.text },
                        ]}
                      >
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.animalTitle}>{appt.animalName}</Text>

                  <View style={styles.scheduleRow}>
                    <Icon name="clock" size={14} color="#64748B" />
                    <Text style={styles.scheduleText}>
                      {appt.date} • {appt.time}
                    </Text>
                  </View>

                  <View style={styles.peopleBox}>
                    <View style={styles.personItem}>
                      <Avatar name={appt.farmerName} size={28} />
                      <View>
                        <Text style={styles.personLabel}>Farmer</Text>
                        <Text style={styles.personName}>{appt.farmerName}</Text>
                      </View>
                    </View>

                    <View style={styles.personDivider} />

                    <View style={styles.personItem}>
                      <Avatar name={appt.technicianName} size={28} />
                      <View>
                        <Text style={styles.personLabel}>Technician</Text>
                        <Text style={styles.personName}>
                          {appt.technicianName}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.locationRow}>
                      <Icon name="location" size={14} color="#94A3B8" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {appt.location}
                      </Text>
                    </View>

                    <Text style={styles.viewDetailsText}>View Details →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* READ-ONLY APPOINTMENT DETAIL MODAL */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalContainer, { maxHeight: "88%" }]}>
            {selectedAppt && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusBadge(selectedAppt.status).bg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color: getStatusBadge(selectedAppt.status).text,
                        },
                      ]}
                    >
                      {getStatusBadge(selectedAppt.status).label.toUpperCase()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setDetailModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Icon name="close" size={20} color="#475569" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.detailScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.detailServiceType}>
                    {selectedAppt.serviceType}
                  </Text>
                  <Text style={styles.detailAnimalName}>
                    {selectedAppt.animalName}
                  </Text>

                  <View style={styles.detailMetaBox}>
                    <View style={styles.detailMetaRow}>
                      <Icon name="calendar" size={16} color="#16A34A" />
                      <Text style={styles.detailMetaValue}>
                        Date: {selectedAppt.date}
                      </Text>
                    </View>
                    <View style={styles.detailMetaRow}>
                      <Icon name="clock" size={16} color="#2563EB" />
                      <Text style={styles.detailMetaValue}>
                        Time: {selectedAppt.time}
                      </Text>
                    </View>
                    <View style={styles.detailMetaRow}>
                      <Icon name="location" size={16} color="#DC2626" />
                      <Text style={styles.detailMetaValue}>
                        Location: {selectedAppt.location}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sectionHeaderTitle}>Parties Involved</Text>

                  <View style={styles.partyCard}>
                    <Avatar name={selectedAppt.farmerName} size={36} />
                    <View>
                      <Text style={styles.partyRole}>Farmer (Client)</Text>
                      <Text style={styles.partyName}>
                        {selectedAppt.farmerName}
                      </Text>
                      <Text style={styles.partyId}>
                        ID: {selectedAppt.farmerId}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.partyCard}>
                    <Avatar name={selectedAppt.technicianName} size={36} />
                    <View>
                      <Text style={styles.partyRole}>
                        Assigned Vet Technician
                      </Text>
                      <Text style={styles.partyName}>
                        {selectedAppt.technicianName}
                      </Text>
                      <Text style={styles.partyId}>
                        ID: {selectedAppt.technicianId}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sectionHeaderTitle}>Description / Notes</Text>
                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionText}>
                      {selectedAppt.description}
                    </Text>
                  </View>

                  <Text style={styles.recordIdFooterText}>
                    Appointment System ID: {selectedAppt.id}
                  </Text>
                </ScrollView>

                <View
                  style={[
                    styles.detailFooter,
                    { paddingBottom: Math.max(insets.bottom + 14, 24) },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.detailCloseBtn}
                    onPress={() => setDetailModalVisible(false)}
                  >
                    <Text style={styles.detailCloseBtnText}>Close Record</Text>
                  </TouchableOpacity>
                </View>
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
    paddingBottom: Spacing.lg,
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
  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  readOnlyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  statsSummaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  statSummaryPill: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  statSummaryPillActive: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    borderColor: Colors.white,
  },
  statSummaryVal: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.white,
  },
  statSummaryText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    marginTop: 2,
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
  statusScroll: {
    marginBottom: Spacing.lg,
  },
  statusScrollContent: {
    gap: 8,
  },
  statusPill: {
    backgroundColor: Colors.white,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusPillActive: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  statusPillTextActive: {
    color: Colors.white,
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
  emptyContainer: {
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
  apptList: {
    gap: Spacing.md,
  },
  apptCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.lg,
    ...Shadow.light,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  serviceBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  animalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  scheduleText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  peopleBox: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  personItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  personDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 8,
  },
  personLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  personName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: "#64748B",
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  detailModalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  detailScroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  detailServiceType: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailAnimalName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },
  detailMetaBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailMetaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    marginTop: 6,
  },
  partyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  partyRole: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  partyName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  partyId: {
    fontSize: 11,
    color: "#94A3B8",
  },
  descriptionBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  recordIdFooterText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
  },
  detailFooter: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  detailCloseBtn: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#1B5E20",
  },
  detailCloseBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
});

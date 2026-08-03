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
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface ConsultationRecord {
  id: string;
  farmerId: string;
  farmerName: string;
  technicianId: string;
  technicianName: string;
  animalId?: string;
  animalName?: string;
  subject: string;
  status: "active" | "resolved" | "pending" | "closed";
  notes: string;
  createdAt: string;
  resolvedAt?: string;
  diagnosis?: string;
  prescription?: string;
}

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Resolved", value: "resolved" },
  { label: "Pending", value: "pending" },
  { label: "Closed", value: "closed" },
];

const INITIAL_MOCK_CONSULTATIONS: ConsultationRecord[] = [
  {
    id: "consult_001",
    farmerId: "farmer_001",
    farmerName: "Juan Dela Cruz",
    technicianId: "tech_001",
    technicianName: "Pedro Santos",
    animalId: "animal_003",
    animalName: "Kiko (Goat)",
    subject: "Kiko not eating properly and looking sluggish",
    status: "active",
    notes: "Goat showing signs of parasitic infection. Recommended deworming and electrolyte therapy.",
    diagnosis: "Intestinal Parasitism",
    prescription: "Albendazole 10% drench 5ml daily for 3 days",
    createdAt: "2026-07-25",
  },
  {
    id: "consult_002",
    farmerId: "farmer_002",
    farmerName: "Maria Garcia",
    technicianId: "tech_003",
    technicianName: "Mark Dela Cruz",
    animalId: "animal_007",
    animalName: "Whitey (Goat)",
    subject: "Whitey has difficulty breathing and heavy coughing",
    status: "active",
    notes: "Upper respiratory tract infection detected. Prescribed injectable antibiotics and isolation.",
    diagnosis: "Acute Bronchopneumonia",
    prescription: "Oxytetracycline LA 2ml IM single injection",
    createdAt: "2026-07-30",
  },
  {
    id: "consult_003",
    farmerId: "farmer_004",
    farmerName: "Lorna Santos",
    technicianId: "tech_001",
    technicianName: "Pedro Santos",
    animalId: "animal_010",
    animalName: "Kabayo (Horse)",
    subject: "Kabayo limping on left front leg after farm work",
    status: "resolved",
    notes: "Minor joint strain. Rest, cold compress, and anti-inflammatory balm applied for 5 days.",
    diagnosis: "Fetlock Joint Sprain",
    prescription: "Meloxicam topical gel + 7 days stalled rest",
    createdAt: "2026-07-12",
    resolvedAt: "2026-07-18",
  },
  {
    id: "consult_004",
    farmerId: "farmer_003",
    farmerName: "Jose Rivera",
    technicianId: "tech_002",
    technicianName: "Ana Reyes",
    animalId: "animal_008",
    animalName: "Blackie (Pig)",
    subject: "Routine breeding inquiry and gestation diet check",
    status: "resolved",
    notes: "Assessed gilt nutritional balance. Adjusted protein ratio for second trimester.",
    diagnosis: "Healthy Gestation - Nutrition Consultation",
    prescription: "Add 15% soya meal supplement to daily feeds",
    createdAt: "2026-07-02",
    resolvedAt: "2026-07-05",
  },
  {
    id: "consult_005",
    farmerId: "farmer_001",
    farmerName: "Juan Dela Cruz",
    technicianId: "tech_002",
    technicianName: "Ana Reyes",
    animalId: "animal_001",
    animalName: "Manny (Cow)",
    subject: "Milk yield reduction inquiry after feed change",
    status: "pending",
    notes: "Farmer noticed 20% drop in daily milk output. Waiting for forage sample test results.",
    diagnosis: "Under Evaluation",
    createdAt: "2026-08-01",
  },
];

// Helper to safely parse strings and timestamps to prevent React render object crashes
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

export default function AdminConsultationsScreen() {
  const insets = useSafeAreaInsets();
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedConsult, setSelectedConsult] = useState<ConsultationRecord | null>(null);

  // ─── Realtime Firestore Listener ───
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onSnapshot(
        collection(db, Collections.CONSULTATIONS),
        (snapshot) => {
          if (snapshot) {
            const data: ConsultationRecord[] = snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                farmerId: safeStr(d.farmerId, "farmer_001"),
                farmerName: safeStr(d.farmerName, "Farmer User"),
                technicianId: safeStr(d.technicianId, "tech_001"),
                technicianName: safeStr(d.technicianName, "Technician"),
                animalId: safeStr(d.animalId, ""),
                animalName: safeStr(d.animalName, "Livestock"),
                subject: safeStr(d.subject, "General Consultation"),
                status: (safeStr(d.status, "active") as any),
                notes: safeStr(d.notes, "No case notes available."),
                diagnosis: safeStr(d.diagnosis, "Under Evaluation"),
                prescription: safeStr(d.prescription, "None"),
                createdAt: safeStr(d.createdAt, "2026-08-01"),
                resolvedAt: d.resolvedAt ? safeStr(d.resolvedAt, "") : undefined,
              };
            });
            setConsultations(data);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore consultations listen error:", error.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.warn("onSnapshot setup error:", err.message);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // ─── Filtered Consultations ───
  const filteredConsultations = useMemo(() => {
    return consultations.filter((item) => {
      const matchesStatus =
        selectedStatus === "all" || item.status === selectedStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.subject.toLowerCase().includes(q) ||
        item.farmerName.toLowerCase().includes(q) ||
        item.technicianName.toLowerCase().includes(q) ||
        (item.animalName && item.animalName.toLowerCase().includes(q)) ||
        item.notes.toLowerCase().includes(q) ||
        (item.diagnosis && item.diagnosis.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [consultations, selectedStatus, searchQuery]);

  // Counts summary
  const counts = useMemo(() => {
    return {
      total: consultations.length,
      active: consultations.filter((c) => c.status === "active").length,
      resolved: consultations.filter((c) => c.status === "resolved").length,
      pending: consultations.filter((c) => c.status === "pending").length,
      closed: consultations.filter((c) => c.status === "closed").length,
    };
  }, [consultations]);

  const openDetailModal = (item: ConsultationRecord) => {
    setSelectedConsult(item);
    setDetailModalVisible(true);
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "#DBEAFE", text: "#1D4ED8", label: "Active Case" };
      case "resolved":
        return { bg: "#DCFCE7", text: "#15803D", label: "Resolved" };
      case "pending":
        return { bg: "#FEF3C7", text: "#D97706", label: "Pending Test" };
      case "closed":
        return { bg: "#F1F5F9", text: "#64748B", label: "Closed" };
      default:
        return { bg: "#F1F5F9", text: "#64748B", label: status };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
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

          <Text style={styles.headerTitle}>Consultation Records</Text>

          <View style={styles.readOnlyBadge}>
            <Icon name="lock" size={12} color="#15803D" />
            <Text style={styles.readOnlyBadgeText}>Admin Monitor</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsSummaryRow}>
          <View style={styles.statSummaryPill}>
            <Text style={styles.statSummaryVal}>{counts.total}</Text>
            <Text style={styles.statSummaryText}>Total</Text>
          </View>
          <View style={styles.statSummaryPill}>
            <Text style={[styles.statSummaryVal, { color: "#60A5FA" }]}>
              {counts.active}
            </Text>
            <Text style={styles.statSummaryText}>Active</Text>
          </View>
          <View style={styles.statSummaryPill}>
            <Text style={[styles.statSummaryVal, { color: "#4ADE80" }]}>
              {counts.resolved}
            </Text>
            <Text style={styles.statSummaryText}>Resolved</Text>
          </View>
          <View style={styles.statSummaryPill}>
            <Text style={[styles.statSummaryVal, { color: "#FBBF24" }]}>
              {counts.pending}
            </Text>
            <Text style={styles.statSummaryText}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 80, 100),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input Bar */}
        <View style={styles.searchBarContainer}>
          <Icon name="search" size={18} color="#718096" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subject, diagnosis, farmer, vet..."
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

        {/* Status Horizontal Filter Bar */}
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

        {/* Loading Indicator */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>
              Loading consultation records...
            </Text>
          </View>
        ) : filteredConsultations.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <Icon name="clipboard" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Consultations Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No consultation records match "${searchQuery}"`
                : "No consultation cases recorded."}
            </Text>
          </View>
        ) : (
          /* Consultation List Cards */
          <View style={styles.consultList}>
            {filteredConsultations.map((item) => {
              const statusStyle = getStatusBadge(item.status);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.consultCard}
                  onPress={() => openDetailModal(item)}
                  activeOpacity={0.85}
                >
                  {/* Top Bar: Animal & Status Badge */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.animalTag}>
                      <Icon name="location" size={12} color="#15803D" />
                      <Text style={styles.animalTagText}>
                        {item.animalName || "General Consultation"}
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

                  {/* Subject Title */}
                  <Text style={styles.subjectTitle} numberOfLines={2}>
                    {item.subject}
                  </Text>

                  {/* Diagnosis snippet if available */}
                  {item.diagnosis && (
                    <View style={styles.diagnosisBoxSnippet}>
                      <Text style={styles.diagnosisLabel}>Diagnosis:</Text>
                      <Text style={styles.diagnosisText} numberOfLines={1}>
                        {item.diagnosis}
                      </Text>
                    </View>
                  )}

                  {/* People involved */}
                  <View style={styles.peopleBox}>
                    <View style={styles.personItem}>
                      <Avatar name={item.farmerName} size={26} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.personRoleLabel}>Farmer</Text>
                        <Text style={styles.personName} numberOfLines={1}>
                          {item.farmerName}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.personDivider} />

                    <View style={styles.personItem}>
                      <Avatar name={item.technicianName} size={26} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.personRoleLabel}>Vet Tech</Text>
                        <Text style={styles.personName} numberOfLines={1}>
                          {item.technicianName}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Card Footer: Date & Reader Prompt */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>
                      Created: {item.createdAt}
                    </Text>
                    <Text style={styles.viewDetailsText}>View Clinical Notes →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ─── READ-ONLY CONSULTATION DETAIL MODAL ─── */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalContainer, { maxHeight: "88%" }]}>
            {selectedConsult && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusBadge(selectedConsult.status).bg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color: getStatusBadge(selectedConsult.status).text,
                        },
                      ]}
                    >
                      {getStatusBadge(selectedConsult.status).label.toUpperCase()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setDetailModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Icon name="close" size={20} color="#475569" />
                  </TouchableOpacity>
                </View>

                {/* Modal Scroll Content */}
                <ScrollView
                  style={styles.detailScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.detailAnimalName}>
                    {selectedConsult.animalName || "General Consultation"}
                  </Text>
                  <Text style={styles.detailSubject}>
                    {selectedConsult.subject}
                  </Text>

                  {/* Timeline Row */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineItem}>
                      <Icon name="calendar" size={14} color="#64748B" />
                      <Text style={styles.timelineText}>
                        Opened: {selectedConsult.createdAt}
                      </Text>
                    </View>

                    {selectedConsult.resolvedAt && (
                      <View style={styles.timelineItem}>
                        <Icon name="check" size={14} color="#15803D" />
                        <Text style={[styles.timelineText, { color: "#15803D" }]}>
                          Resolved: {selectedConsult.resolvedAt}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Parties Box */}
                  <Text style={styles.sectionHeaderTitle}>Parties Involved</Text>

                  <View style={styles.partyCard}>
                    <Avatar name={selectedConsult.farmerName} size={36} />
                    <View>
                      <Text style={styles.partyRole}>Farmer (Client)</Text>
                      <Text style={styles.partyName}>
                        {selectedConsult.farmerName}
                      </Text>
                      <Text style={styles.partyId}>
                        ID: {selectedConsult.farmerId}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.partyCard}>
                    <Avatar name={selectedConsult.technicianName} size={36} />
                    <View>
                      <Text style={styles.partyRole}>
                        Assigned Vet Technician
                      </Text>
                      <Text style={styles.partyName}>
                        {selectedConsult.technicianName}
                      </Text>
                      <Text style={styles.partyId}>
                        ID: {selectedConsult.technicianId}
                      </Text>
                    </View>
                  </View>

                  {/* Diagnosis */}
                  {selectedConsult.diagnosis && (
                    <>
                      <Text style={styles.sectionHeaderTitle}>Diagnosis</Text>
                      <View style={styles.diagnosisBoxFull}>
                        <Icon name="alert" size={16} color="#D97706" />
                        <Text style={styles.diagnosisFullText}>
                          {selectedConsult.diagnosis}
                        </Text>
                      </View>
                    </>
                  )}

                  {/* Clinical Notes */}
                  <Text style={styles.sectionHeaderTitle}>
                    Clinical Notes & Assessment
                  </Text>
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>{selectedConsult.notes}</Text>
                  </View>

                  {/* Prescription */}
                  {selectedConsult.prescription && (
                    <>
                      <Text style={styles.sectionHeaderTitle}>
                        Prescribed Treatment / Medication
                      </Text>
                      <View style={styles.prescriptionBox}>
                        <Icon name="clipboard" size={16} color="#1D4ED8" />
                        <Text style={styles.prescriptionText}>
                          {selectedConsult.prescription}
                        </Text>
                      </View>
                    </>
                  )}

                  <Text style={styles.recordIdFooterText}>
                    Consultation Case ID: {selectedConsult.id}
                  </Text>
                </ScrollView>

                {/* Footer Close Action */}
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
                    <Text style={styles.detailCloseBtnText}>Close Case Record</Text>
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
    paddingHorizontal: 6,
    borderRadius: 12,
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
  consultList: {
    gap: Spacing.md,
  },
  consultCard: {
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
  animalTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  animalTagText: {
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
  subjectTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
    marginBottom: 8,
  },
  diagnosisBoxSnippet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  diagnosisLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  diagnosisText: {
    fontSize: 11,
    color: "#B45309",
    flex: 1,
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
    height: 28,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 6,
  },
  personRoleLabel: {
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
  dateText: {
    fontSize: 12,
    color: "#64748B",
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  // ─── Modal Reader Styles ───
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
  detailAnimalName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailSubject: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
    lineHeight: 26,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timelineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    marginTop: 8,
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
  diagnosisBoxFull: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 12,
  },
  diagnosisFullText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    flex: 1,
  },
  notesBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  notesText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
  },
  prescriptionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 16,
  },
  prescriptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E40AF",
    flex: 1,
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

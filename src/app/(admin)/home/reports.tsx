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

export interface ReportRecord {
  id: string;
  category: "technician" | "forum" | "comment";
  type: string;
  description: string;
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  targetId: string;
  targetName: string;
  status: "pending" | "investigating" | "resolved" | "dismissed";
  createdAt: any;
  updatedAt?: any;
  resolutionNotes?: string;
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

type MainTab = "technicians" | "forum_comments";

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Investigating", value: "investigating" },
  { label: "Resolved", value: "resolved" },
  { label: "Dismissed", value: "dismissed" },
];

const INITIAL_MOCK_REPORTS: ReportRecord[] = [
  {
    id: "report_001",
    category: "technician",
    type: "late_arrival",
    description: "Technician arrived 1 hour late for the health check appointment without prior notice.",
    reporterId: "farmer_001",
    reporterName: "Juan Dela Cruz",
    reporterRole: "farmer",
    targetId: "tech_003",
    targetName: "Mark Dela Cruz (technician_003)",
    status: "pending",
    createdAt: "2026-08-02T19:16:48+08:00",
  },
  {
    id: "report_002",
    category: "technician",
    type: "unprofessional_conduct",
    description: "Technician was impatient during the vaccination procedure and did not provide adequate aftercare instructions.",
    reporterId: "farmer_002",
    reporterName: "Maria Garcia",
    reporterRole: "farmer",
    targetId: "tech_001",
    targetName: "Pedro Santos (technician_001)",
    status: "investigating",
    createdAt: "2026-08-01T14:22:10+08:00",
  },
  {
    id: "report_003",
    category: "forum",
    type: "inappropriate_content",
    description: "Post contains misleading medical claims regarding swine fever treatments without veterinary backing.",
    reporterId: "tech_002",
    reporterName: "Ana Reyes",
    reporterRole: "technician",
    targetId: "post_881",
    targetName: 'Forum Post: "Unverified Herbal Swine Cure"',
    status: "pending",
    createdAt: "2026-08-03T09:10:00+08:00",
  },
  {
    id: "report_004",
    category: "comment",
    type: "harassment",
    description: "Commenter used aggressive and offensive language towards another farmer in the goat breeding discussion.",
    reporterId: "farmer_003",
    reporterName: "Jose Rivera",
    reporterRole: "farmer",
    targetId: "comment_412",
    targetName: 'Comment by "User_992"',
    status: "resolved",
    resolutionNotes: "Comment removed and user issued a formal platform warning.",
    createdAt: "2026-07-29T11:45:00+08:00",
  },
  {
    id: "report_005",
    category: "technician",
    type: "no_show",
    description: "Technician confirmed appointment for goat deworming but failed to show up.",
    reporterId: "farmer_004",
    reporterName: "Lorna Santos",
    reporterRole: "farmer",
    targetId: "tech_005",
    targetName: "Carlos Villanueva (technician_005)",
    status: "dismissed",
    resolutionNotes: "Emergency request conflict verified; technician notified farmer in advance.",
    createdAt: "2026-07-25T16:00:00+08:00",
  },
];

export default function ReportsManagementScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MainTab>("technicians");
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [resolutionText, setResolutionText] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // ─── Realtime Firestore Listener ───
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onSnapshot(
        collection(db, Collections.REPORTS),
        (snapshot) => {
          if (snapshot) {
            const fetched: ReportRecord[] = snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                category: (safeStr(d.category, "technician") as any),
                type: safeStr(d.type, "general_issue"),
                description: safeStr(d.description, "No description provided."),
                reporterId: safeStr(d.reporterId, ""),
                reporterName: safeStr(d.reporterName, "Anonymous Reporter"),
                reporterRole: safeStr(d.reporterRole, "user"),
                targetId: safeStr(d.targetId, ""),
                targetName: safeStr(d.targetName, "Reported Entity"),
                status: (safeStr(d.status, "pending") as any),
                createdAt: safeStr(d.createdAt, "2026-08-01"),
                updatedAt: safeStr(d.updatedAt, ""),
                resolutionNotes: safeStr(d.resolutionNotes, ""),
              };
            });

            setReports(fetched);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore reports listen error:", error.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.warn("onSnapshot setup error:", err.message);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // ─── Filtered Reports ───
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // Tab filter
      const matchesTab =
        activeTab === "technicians"
          ? item.category === "technician"
          : item.category === "forum" || item.category === "comment";

      // Status filter
      const matchesStatus =
        selectedStatusFilter === "all" || item.status === selectedStatusFilter;

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.targetName.toLowerCase().includes(q) ||
        item.reporterName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q);

      return matchesTab && matchesStatus && matchesSearch;
    }, [reports, activeTab, selectedStatusFilter, searchQuery]);
  }, [reports, activeTab, selectedStatusFilter, searchQuery]);

  // Counts summary per tab
  const counts = useMemo(() => {
    const techReports = reports.filter((r) => r.category === "technician");
    const forumReports = reports.filter(
      (r) => r.category === "forum" || r.category === "comment"
    );

    return {
      techTotal: techReports.length,
      techPending: techReports.filter((r) => r.status === "pending").length,
      forumTotal: forumReports.length,
      forumPending: forumReports.filter((r) => r.status === "pending").length,
    };
  }, [reports]);

  const openReportDetail = (report: ReportRecord) => {
    setSelectedReport(report);
    setResolutionText(report.resolutionNotes || "");
    setDetailModalVisible(true);
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { bg: "#FEF3C7", text: "#D97706", label: "Pending Review" };
      case "investigating":
        return { bg: "#DBEAFE", text: "#1D4ED8", label: "Investigating" };
      case "resolved":
        return { bg: "#DCFCE7", text: "#15803D", label: "Action Taken / Resolved" };
      case "dismissed":
        return { bg: "#F1F5F9", text: "#64748B", label: "Dismissed" };
      default:
        return { bg: "#F1F5F9", text: "#64748B", label: status };
    }
  };

  // Format type string into clean title
  const formatReportType = (typeStr: string) => {
    return typeStr
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // ─── Resolve Report Action ───
  const handleUpdateStatus = async (
    newStatus: "resolved" | "dismissed" | "investigating"
  ) => {
    if (!selectedReport) return;

    setActionSubmitting(true);
    const updatedNotes = resolutionText.trim() || `Marked as ${newStatus} by Admin.`;

    // Local state update first
    setReports((prev) =>
      prev.map((r) =>
        r.id === selectedReport.id
          ? {
              ...r,
              status: newStatus,
              resolutionNotes: updatedNotes,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            }
          : r
      )
    );

    try {
      await firestore()
        .collection(Collections.REPORTS)
        .doc(selectedReport.id)
        .set(
          {
            status: newStatus,
            resolutionNotes: updatedNotes,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    } catch (err: any) {
      console.warn("Firestore report status update error:", err.message);
    }

    setActionSubmitting(false);
    setDetailModalVisible(false);
    Alert.alert(
      "Report Updated",
      `Report ${selectedReport.id} has been marked as "${newStatus.toUpperCase()}".`
    );
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

          <Text style={styles.headerTitle}>Reports & Complaints</Text>

          <View style={styles.adminBadgeHeader}>
            <Icon name="shield-alert" size={12} color="#DC2626" />
            <Text style={styles.adminBadgeHeaderText}>Moderation</Text>
          </View>
        </View>

        {/* Main Category Tabs: Technicians vs Forums & Comments */}
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
              Technicians ({counts.techTotal})
            </Text>

            {counts.techPending > 0 && (
              <View style={styles.badgePendingCount}>
                <Text style={styles.badgePendingCountText}>
                  {counts.techPending}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "forum_comments" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("forum_comments")}
            activeOpacity={0.8}
          >
            <Icon
              name="messages-square"
              size={16}
              color={activeTab === "forum_comments" ? "#1B5E20" : "rgba(255,255,255,0.7)"}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "forum_comments" && styles.tabBtnTextActive,
              ]}
            >
              Forums & Comments ({counts.forumTotal})
            </Text>

            {counts.forumPending > 0 && (
              <View style={styles.badgePendingCount}>
                <Text style={styles.badgePendingCountText}>
                  {counts.forumPending}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 80, 100),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Icon name="search" size={18} color="#718096" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${
              activeTab === "technicians" ? "reported technician" : "forum violation"
            }...`}
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

        {/* Status Filter Scroll Pill Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusScroll}
          contentContainerStyle={styles.statusScrollContent}
        >
          {STATUS_FILTERS.map((st) => {
            const isSelected = selectedStatusFilter === st.value;
            return (
              <TouchableOpacity
                key={st.value}
                style={[
                  styles.statusPill,
                  isSelected && styles.statusPillActive,
                ]}
                onPress={() => setSelectedStatusFilter(st.value)}
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
              Loading moderation complaints...
            </Text>
          </View>
        ) : filteredReports.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyCard}>
            <Icon name="shield-alert" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Complaints Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No reports match "${searchQuery}"`
                : "No complaints filed under this filter category."}
            </Text>
          </View>
        ) : (
          /* Report Cards List */
          <View style={styles.reportsList}>
            {filteredReports.map((item) => {
              const statusStyle = getStatusBadge(item.status);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.reportCard}
                  onPress={() => openReportDetail(item)}
                  activeOpacity={0.85}
                >
                  {/* Top Header: Report Type Tag & Status Badge */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.typeBadge}>
                      <Icon name="alert" size={12} color="#DC2626" />
                      <Text style={styles.typeBadgeText}>
                        {formatReportType(item.type)}
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

                  {/* Target Reported Entity */}
                  <Text style={styles.targetNameText}>
                    Target: {item.targetName}
                  </Text>

                  {/* Description Box */}
                  <Text style={styles.descriptionText} numberOfLines={3}>
                    "{item.description}"
                  </Text>

                  {/* Reporter Footer Box */}
                  <View style={styles.cardFooterRow}>
                    <View style={styles.reporterInfo}>
                      <Avatar name={item.reporterName} size={24} />
                      <Text style={styles.reporterText}>
                        Reported by:{" "}
                        <Text style={{ fontWeight: "700", color: "#1E293B" }}>
                          {item.reporterName}
                        </Text>{" "}
                        ({item.reporterRole})
                      </Text>
                    </View>

                    <Text style={styles.actionPromptText}>Review Case →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ─── MODERATION REPORT DETAIL & ACTION MODAL ─── */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalContainer, { maxHeight: "88%" }]}>
            {selectedReport && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTitleBox}>
                    <Icon name="shield-alert" size={18} color="#DC2626" />
                    <Text style={styles.modalHeaderTitle}>
                      Case #{selectedReport.id}
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
                  {/* Status Banner */}
                  <View
                    style={[
                      styles.modalStatusBanner,
                      {
                        backgroundColor: getStatusBadge(selectedReport.status).bg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusBannerText,
                        {
                          color: getStatusBadge(selectedReport.status).text,
                        },
                      ]}
                    >
                      STATUS: {getStatusBadge(selectedReport.status).label.toUpperCase()}
                    </Text>
                  </View>

                  {/* Category & Violation Type */}
                  <View style={styles.violationSummaryBox}>
                    <Text style={styles.violationCategoryLabel}>
                      Category: {selectedReport.category.toUpperCase()}
                    </Text>
                    <Text style={styles.violationTypeTitle}>
                      Violation: {formatReportType(selectedReport.type)}
                    </Text>
                  </View>

                  {/* Reported Target */}
                  <Text style={styles.sectionHeaderTitle}>Reported Entity / Target</Text>
                  <View style={styles.entityCard}>
                    <Icon
                      name={
                        selectedReport.category === "technician"
                          ? "technician"
                          : "messages-square"
                      }
                      size={24}
                      color="#1E293B"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entityTitle}>
                        {selectedReport.targetName}
                      </Text>
                      <Text style={styles.entitySub}>
                        Target ID: {selectedReport.targetId}
                      </Text>
                    </View>
                  </View>

                  {/* Complainant / Reporter Info */}
                  <Text style={styles.sectionHeaderTitle}>Complainant (Reporter)</Text>
                  <View style={styles.entityCard}>
                    <Avatar name={selectedReport.reporterName} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entityTitle}>
                        {selectedReport.reporterName}
                      </Text>
                      <Text style={styles.entitySub}>
                        Role: {selectedReport.reporterRole} • ID: {selectedReport.reporterId}
                      </Text>
                    </View>
                  </View>

                  {/* Complaint Description */}
                  <Text style={styles.sectionHeaderTitle}>Full Complaint Description</Text>
                  <View style={styles.descriptionFullBox}>
                    <Text style={styles.descriptionFullText}>
                      {selectedReport.description}
                    </Text>
                  </View>

                  {/* Resolution Notes / Action Entry */}
                  <Text style={styles.sectionHeaderTitle}>Admin Moderation Notes</Text>
                  <TextInput
                    style={styles.resolutionInputArea}
                    placeholder="Enter moderation findings, formal warnings, or resolution notes here..."
                    placeholderTextColor="#A0AEC0"
                    multiline={true}
                    value={resolutionText}
                    onChangeText={setResolutionText}
                  />

                  <Text style={styles.timestampFooterText}>
                    Reported at: {selectedReport.createdAt}
                  </Text>
                </ScrollView>

                {/* Modal Footer Actions */}
                <View
                  style={[
                    styles.detailFooter,
                    { paddingBottom: Math.max(insets.bottom + 14, 24) },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.dismissBtn}
                    onPress={() => handleUpdateStatus("dismissed")}
                    disabled={actionSubmitting}
                  >
                    <Text style={styles.dismissBtnText}>Dismiss</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.investigateBtn}
                    onPress={() => handleUpdateStatus("investigating")}
                    disabled={actionSubmitting}
                  >
                    <Text style={styles.investigateBtnText}>Investigate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resolveBtn}
                    onPress={() => handleUpdateStatus("resolved")}
                    disabled={actionSubmitting}
                  >
                    <Text style={styles.resolveBtnText}>Resolve & Action</Text>
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
  adminBadgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  adminBadgeHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
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
  badgePendingCount: {
    backgroundColor: "#EF4444",
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  badgePendingCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.white,
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

  // ─── Reports List Cards ───
  reportsList: {
    gap: Spacing.md,
  },
  reportCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.lg,
    ...Shadow.light,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
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
  targetNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  reporterInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  reporterText: {
    fontSize: 11,
    color: "#64748B",
  },
  actionPromptText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  // ─── Modal Reader & Action Sheet ───
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
  modalHeaderTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
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
  modalStatusBanner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  modalStatusBannerText: {
    fontSize: 11,
    fontWeight: "800",
  },
  violationSummaryBox: {
    backgroundColor: "#FFF1F2",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECDD3",
    marginBottom: 16,
  },
  violationCategoryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E11D48",
    letterSpacing: 0.5,
  },
  violationTypeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#9F1239",
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    marginTop: 4,
  },
  entityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  entityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  entitySub: {
    fontSize: 11,
    color: "#64748B",
  },
  descriptionFullBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  descriptionFullText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
  },
  resolutionInputArea: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 80,
    marginBottom: 14,
  },
  timestampFooterText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
  },
  detailFooter: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  dismissBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  investigateBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
  },
  investigateBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  resolveBtn: {
    flex: 1.3,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#16A34A",
  },
  resolveBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.white,
  },
});

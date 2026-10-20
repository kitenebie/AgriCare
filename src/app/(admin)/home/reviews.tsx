import { Icon, Avatar } from "@/components/ui";
import {
  BorderRadius, Colors, FontSize, Shadow, Spacing, } from "@/constants/theme";
import { Collections } from "@/services/firebase";
import firestore from "@react-native-firebase/firestore";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet, TouchableOpacity, View, KeyboardAvoidingView, Platform } from "react-native";
import { AppTextInput as TextInput, AppText as Text } from '@/components/ui/FontScale';

export interface ReviewRecord {
  id: string;
  farmerId: string;
  farmerName: string;
  technicianId: string;
  technicianName: string;
  serviceType: string;
  rating: number; // 1 to 5
  comment: string;
  tags?: string[];
  createdAt: string;
  appointmentId?: string;
}

const RATING_FILTERS = [
  { label: "All", value: "all" },
  { label: "5 Stars ⭐", value: "5" },
  { label: "4 Stars ⭐", value: "4" },
  { label: "3 Stars ⭐", value: "3" },
  { label: "2 Stars ⭐", value: "2" },
  { label: "1 Star ⭐", value: "1" },
];

const INITIAL_MOCK_REVIEWS: ReviewRecord[] = [
  {
    id: "rev_001",
    farmerId: "farmer_001",
    farmerName: "Juan Dela Cruz",
    technicianId: "tech_001",
    technicianName: "Pedro Santos",
    serviceType: "Cattle Vaccination & Checkup",
    rating: 5,
    comment: "Doc Pedro arrived exactly on time! Very gentle with Manny the cow and explained the vaccine procedure thoroughly.",
    tags: ["Punctual", "Expert Care", "Friendly"],
    createdAt: "2026-08-01",
    appointmentId: "appt_001",
  },
  {
    id: "rev_002",
    farmerId: "farmer_002",
    farmerName: "Maria Garcia",
    technicianId: "tech_002",
    technicianName: "Ana Reyes",
    serviceType: "Swine Health & Gestation Diet",
    rating: 5,
    comment: "Excellent advice on hog nutrition. Our sows are healthier and milk production improved after following her feeding guide.",
    tags: ["Great Advice", "Professional"],
    createdAt: "2026-07-28",
    appointmentId: "appt_006",
  },
  {
    id: "rev_003",
    farmerId: "farmer_003",
    farmerName: "Jose Rivera",
    technicianId: "tech_003",
    technicianName: "Mark Dela Cruz",
    serviceType: "Goat Deworming Treatment",
    rating: 4,
    comment: "Good service overall. The deworming treatment was effective for our herd. Arrived a little late due to weather but communicated well.",
    tags: ["Effective", "Good Communication"],
    createdAt: "2026-07-20",
    appointmentId: "appt_003",
  },
  {
    id: "rev_004",
    farmerId: "farmer_004",
    farmerName: "Lorna Santos",
    technicianId: "tech_001",
    technicianName: "Pedro Santos",
    serviceType: "Horse Dental & Joint Examination",
    rating: 5,
    comment: "Top notch care for our horse! Applied balm and rest plan that healed the leg strain within 5 days. Highly recommended vet tech!",
    tags: ["Highly Recommended", "Expert Care"],
    createdAt: "2026-07-15",
    appointmentId: "appt_008",
  },
  {
    id: "rev_005",
    farmerId: "farmer_001",
    farmerName: "Juan Dela Cruz",
    technicianId: "tech_003",
    technicianName: "Mark Dela Cruz",
    serviceType: "Emergency Parasite Assessment",
    rating: 3,
    comment: "Treatment worked well, but the appointment scheduling was delayed by an hour. Hope response time improves next time.",
    tags: ["Needs Faster Arrival"],
    createdAt: "2026-07-08",
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

export default function AdminRatingsReviewsScreen() {
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);

  // ─── Realtime Firestore Listener ───
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = firestore().collection(Collections.REVIEWS).onSnapshot(
        (snapshot) => {
          if (snapshot) {
            const data: ReviewRecord[] = snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                farmerId: safeStr(d.farmerId, "farmer_001"),
                farmerName: safeStr(d.farmerName, "Farmer User"),
                technicianId: safeStr(d.technicianId, "tech_001"),
                technicianName: safeStr(d.technicianName, "Technician"),
                serviceType: safeStr(d.serviceType, "Veterinary Service"),
                rating: typeof d.rating === "number" ? d.rating : 5,
                comment: safeStr(d.comment, "No comment provided."),
                tags: Array.isArray(d.tags) ? d.tags.map((t) => safeStr(t)) : [],
                createdAt: safeStr(d.createdAt, "2026-08-01"),
                appointmentId: safeStr(d.appointmentId, ""),
              };
            });
            setReviews(data.length > 0 ? data : INITIAL_MOCK_REVIEWS);
          } else {
            setReviews(INITIAL_MOCK_REVIEWS);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore reviews listen error:", error.message);
          setReviews(INITIAL_MOCK_REVIEWS);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.warn("onSnapshot setup error:", err.message);
      setReviews(INITIAL_MOCK_REVIEWS);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // ─── Computed Statistics ───
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return { avg: "0.0", total: 0, fiveStar: 0, fourStar: 0, lowStar: 0 };
    }
    const sum = reviews.reduce((acc, item) => acc + (item.rating || 5), 0);
    const avg = (sum / reviews.length).toFixed(1);
    const fiveStar = reviews.filter((r) => r.rating === 5).length;
    const fourStar = reviews.filter((r) => r.rating === 4).length;
    const lowStar = reviews.filter((r) => r.rating <= 3).length;

    return { avg, total: reviews.length, fiveStar, fourStar, lowStar };
  }, [reviews]);

  // ─── Filtered List ───
  const filteredReviews = useMemo(() => {
    return reviews.filter((item) => {
      const matchesRating =
        selectedRatingFilter === "all" ||
        item.rating.toString() === selectedRatingFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.farmerName.toLowerCase().includes(q) ||
        item.technicianName.toLowerCase().includes(q) ||
        item.serviceType.toLowerCase().includes(q) ||
        item.comment.toLowerCase().includes(q);

      return matchesRating && matchesSearch;
    });
  }, [reviews, selectedRatingFilter, searchQuery]);

  const openDetailModal = (review: ReviewRecord) => {
    setSelectedReview(review);
    setDetailModalVisible(true);
  };

  const renderStars = (count: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name="star"
          size={14}
          color={i <= count ? "#F59E0B" : "#CBD5E1"}
        />
      );
    }
    return <View style={styles.starRow}>{stars}</View>;
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          { paddingTop: 8 },
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

          <Text style={styles.headerTitle}>Ratings & Reviews</Text>

          <View style={styles.readOnlyBadge}>
            <Icon name="lock" size={12} color="#15803D" />
            <Text style={styles.readOnlyBadgeText}>Admin Monitor</Text>
          </View>
        </View>

        {/* Interactive Clickable Rating Summary Cards */}
        <View style={styles.statsSummaryRow}>
          <TouchableOpacity
            style={[
              styles.statSummaryPill,
              selectedRatingFilter === "all" && styles.statSummaryPillActive,
            ]}
            onPress={() => setSelectedRatingFilter("all")}
            activeOpacity={0.75}
          >
            <Text style={[styles.statSummaryVal, { color: "#FBBF24" }]}>
              {stats.avg} ⭐
            </Text>
            <Text style={styles.statSummaryText}>Avg ({stats.total})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statSummaryPill,
              selectedRatingFilter === "5" && styles.statSummaryPillActive,
            ]}
            onPress={() => setSelectedRatingFilter("5")}
            activeOpacity={0.75}
          >
            <Text style={[styles.statSummaryVal, { color: "#4ADE80" }]}>
              {stats.fiveStar}
            </Text>
            <Text style={styles.statSummaryText}>5 Stars</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statSummaryPill,
              selectedRatingFilter === "4" && styles.statSummaryPillActive,
            ]}
            onPress={() => setSelectedRatingFilter("4")}
            activeOpacity={0.75}
          >
            <Text style={[styles.statSummaryVal, { color: "#60A5FA" }]}>
              {stats.fourStar}
            </Text>
            <Text style={styles.statSummaryText}>4 Stars</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statSummaryPill,
              (selectedRatingFilter === "3" ||
                selectedRatingFilter === "2" ||
                selectedRatingFilter === "1") &&
                styles.statSummaryPillActive,
            ]}
            onPress={() => setSelectedRatingFilter("3")}
            activeOpacity={0.75}
          >
            <Text style={[styles.statSummaryVal, { color: "#F87171" }]}>
              {stats.lowStar}
            </Text>
            <Text style={styles.statSummaryText}>≤ 3 Stars</Text>
          </TouchableOpacity>
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
        {/* Search Input */}
        <View style={styles.searchBarContainer}>
          <Icon name="search" size={18} color="#718096" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search farmer, technician, service..."
            placeholderTextColor="#A0AEC0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Icon name="close" size={16} color="#718096" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {RATING_FILTERS.map((f) => {
            const active = selectedRatingFilter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedRatingFilter(f.value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Reviews List View */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>Loading farmer feedback...</Text>
          </View>
        ) : filteredReviews.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="star" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Reviews Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `No results for "${searchQuery}"`
                : "No ratings recorded for this filter category."}
            </Text>
          </View>
        ) : (
          filteredReviews.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.reviewCard}
              onPress={() => openDetailModal(item)}
              activeOpacity={0.85}
            >
              {/* Review Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.farmerProfileRow}>
                  <Avatar name={item.farmerName} size={40} />
                  <View style={styles.farmerProfileText}>
                    <Text style={styles.farmerName}>{item.farmerName}</Text>
                    <Text style={styles.serviceType}>{item.serviceType}</Text>
                  </View>
                </View>

                <View style={styles.ratingBadgeBox}>
                  {renderStars(item.rating)}
                  <Text style={styles.ratingNumText}>{item.rating}.0</Text>
                </View>
              </View>

              {/* Review Comment Quote */}
              <View style={styles.commentQuoteBox}>
                <Text style={styles.commentQuoteText} numberOfLines={3}>
                  "{item.comment}"
                </Text>
              </View>

              {/* Technician Reviewed & Tags */}
              <View style={styles.cardFooter}>
                <View style={styles.techInfoBox}>
                  <Icon name="technician" size={14} color="#2563EB" />
                  <Text style={styles.techReviewedText}>
                    Reviewed: <Text style={styles.techNameHighlight}>{item.technicianName}</Text>
                  </Text>
                </View>

                <Text style={styles.dateText}>{item.createdAt}</Text>
              </View>

              {/* Tags */}
              {item.tags && item.tags.length > 0 ? (
                <View style={styles.tagsRow}>
                  {item.tags.map((tag, idx) => (
                    <View key={idx} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ─── READ-ONLY DETAIL READER MODAL ─── */}
      <Modal visible={detailModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: Math.max(insets.bottom + 16, 24) },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Icon name="star" size={20} color="#F59E0B" />
                <Text style={styles.modalTitle}>Review Detail Record</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            {selectedReview ? (
              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.readOnlyBanner}>
                  <Icon name="lock" size={14} color="#15803D" />
                  <Text style={styles.readOnlyBannerText}>
                    Admin Monitoring Mode — Read Only Feedback Record
                  </Text>
                </View>

                {/* Rating Score Banner */}
                <View style={styles.modalRatingBanner}>
                  <Text style={styles.modalScoreBig}>{selectedReview.rating}.0</Text>
                  <View style={{ alignItems: "center" }}>
                    {renderStars(selectedReview.rating)}
                    <Text style={styles.modalRatingLabel}>
                      {selectedReview.rating === 5
                        ? "Excellent Service 🌟"
                        : selectedReview.rating === 4
                        ? "Very Good 👍"
                        : "Feedback Recorded"}
                    </Text>
                  </View>
                </View>

                {/* Farmer Info */}
                <Text style={styles.sectionLabel}>Farmer (Reviewer)</Text>
                <View style={styles.detailBox}>
                  <Avatar name={selectedReview.farmerName} size={36} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.detailTitle}>{selectedReview.farmerName}</Text>
                    <Text style={styles.detailSub}>{selectedReview.serviceType}</Text>
                  </View>
                </View>

                {/* Technician Info */}
                <Text style={styles.sectionLabel}>Veterinary Technician</Text>
                <View style={styles.detailBox}>
                  <Icon name="technician" size={24} color="#2563EB" />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.detailTitle}>{selectedReview.technicianName}</Text>
                    <Text style={styles.detailSub}>Assigned Vet Tech</Text>
                  </View>
                </View>

                {/* Full Feedback Comment */}
                <Text style={styles.sectionLabel}>Farmer Comment & Narrative</Text>
                <View style={styles.commentDetailBox}>
                  <Text style={styles.fullCommentText}>
                    "{selectedReview.comment}"
                  </Text>
                </View>

                {/* Metadata */}
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Review Date:</Text>
                  <Text style={styles.metaVal}>{selectedReview.createdAt}</Text>
                </View>
                {selectedReview.appointmentId ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Appointment Reference:</Text>
                    <Text style={styles.metaVal}>{selectedReview.appointmentId}</Text>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setDetailModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.closeBtnText}>Done Reading</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7F4" },
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
    fontSize: 18,
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
    gap: 6,
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
    fontSize: 14,
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
    marginBottom: Spacing.sm,
    ...Shadow.light,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#2D3748",
    marginLeft: 8,
    padding: 0,
  },
  filterScroll: {
    marginBottom: Spacing.md,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: Colors.white,
    fontWeight: "700",
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 12,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
  },
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.light,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  farmerProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  farmerProfileText: {
    marginLeft: 10,
    flex: 1,
  },
  farmerName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  serviceType: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "700",
    marginTop: 1,
  },
  ratingBadgeBox: {
    alignItems: "flex-end",
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  ratingNumText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D97706",
    marginTop: 2,
  },
  commentQuoteBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  commentQuoteText: {
    fontSize: 13,
    color: "#334155",
    fontStyle: "italic",
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  techInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  techReviewedText: {
    fontSize: 12,
    color: "#64748B",
  },
  techNameHighlight: {
    fontWeight: "700",
    color: "#2563EB",
  },
  dateText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
  },

  // ─── Modal Sheet Styles ───
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalScroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  readOnlyBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  modalRatingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#FFFBEB",
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  modalScoreBig: {
    fontSize: 32,
    fontWeight: "900",
    color: "#D97706",
  },
  modalRatingLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 8,
  },
  detailBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  commentDetailBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fullCommentText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  metaVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeBtn: {
    backgroundColor: "#1B5E20",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  closeBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});

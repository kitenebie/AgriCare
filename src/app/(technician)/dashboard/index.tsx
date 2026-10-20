import {
  Avatar,
  Card,
  Icon,
  IconName,
  ModernQuickAccessIcon,
} from "@/components/ui";
import { AppText as Text } from "@/components/ui/FontScale";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { useFadeIn, useFadeInUp } from "@/hooks/useAnimatedEntry";
import { Collections } from "@/services/firebase";
import { getSession } from "@/services/sessionService";
import firestore from "@react-native-firebase/firestore";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated from "react-native-reanimated";
interface DashboardData {
  pendingRequests: number;
  acceptedRequests: number;
  averageRating: number;
  overdueSchedules: number;
}
export default function TechDashboardScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const headerAnim = useFadeIn(100);
  const overviewAnim = useFadeInUp(200);
  const quickAccessAnim = useFadeInUp(400);
  const [userName, setUserName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [dashData, setDashData] = useState<DashboardData>({
    pendingRequests: 0,
    acceptedRequests: 0,
    averageRating: 0,
    overdueSchedules: 0,
  });
  const [todayAppointmentCount, setTodayAppointmentCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [badgeCounts, setBadgeCounts] = useState({
    availableRequests: 0,
    appointments: 0,
    healthRecords: 0,
    announcements: 0,
    knowledgeBase: 0,
    forum: 0,
  });
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUserName(session.displayName || "Technician");
      const uid = session.uid;
      // Get user photoURL and availability
      const userDoc = await firestore()
        .collection(Collections.USERS)
        .doc(uid)
        .get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.photoURL) setPhotoURL(data.photoURL);
        // Get rating from user doc (already aggregated by ratingService)
        const avgRating = data?.rating || 0;
        const rvCount = data?.reviewCount || 0;
        setReviewCount(rvCount);
      }
      // Fetch ALL appointments (single collection scan, no composite index needed)
      const allApptsSnap = await firestore()
        .collection(Collections.APPOINTMENTS)
        .get();
      const allAppts = allApptsSnap.docs.map((d) => d.data());

      // Pending: status "pending" AND (unassigned OR assigned to this tech)
      const pendingRequests = allAppts.filter((a) => {
        if (a.status !== "pending") return false;
        return (
          !a.technicianId ||
          a.technicianId === "" ||
          a.technicianId === uid ||
          (a.technicianName || "").toLowerCase() === "unassigned"
        );
      }).length;

      // Accepted: confirmed appointments where technicianId matches this user
      const myAppts = allAppts.filter((a) => a.technicianId === uid);
      const acceptedRequests = myAppts.filter(
        (a) => a.status === "confirmed",
      ).length;

      // Get average rating from user doc
      const today = new Date().toISOString().split("T")[0];
      setTodayAppointmentCount(
        myAppts.filter((a) => a.status === "confirmed" && a.date === today)
          .length,
      );
      const averageRating = userDoc.exists ? userDoc.data()?.rating || 0 : 0;

      // Overdue: confirmed + date < today (past schedule na hindi na-complete)
      const overdueSchedules = myAppts.filter(
        (a) => a.status === "confirmed" && a.date && a.date < today,
      ).length;

      console.log(
        "📊 Dashboard Debug — uid:",
        uid,
        "| allAppts:",
        allAppts.length,
        "| pending:",
        pendingRequests,
        "| accepted:",
        acceptedRequests,
        "| overdue:",
        overdueSchedules,
      );

      setDashData({
        pendingRequests,
        acceptedRequests,
        averageRating,
        overdueSchedules,
      });
      // Notification count
      const notifSnap = await firestore()
        .collection(Collections.NOTIFICATIONS)
        .where("userId", "==", uid)
        .where("read", "==", false)
        .get();
      setNotifCount(notifSnap.size);

      // Badge counts for Quick Access items
      const appointments = myAppts.filter(
        (a) => a.status === "confirmed",
      ).length;
      const availableRequests = pendingRequests;

      const healthSnap = await firestore()
        .collection(Collections.APPOINTMENTS)
        .where("technicianId", "==", uid)
        .where("status", "==", "completed")
        .get();
      const announcementsSnap = await firestore()
        .collection(Collections.ANNOUNCEMENTS)
        .get();
      const kbSnap = await firestore()
        .collection(Collections.KNOWLEDGE_BASE)
        .get();
      const forumSnap = await firestore()
        .collection(Collections.COMMUNITY_FORUM)
        .get();

      setBadgeCounts({
        availableRequests,
        appointments,
        healthRecords: healthSnap.size,
        announcements: announcementsSnap.size,
        knowledgeBase: kbSnap.size,
        forum: forumSnap.size,
      });
    } catch (e) {
      console.warn("Tech dashboard load error:", e);
    }
    setLoading(false);
  }, []);
  // Refresh data when screen gains focus (e.g. after accepting a request)
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, []),
  );
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View style={[styles.header, headerAnim]}>
        <Image
          source={require("../../../../assets/images/technician/Home/header_banner.png")}
          style={styles.headerBanner}
          resizeMode="fit"
          pointerEvents="none"
        />
        <View style={styles.headerTop}>
          <Text style={styles.greeting}></Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notifButton}
              onPress={() =>
                router.push("/(technician)/messages?tab=notifications")
              }
              accessibilityRole="button"
              accessibilityLabel={`${notifCount} notifications`}
            >
              <Icon name="bell" size={22} color={Colors.primary} />
              {notifCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {notifCount > 9 ? "9+" : notifCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.avatarRing}>
              <Avatar
                name={userName}
                imageUrl={photoURL || undefined}
                size={42}
              />
            </View>
          </View>
        </View>
        <View style={styles.headerIdentity}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name} numberOfLines={2}>
            {userName}
          </Text>
          <View style={styles.roleBadge}>
            <Icon name="health-check" size={16} color={Colors.primary} />
            <Text style={styles.role}>Technician</Text>
          </View>
        </View>
      </Animated.View>
      <View style={styles.containers}>
        {/* Dashboard Stats */}
        <Animated.View style={[overviewAnim, styles.overviewSection]}>
          <Image
            source={require("../../../../assets/images/technician/Home/dashboard_header_banner.png")}
            style={{ width: screenWidth, height: (screenWidth * 441) / 2172, marginBottom: Spacing.md }}
            resizeMode="contain"
            pointerEvents="none"
          />
          <Card style={styles.overviewCard}>
            <View style={styles.overviewGrid}>
              <OverviewItem
                value={dashData.pendingRequests}
                label="Pending Requests"
                iconName="clipboard"
              />
              <OverviewItem
                value={dashData.acceptedRequests}
                label="Accepted Requests"
                iconName="check-circle"
              />
              <OverviewItem
                value={dashData.averageRating}
                label={`Ratings (${reviewCount})`}
                iconName="star"
                isRating
              />
              <OverviewItem
                value={dashData.overdueSchedules}
                label="Overdue Schedules"
                iconName="clock"
              />
            </View>
          </Card>
        </Animated.View>
        {/* Quick Access */}
        <Animated.View style={[styles.quickAccessSection, quickAccessAnim]}>
          <Card style={styles.quickAccessCard}>
            <View style={styles.cardHeading}>
              <Icon name="services" size={26} color={Colors.primary} />
              <Text style={styles.cardTitle}>Quick Access</Text>
            </View>
            <View style={styles.quickGrid}>
              <QuickAccessItem
                iconName="clipboard"
                label={"Available\nRequests"}
                onPress={() => router.push("/(technician)/appointments")}
                badge={badgeCounts.availableRequests}
              />
              <QuickAccessItem
                iconName="calendar"
                label="My Availability"
                onPress={() =>
                  router.push("/(technician)/dashboard/availability")
                }
              />
              <QuickAccessItem
                iconName="calendar"
                label="Appointments"
                onPress={() => router.push("/(technician)/schedule")}
                badge={badgeCounts.appointments}
              />
              <QuickAccessItem
                iconName="health-check"
                label={"Health\nRecords"}
                onPress={() =>
                  router.push("/(technician)/dashboard/health-records")
                }
                badge={badgeCounts.healthRecords}
              />
              <QuickAccessItem
                iconName="megaphone"
                label={"Announcements\n& Bulletins"}
                onPress={() =>
                  router.push("/(technician)/dashboard/announcements")
                }
                badge={badgeCounts.announcements}
              />
              <QuickAccessItem
                iconName="clipboard"
                label={"Knowledge\nBase"}
                onPress={() =>
                  router.push("/(technician)/dashboard/knowledge-base")
                }
                badge={badgeCounts.knowledgeBase}
              />
              <QuickAccessItem
                iconName="messages"
                label={"Community\nForum"}
                onPress={() => router.push("/(technician)/dashboard/forum")}
                badge={badgeCounts.forum}
              />
            </View>
          </Card>
        </Animated.View>
        <Card style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <View style={styles.todayTitleRow}>
              <Icon name="calendar" size={22} color={Colors.primary} />
              <Text style={styles.todayTitle}>Today’s Schedule</Text>
            </View>
            <TouchableOpacity
              style={styles.viewCalendar}
              onPress={() => router.push("/(technician)/schedule")}
            >
              <Text style={styles.viewCalendarText}>View Calendar</Text>
              <Icon name="chevron-right" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.todaySummary}
            onPress={() => router.push("/(technician)/schedule")}
            activeOpacity={0.8}
          >
            <View style={styles.todayIcon}>
              <Icon name="calendar" size={20} color={Colors.primary} />
            </View>
            <View style={styles.todayCopy}>
              <Text style={styles.todaySummaryTitle}>
                {todayAppointmentCount
                  ? `${todayAppointmentCount} appointment${todayAppointmentCount === 1 ? "" : "s"} today`
                  : "No appointments today"}
              </Text>
              <Text style={styles.todaySummaryText}>
                {todayAppointmentCount
                  ? "Tap to review your schedule."
                  : "You’re all caught up! 🎉"}
              </Text>
            </View>
            <Image
              source={require("../../../../assets/images/technician/Home/Green Calendar with Leaf Accents.png")}
              style={styles.todayArtwork}
              resizeMode="contain"
              accessibilityLabel="Calendar with leaf accents"
            />
          </TouchableOpacity>
        </Card>
        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
}
interface OverviewItemProps {
  value: number;
  label: string;
  iconName: IconName;
  isRating?: boolean;
}
const OverviewItem: React.FC<OverviewItemProps> = ({
  value,
  label,
  iconName,
  isRating,
}) => {
  const tone =
    iconName === "check-circle"
      ? {
          card: styles.statBlueCard,
          icon: styles.statBlueIcon,
          value: styles.statBlueValue,
        }
      : iconName === "star"
        ? {
            card: styles.statAmberCard,
            icon: styles.statAmberIcon,
            value: styles.statAmberValue,
          }
        : iconName === "clock"
          ? {
              card: styles.statRoseCard,
              icon: styles.statRoseIcon,
              value: styles.statRoseValue,
            }
          : {
              card: styles.statGreenCard,
              icon: styles.statGreenIcon,
              value: styles.statGreenValue,
            };
  const artwork =
    iconName === "clipboard"
      ? require("../../../../assets/images/technician/Home/document.png")
      : iconName === "check-circle"
        ? require("../../../../assets/images/technician/Home/checkmark.png")
        : iconName === "star"
          ? require("../../../../assets/images/technician/Home/star_empty.png")
          : require("../../../../assets/images/technician/Home/clock_pale.png");
  return (
    <View style={[styles.overviewItem, tone.card]}>
      <Image
        source={artwork}
        style={styles.statArtwork}
        resizeMode="contain"
        pointerEvents="none"
      />
      <View style={[styles.statIcon, tone.icon]}>
        <Icon name={iconName} size={20} color={Colors.white} />
      </View>
      <Text style={[styles.overviewValue, tone.value]}>
        {isRating ? (value > 0 ? value.toFixed(1) : "N/A") : value}
      </Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
};
interface QuickAccessItemProps {
  iconName: IconName;
  label: string;
  onPress: () => void;
  badge?: number;
}
const QuickAccessItem: React.FC<QuickAccessItemProps> = ({
  iconName,
  label,
  onPress,
  badge,
}) => {
  const tint =
    iconName === "health-check"
      ? "#FFF0F3"
      : iconName === "megaphone"
        ? "#FFF5E8"
        : iconName === "calendar"
          ? "#EEF4FF"
          : iconName === "messages"
            ? "#F2EEFF"
            : "#EAF8EF";
  return (
    <TouchableOpacity
      style={styles.quickItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickIcon, { backgroundColor: tint }]}>
        <ModernQuickAccessIcon name={iconName} size={50} />
        {badge !== undefined && badge > 0 && (
          <View style={styles.quickBadge}>
            <Text style={styles.quickBadgeText}>
              {badge > 99 ? "99+" : badge}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  containers: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#B4E6B8",
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    width: "100%",
  },
  headerBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: "100%",
  },
  headerTop: {
    paddingHorizontal: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: FontSize.md, color: Colors.textSecondary },
  headerRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  headerIdentity: { marginTop: Spacing.sm, paddingHorizontal: Spacing.lg },
  name: {
    width: "56%",
    fontSize: FontSize.xxl,
    lineHeight: FontSize.xxl,
    fontWeight: "800",
    color: Colors.primary,
  },
  roleBadge: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    ...Shadow.light,
  },
  role: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "600" },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  notifButton: {
    position: "relative",
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  notifBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
  },
  notifBadgeText: { color: Colors.white, fontSize: 10, fontWeight: "700" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  // Overview
  overviewSection: { marginHorizontal: -Spacing.lg, zIndex: 99, elevation: 1 },
  overviewCard: {
    marginTop: -Spacing.md,
    marginHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text },
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  statArtwork: {
    position: "absolute",
    width: 84,
    height: 78,
    top: 12,
    right: 6,
  },
  overviewItem: {
    width: "47%",
    minHeight: 126,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  statGreenCard: { backgroundColor: "#EAF8EF" },
  statGreenIcon: { backgroundColor: "#20A55A" },
  statGreenValue: { color: "#075C35" },
  statBlueCard: { backgroundColor: "#EEF4FF" },
  statBlueIcon: { backgroundColor: "#3478F6" },
  statBlueValue: { color: "#1749C7" },
  statAmberCard: { backgroundColor: "#FFF6E5" },
  statAmberIcon: { backgroundColor: "#F59E0B" },
  statAmberValue: { color: "#D97706" },
  statRoseCard: { backgroundColor: "#FFF0F1" },
  statRoseIcon: { backgroundColor: "#E83C4F" },
  statRoseValue: { color: "#D9283E" },
  overviewValue: { fontSize: FontSize.xxl, fontWeight: "800" },
  overviewLabel: {
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: 2,
  },
  // Quick Access
  quickAccessSection: { marginTop: Spacing.md },
  quickAccessCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: Spacing.md,
  },
  quickItem: { alignItems: "center", width: "30%" },
  quickIcon: {
    width: 72,
    height: 64,
    borderRadius: BorderRadius.lg,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: FontSize.xs,
    color: Colors.text,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 17,
  },
  quickBadge: {
    position: "absolute",
    top: -4,
    right: 2,
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    zIndex: 1,
  },
  quickBadgeText: { color: Colors.white, fontSize: 10, fontWeight: "700" },
  todayCard: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  todayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  todayTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  todayTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text },
  viewCalendar: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewCalendarText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: "700",
  },
  todaySummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#EEF8F0",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 74,
    overflow: "hidden",
  },
  todayIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCopy: { flex: 1, zIndex: 1 },
  todayArtwork: { width: 92, height: 68 },
  todaySummaryTitle: {
    color: "#075C35",
    fontSize: FontSize.sm,
    fontWeight: "700",
  },
  todaySummaryText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 3,
  },
});

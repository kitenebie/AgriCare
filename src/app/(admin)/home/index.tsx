import {
  Avatar,
  HeaderLeafPattern,
  Icon,
  IconName,
  LeafDecor,
} from "@/components/ui";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { useFadeIn, useFadeInUp } from "@/hooks/useAnimatedEntry";
import { getCurrentUser, getCurrentUserProfile } from "@/services/authService";
import { Collections } from "@/services/firebase";
import { getSession } from "@/services/sessionService";
import firestore from "@react-native-firebase/firestore";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface QuickAccessItem {
  icon: IconName;
  label: string;
  route: string;
  color: string;
  bgColor: string;
}

const quickAccess: QuickAccessItem[] = [
  {
    icon: "hen",
    label: "Livestock\nCategories",
    route: "/(admin)/livestock",
    color: "#2E7D32",
    bgColor: "#E2F7E2",
  },
  {
    icon: "messages-square",
    label: "Forum &\nDiscussions",
    route: "/(admin)/forum",
    color: "#672E7D",
    bgColor: "#F1E2F7",
  },
  {
    icon: "clipboard",
    label: "Knowledge\nBase",
    route: "/(admin)/home/knowledge-base",
    color: "#1976D2",
    bgColor: "#D9EBFB",
  },
  {
    icon: "bell",
    label: "Announcements\n& Bulletins",
    route: "/(admin)/home/announcements",
    color: "#D97706",
    bgColor: "#FEF3C7",
  },
  {
    icon: "calendar",
    label: "Appointments &\nConsultations",
    route: "/(admin)/home/appointments",
    color: "#F57C00",
    bgColor: "#FFF3CD",
  },
  {
    icon: "user-cog",
    label: "User\nManagement",
    route: "/(admin)/home/users",
    color: "#00897B",
    bgColor: "#E0F7FA",
  },
  {
    icon: "shield-alert",
    label: "Reports &\nComplaints",
    route: "/(admin)/home/reports",
    color: "#E53935",
    bgColor: "#FFEBEE",
  },
  {
    icon: "alert",
    label: "Message\nReports",
    route: "/(admin)/home/message-reports",
    color: "#D84315",
    bgColor: "#FBE9E7",
  },
  {
    icon: "star",
    label: "Ratings &\nReviews",
    route: "/(admin)/home/reviews",
    color: "#F59E0B",
    bgColor: "#FFF8E1",
  },
  {
    icon: "logs",
    label: "Activity\nLogs",
    route: "/(admin)/home/logs",
    color: "#607D8B",
    bgColor: "#ECEFF1",
  },
];

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  icon: IconName;
  route: string;
  rawTime: number;
}

const getRelativeTime = (
  timestamp: any,
): { timeStr: string; rawMs: number } => {
  if (!timestamp) return { timeStr: "Recently", rawMs: Date.now() };
  let date: Date;

  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (
    timestamp._seconds !== undefined ||
    timestamp.seconds !== undefined
  ) {
    const secs = timestamp._seconds ?? timestamp.seconds;
    date = new Date(secs * 1000);
  } else if (typeof timestamp === "string" || typeof timestamp === "number") {
    date = new Date(timestamp);
  } else {
    date = new Date();
  }

  const rawMs = date.getTime();
  if (isNaN(rawMs)) return { timeStr: "Recently", rawMs: Date.now() };

  const now = new Date().getTime();
  const diffMs = Math.max(0, now - rawMs);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return { timeStr: "Just now", rawMs };
  if (diffMins < 60) return { timeStr: `${diffMins}m ago`, rawMs };
  if (diffHours < 24) return { timeStr: `${diffHours}h ago`, rawMs };
  if (diffDays < 7) return { timeStr: `${diffDays}d ago`, rawMs };

  return {
  timeStr: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    rawMs,
  };
};

export default function AdminHome() {
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState("Admin AgriCare");
  const [photoURL, setPhotoURL] = useState<string | undefined>(undefined);

  // Dynamic Realtime Firebase Stats
  const [farmersCount, setFarmersCount] = useState<number>(0);
  const [techsCount, setTechsCount] = useState<number>(0);
  const [appointmentsCount, setAppointmentsCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // Dynamic Realtime Activity Stream
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const headerAnim = useFadeIn(100);
  const statsAnim = useFadeInUp(200);
  const gridAnim = useFadeInUp(300);
  const activityAnim = useFadeInUp(500);

  // ─── 1. Load Admin Profile ───
  useEffect(() => {
    const loadProfile = async () => {
      const session = await getSession();
      if (session && session.displayName) {
        setUserName(session.displayName);
      }

      const authUser = getCurrentUser();
      if (authUser?.displayName) {
        setUserName(authUser.displayName);
      }
      if (authUser?.photoURL) {
        setPhotoURL(authUser.photoURL);
      }

      const profile: any = await getCurrentUserProfile();
      if (profile) {
        const nameFromProfile =
          profile.displayName || profile.name || profile.fullName;
        if (nameFromProfile) {
          setUserName(nameFromProfile);
        }
        if (profile.photoURL) {
          setPhotoURL(profile.photoURL);
        }
      }
    };
    loadProfile();
  }, []);

  // ─── 2. Realtime Firebase Firestore Listeners for Stats & Activities ───
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    let usersList: any[] = [];
    let apptsList: any[] = [];
    let reportsList: any[] = [];
    let consultsList: any[] = [];

    const updateStatsAndActivities = () => {
      // Calculate Farmers & Techs
      const farmers = usersList.filter((u) => u.role === "farmer");
      const techs = usersList.filter((u) => u.role === "technician");
      setFarmersCount(farmers.length);
      setTechsCount(techs.length);

      // Calculate Total Appointments
      setAppointmentsCount(apptsList.length);

      // Calculate Pending (Pending Tech Approvals + Pending Appointments + Pending Reports)
      const pendingTechs = techs.filter(
        (t) => t.status === "pending" || t.status === "inactive",
      ).length;
      const pendingAppts = apptsList.filter(
        (a) => a.status === "pending",
      ).length;
      const pendingReports = reportsList.filter(
        (r) => r.status === "pending",
      ).length;

      setPendingCount(pendingTechs + pendingAppts + pendingReports);
      setStatsLoading(false);
    };

    try {
      // 1. Subscribe to USERS
      const unsubUsers = firestore().collection(Collections.USERS).onSnapshot(
        (snap) => {
          if (snap) {
            usersList = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            updateStatsAndActivities();
          }
        },
        (err) => console.warn("Users listen error:", err.message),
      );
      unsubs.push(unsubUsers);

      // 2. Subscribe to APPOINTMENTS
      const unsubAppts = firestore().collection(Collections.APPOINTMENTS).onSnapshot(
        (snap) => {
          if (snap) {
            apptsList = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            updateStatsAndActivities();
          }
        },
        (err) => console.warn("Appointments listen error:", err.message),
      );
      unsubs.push(unsubAppts);

      // 3. Subscribe to REPORTS
      const unsubReports = firestore().collection(Collections.REPORTS).onSnapshot(
        (snap) => {
          if (snap) {
            reportsList = snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            updateStatsAndActivities();
          }
        },
        (err) => console.warn("Reports listen error:", err.message),
      );
      unsubs.push(unsubReports);

      // 4. Subscribe to CONSULTATIONS
      const unsubConsults = firestore().collection(Collections.CONSULTATIONS).onSnapshot(
        (snap) => {
          if (snap) {
            consultsList = snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            updateStatsAndActivities();
          }
        },
        (err) => console.warn("Consultations listen error:", err.message),
      );
      unsubs.push(unsubConsults);
    } catch (e: any) {
      console.warn("Realtime stats setup error:", e.message);
      setStatsLoading(false);
      setActivitiesLoading(false);
    }

    return () => unsubs.forEach((u) => u());
  }, []);

  // ─── 3. Realtime Activity Logs (latest 7 from 'logs' collection) ───
  useEffect(() => {
    const unsubLogs = firestore()
      .collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(7)
      .onSnapshot(
        (snap) => {
          if (snap) {
            const logItems: ActivityItem[] = snap.docs.map((doc) => {
              const data = doc.data();
              const { timeStr, rawMs } = getRelativeTime(data.timestamp);
              const iconMap: Record<string, IconName> = {
                crud: 'clipboard',
                auth: 'farmer',
                system: 'settings',
                error: 'shield-alert',
              };
              return {
                id: doc.id,
                text: `${data.action}${data.details ? ` — ${data.details}` : ''}`,
                time: timeStr,
                icon: iconMap[data.type] || 'clock',
                route: '/(admin)/home/logs',
                rawTime: rawMs,
              };
            });
            setActivities(logItems);
          }
          setActivitiesLoading(false);
        },
        (err) => {
          console.warn('Logs listen error:', err.message);
          setActivitiesLoading(false);
        },
      );

    return () => unsubLogs();
  }, []);

  const statsList = [
    {
      icon: "farmer" as IconName,
      value: farmersCount.toString(),
      label: "Farmers",
      route: "/(admin)/home/users",
      bgColor: "#FFFFFF",
      iconColor: "#2E7D32",
      valueColor: "#1B5E20",
    },
    {
      icon: "technician" as IconName,
      value: techsCount.toString(),
      label: "Technicians",
      route: "/(admin)/home/users",
      bgColor: "#FFFFFF",
      iconColor: "#2E7D32",
      valueColor: "#1B5E20",
    },
    {
      icon: "calendar" as IconName,
      value: appointmentsCount.toString(),
      label: "Appts & Consults",
      route: "/(admin)/home/appointments",
      bgColor: "#FFFFFF",
      iconColor: "#2E7D32",
      valueColor: "#1B5E20",
    },
    {
      icon: "clock" as IconName,
      value: pendingCount.toString(),
      label: "Pending",
      route: "/(admin)/home/reports",
      bgColor: "#FFF9F0",
      iconColor: "#B87B28",
      valueColor: "#B87B28",
      labelColor: "#B87B28",
      borderColor: "#DCAE6C",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: Math.max(insets.bottom + 32, 48),
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with rich green background & leaf pattern */}
      <Animated.View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top + 12, 44) },
          headerAnim,
        ]}
      >
        <View style={styles.headerDecorRight}>
          <HeaderLeafPattern width={340} height={280} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Avatar name={userName} imageUrl={photoURL} size={48} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{userName}</Text>
              <Text style={styles.headerRole}>Administrator</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
            <Icon name="bell" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* ─── Top 4 Interactive Clickable Stat Cards Row ─── */}
        <Animated.View style={[styles.statsRow, statsAnim]}>
          {statsList.map((stat, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.statCard,
                { backgroundColor: stat.bgColor },
                stat.borderColor
                  ? { borderWidth: 1.5, borderColor: stat.borderColor }
                  : null,
              ]}
              onPress={() => router.push(stat.route as any)}
              activeOpacity={0.8}
            >
              <Icon
                name={stat.icon}
                size={20}
                color={stat.iconColor}
                strokeWidth={2}
              />
              {statsLoading ? (
                <ActivityIndicator
                  size="small"
                  color={stat.valueColor}
                  style={{ marginTop: 2 }}
                />
              ) : (
                <Text style={[styles.statValue, { color: stat.valueColor }]}>
                  {stat.value}
                </Text>
              )}
              <Text
                style={[
                  styles.statLabel,
                  stat.labelColor ? { color: stat.labelColor } : null,
                ]}
              >
                {stat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Animated.View>

      {/* Main Content Area with Curved Top */}
      <View style={styles.mainContentArea}>
        {/* Quick Access Action Grid Container */}
        <Animated.View style={[styles.quickCardContainer, gridAnim]}>
          <View style={styles.gridDecorBottomRight}>
            <LeafDecor width={180} height={180} color="#2E7D32" opacity={0.1} />
          </View>
          <View style={styles.quickGrid}>
            {quickAccess.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickItem}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.quickIconContainer,
                    { backgroundColor: item.bgColor },
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={26}
                    color={item.color}
                    strokeWidth={1.8}
                  />
                </View>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ─── Realtime Dynamic Recent Activity Section ─── */}
        <Animated.View style={[styles.activityCard, activityAnim]}>
          <View style={styles.activityDecorBottomRight}>
            <LeafDecor width={160} height={160} color="#2E7D32" opacity={0.1} />
          </View>

          <TouchableOpacity
            style={styles.activityHeader}
            onPress={() => router.push("/(admin)/home/logs")}
            activeOpacity={0.7}
          >
            <View style={styles.activityHeaderLeft}>
              <Icon name="clock" size={20} color={Colors.textSecondary} />
              <Text style={styles.activityTitle}>Recent Activity Logs</Text>
            </View>
            <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.activityDivider} />

          {activitiesLoading ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#1B5E20" />
              <Text style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>
                Fetching real activity stream...
              </Text>
            </View>
          ) : activities.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: "#94A3B8" }}>
                No recent activity recorded.
              </Text>
            </View>
          ) : (
            activities.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.activityItem}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={styles.activityDot} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{item.text}</Text>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
                <Icon name="chevron-right" size={14} color="#CBD5E1" />
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },
  // ─── Header ───
  header: {
    backgroundColor: "#1B5E20",
    paddingTop: Spacing.xxl + 16,
    paddingBottom: Spacing.xl + 8,
    position: "relative",
    overflow: "hidden",
  },
  headerDecorRight: {
    position: "absolute",
    top: 0,
    right: -40,
    zIndex: 0,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    zIndex: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  headerInfo: {
    justifyContent: "center",
  },
  headerName: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  headerRole: {
    fontSize: FontSize.xs,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  // ─── Stat Cards ───
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    zIndex: 1,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    alignItems: "center",
    ...Shadow.light,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginTop: 2,
  },
  // ─── Main Content Area ───
  mainContentArea: {
    flex: 1,
    marginTop: -16,
    backgroundColor: "#F4F7F4",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  // ─── Quick Access Grid ───
  quickCardContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    position: "relative",
    overflow: "hidden",
    ...Shadow.light,
  },
  gridDecorBottomRight: {
    position: "absolute",
    bottom: -20,
    right: -20,
    zIndex: 0,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    zIndex: 1,
  },
  quickItem: {
    width: "33.33%",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  quickIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
    lineHeight: 14,
  },
  // ─── Recent Activity ───
  activityCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    position: "relative",
    overflow: "hidden",
    ...Shadow.light,
  },
  activityDecorBottomRight: {
    position: "absolute",
    bottom: -20,
    right: -20,
    zIndex: 0,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  activityHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  activityTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  activityDivider: {
    height: 1,
    backgroundColor: "#F0F4F0",
    marginVertical: Spacing.md,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm + 4,
    zIndex: 1,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2E7D32",
    marginRight: Spacing.sm + 2,
  },
  activityContent: {
    flex: 1,
    marginRight: 6,
  },
  activityText: {
    fontSize: FontSize.xs + 1,
    color: Colors.text,
    fontWeight: "600",
    lineHeight: 17,
  },
  activityTime: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
});

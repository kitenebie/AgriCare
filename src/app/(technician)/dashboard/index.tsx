import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { Card, Icon, IconName, Avatar } from "@/components/ui";
import { useFadeIn, useFadeInUp } from "@/hooks/useAnimatedEntry";
import { getSession } from "@/services/sessionService";
import firestore from "@react-native-firebase/firestore";
import { Collections } from "@/services/firebase";
interface DashboardData {
  pendingRequests: number;
  acceptedRequests: number;
  upcomingAppointments: number;
  overdueSchedules: number;
}
export default function TechDashboardScreen() {
  const headerAnim = useFadeIn(100);
  const overviewAnim = useFadeInUp(200);
  const quickAccessAnim = useFadeInUp(400);
  const helpBannerAnim = useFadeInUp(600);
  const [userName, setUserName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [dashData, setDashData] = useState<DashboardData>({
    pendingRequests: 0,
    acceptedRequests: 0,
    upcomingAppointments: 0,
    overdueSchedules: 0,
  });
  const [notifCount, setNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
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
          if (data?.available !== undefined) setAvailable(data.available);
        }
        // Count ALL unassigned pending requests (available for this technician to accept)
        const pendingSnap = await firestore()
          .collection(Collections.APPOINTMENTS)
          .where("status", "==", "pending")
          .get();
        const pendingRequests = pendingSnap.docs.filter((d) => {
          const data = d.data();
          return (
            !data.technicianId ||
            data.technicianId === "" ||
            data.technicianName === "Unassigned"
          );
        }).length;
        // Count accepted requests (confirmed appointments)
        const acceptedSnap = await firestore()
          .collection(Collections.APPOINTMENTS)
          .where("technicianId", "==", uid)
          .where("status", "==", "confirmed")
          .get();
        const acceptedRequests = acceptedSnap.size;
        // Count upcoming appointments (confirmed + date >= today)
        const today = new Date().toISOString().split("T")[0];
        const upcomingSnap = await firestore()
          .collection(Collections.APPOINTMENTS)
          .where("technicianId", "==", uid)
          .where("status", "==", "confirmed")
          .where("date", ">=", today)
          .get();
        const upcomingAppointments = upcomingSnap.size;
        // Count overdue (confirmed + date < today — past schedule na hindi na-complete)
        const overdueSnap = await firestore()
          .collection(Collections.APPOINTMENTS)
          .where("technicianId", "==", uid)
          .where("status", "==", "confirmed")
          .where("date", "<", today)
          .get();
        const overdueSchedules = overdueSnap.size;
        setDashData({
          pendingRequests,
          acceptedRequests,
          upcomingAppointments,
          overdueSchedules,
        });
        // Notification count
        const notifSnap = await firestore()
          .collection(Collections.NOTIFICATIONS)
          .where("userId", "==", uid)
          .where("read", "==", false)
          .get();
        setNotifCount(notifSnap.size);
      } catch (e) {
        console.warn("Tech dashboard load error:", e);
      }
      setLoading(false);
  }, []);
  // Refresh data when screen gains focus (e.g. after accepting a request)
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [])
  );
  const toggleAvailability = async () => {
    try {
      const session = await getSession();
      if (!session) return;
      const newStatus = !available;
      await firestore()
        .collection(Collections.USERS)
        .doc(session.uid)
        .update({ available: newStatus });
      setAvailable(newStatus);
    } catch (e) {
      console.warn("Toggle availability error:", e);
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View style={[styles.header, headerAnim]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.role}>Technician</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notifButton}>
            <Icon name="bell" size={24} color={Colors.white} />
            {notifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>  
                  {notifCount > 9 ? "9+" : notifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <Avatar name={userName} imageUrl={photoURL || undefined} size={44} />
        </View>
      </Animated.View>
      {/* Dashboard Stats */}
      <Animated.View style={overviewAnim}>
        <Card style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>Dashboard</Text>
          <View style={styles.overviewGrid}>
            <OverviewItem
              value={dashData.pendingRequests}
              label="Pending Requests"
              iconName="clipboard"
              isAlert={dashData.pendingRequests > 0}
            />
            <OverviewItem
              value={dashData.acceptedRequests}
              label="Accepted Requests"
              iconName="check-circle"
            />
            <OverviewItem
              value={dashData.upcomingAppointments}
              label="Upcoming Appointments"
              iconName="calendar"
            />
            <OverviewItem
              value={dashData.overdueSchedules}
              label="Overdue Schedules"
              iconName="clock"
              isAlert={dashData.overdueSchedules > 0}
            />
          </View>
        </Card>
      </Animated.View>
      {/* Quick Access */}
      <Animated.View style={[styles.quickAccessSection, quickAccessAnim]}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          <QuickAccessItem
            iconName="clipboard"
            label={"Available\nRequests"}
            onPress={() => router.push("/(technician)/appointments")}
          />
          <QuickAccessItem
            iconName="check-circle"
            label={"Accepted\nRequests"}
            onPress={() => router.push("/(technician)/schedule")}
          />
          <QuickAccessItem
            iconName="calendar"
            label="Appointments"
            onPress={() => router.push("/(technician)/schedule")}
          />
          <QuickAccessItem
            iconName="health-check"
            label={"Health\nRecords"}
            onPress={() =>
              router.push("/(technician)/dashboard/health-records")
            }
          />
          <QuickAccessItem
            iconName="bell"
            label={"Announcements\n& Bulletins"}
            onPress={() => router.push("/(technician)/dashboard/announcements")}
          />
        </View>
      </Animated.View>
      {/* Emergency Banner */}
      <Animated.View style={helpBannerAnim}>
        <View style={styles.helpBannerWrapper}>
          <TouchableOpacity style={styles.helpBanner} activeOpacity={0.85}>
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Emergency Requests</Text>
              <Text style={styles.helpSubtitle}>
                Respond to urgent farmer{"\n"}requests in your area.
              </Text>
              <View style={styles.findButton}>
                <Text style={styles.findButtonText}>View Emergencies</Text>
              </View>
            </View>
            <View style={styles.pinContainer}>
              <Icon name="alert" size={28} color="#FF6B6B" />
            </View>
          </TouchableOpacity>
          <Image
            source={require("../../../../assets/app/man.png")}
            style={styles.helpImage}
            contentFit="contain"
          />
        </View>
      </Animated.View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
interface OverviewItemProps {
  value: number;
  label: string;
  iconName: IconName;
  isAlert?: boolean;
}
const OverviewItem: React.FC<OverviewItemProps> = ({
  value,
  label,
  iconName,
  isAlert,
}) => (
  <View style={styles.overviewItem}>
    <View style={styles.overviewItemHeader}>
      <Text style={[styles.overviewValue, isAlert && styles.alertValue]}>
        {value}
      </Text>
      <Icon
        name={iconName}
        size={24}
        color={isAlert ? Colors.error : Colors.primary}
      />
    </View>
    <Text style={styles.overviewLabel}>{label}</Text>
  </View>
);
interface QuickAccessItemProps {
  iconName: IconName;
  label: string;
  onPress: () => void;
}
const QuickAccessItem: React.FC<QuickAccessItemProps> = ({
  iconName,
  label,
  onPress,
}) => (
  <TouchableOpacity
    style={styles.quickItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.quickIcon}>
      <Icon name={iconName} size={26} color={Colors.primary} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.primary,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  headerLeft: {},
  greeting: { fontSize: FontSize.lg, color: Colors.white, opacity: 0.9 },
  name: { fontSize: FontSize.xxl, fontWeight: "800", color: Colors.white },
  role: { fontSize: FontSize.md, color: Colors.accent, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  notifButton: { position: "relative", padding: 4 },
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
  // Availability
  availabilityCard: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  availableCard: { backgroundColor: "#E8F5E9" },
  unavailableCard: { backgroundColor: "#FFEBEE" },
  availRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  availDot: { width: 12, height: 12, borderRadius: 6 },
  availText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  availToggle: { fontSize: FontSize.xs, color: Colors.textSecondary },
  // Overview
  overviewCard: { marginTop: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  overviewItem: {
    width: "47%",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  overviewItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overviewValue: {
    fontSize: FontSize.xxxl,
    fontWeight: "800",
    color: Colors.primary,
  },
  alertValue: { color: Colors.error },
  overviewLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  // Quick Access
  quickAccessSection: { marginTop: Spacing.xxl },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: Spacing.md,
  },
  quickItem: { alignItems: "center", width: "30%" },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    ...Shadow.light,
  },
  quickLabel: {
    fontSize: FontSize.xs,
    color: Colors.text,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 14,
  },
  // Help Banner
  helpBanner: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingRight: 100,
    overflow: "hidden",
  },
  helpContent: { zIndex: 2 },
  helpTitle: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.white },
  helpSubtitle: {
    fontSize: FontSize.md,
    color: Colors.accent,
    marginTop: 4,
    lineHeight: 20,
  },
  findButton: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignSelf: "flex-start",
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.white,
    backgroundColor: "transparent",
  },
  findButtonText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: FontSize.sm,
  },
  helpBannerWrapper: { position: "relative", marginTop: Spacing.xxl },
  pinContainer: { position: "absolute", right: 80, bottom: "40%", zIndex: 1 },
  helpImage: {
    position: "absolute",
    right: 10,
    top: -40,
    width: 120,
    height: 180,
    zIndex: 3,
  },
});

import { Icon, Avatar } from "@/components/ui";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { db, Collections } from "@/services/firebase";
import { getCurrentUserProfile } from "@/services/authService";
import firestore, { collection, onSnapshot } from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
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

export interface ContentBlock {
  id: string;
  type: "paragraph" | "image";
  text?: string;
  imageUrl?: string;
  caption?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string; // Combined text string for search / backwards compatibility
  contentBlocks?: ContentBlock[];
  audience: "all" | "farmers" | "technicians";
  priority: "low" | "medium" | "high" | "urgent";
  createdBy: string;
  authorName?: string;
  createdAt?: any;
  updatedAt?: any;
}

const AUDIENCE_OPTIONS: { label: string; value: "all" | "farmers" | "technicians" }[] = [
  { label: "All Users", value: "all" },
  { label: "Farmers Only", value: "farmers" },
  { label: "Technicians Only", value: "technicians" },
];

const PRIORITY_OPTIONS: { label: string; value: "low" | "medium" | "high" | "urgent" }[] = [
  { label: "Urgent", value: "urgent" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

// Fallback initial data matching Firestore screenshot:
// audience: "all", content: "Welcome sa AgriCare!...", createdBy: "admin_001", id: "ann_001", priority: "high", title: "AgriCare App Launch!"
const INITIAL_MOCK_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: "ann_001",
    title: "AgriCare App Launch!",
    audience: "all",
    priority: "high",
    content:
      "Welcome sa AgriCare! Ang app para sa livestock support at service management sa buong lalawigan ng Bulacan.",
    contentBlocks: [
      {
        id: "ab1",
        type: "image",
        imageUrl:
          "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=80",
        caption: "Maligayang pagdating sa AgriCare Mobile Portal",
      },
      {
        id: "ab2",
        type: "paragraph",
        text: "Welcome sa AgriCare! Ang pinakabagong digital app na idinisenyo para sa pagpapadali ng livestock support, veterinary technician appointments, at emergency assistance sa buong lalawigan.",
      },
      {
        id: "ab3",
        type: "image",
        imageUrl:
          "https://images.unsplash.com/photo-1546445317-29f4545f9d52?auto=format&fit=crop&w=800&q=80",
        caption: "Baka at livestock care services",
      },
      {
        id: "ab4",
        type: "paragraph",
        text: "Gamitin ang ating Community Forum para magtanong at makipag-ugnayan sa mga ekspertong vet technicians. Maraming salamat sa inyong patuloy na pagtangkilik!",
      },
    ],
    createdBy: "admin_001",
    authorName: "Admin AgriCare",
  },
  {
    id: "ann_002",
    title: "Free Vaccination Drive sa San Miguel",
    audience: "farmers",
    priority: "urgent",
    content:
      "Pabakuna para sa mga baka at kambing ngayong darating na Biyernes sa San Miguel Municipal Hall.",
    contentBlocks: [
      {
        id: "ab2_1",
        type: "paragraph",
        text: "Magkakaroon ng libreng vaccination at deworming drive para sa lahat ng magsasaka ng baka at kambing sa San Miguel Municipal Covered Court ngayong Biyernes, 8:00 AM - 4:00 PM.",
      },
      {
        id: "ab2_2",
        type: "image",
        imageUrl:
          "https://images.unsplash.com/photo-1570042707222-6b3a39e80a06?auto=format&fit=crop&w=800&q=80",
        caption: "Free Veterinary Vaccination Drive",
      },
    ],
    createdBy: "admin_001",
    authorName: "Admin AgriCare",
  },
  {
    id: "ann_003",
    title: "Technician Monthly Meeting",
    audience: "technicians",
    priority: "medium",
    content:
      "Paalala sa lahat ng accredited veterinary technicians para sa ating monthly alignment sa Sabado.",
    contentBlocks: [
      {
        id: "ab3_1",
        type: "paragraph",
        text: "Inaanyayahan ang lahat ng mga accredited veterinary technicians sa ating monthly online alignment meeting via Zoom ngayong Sabado, 2:00 PM.",
      },
    ],
    createdBy: "admin_001",
    authorName: "Admin AgriCare",
  },
];

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudience, setSelectedAudience] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<AnnouncementItem | null>(null);

  // Form State (Repeater Content Blocks)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formAudience, setFormAudience] = useState<"all" | "farmers" | "technicians">("all");
  const [formPriority, setFormPriority] = useState<"low" | "medium" | "high" | "urgent">("high");
  const [formBlocks, setFormBlocks] = useState<ContentBlock[]>([]);
  const [saving, setSaving] = useState(false);

  // Current admin user info
  const [adminUser, setAdminUser] = useState({
    id: "admin_001",
    name: "Admin AgriCare",
    role: "admin",
  });

  useEffect(() => {
    const loadAdminInfo = async () => {
      const profile: any = await getCurrentUserProfile();
      if (profile) {
        setAdminUser({
          id: profile.id || profile.uid || "admin_001",
          name: profile.displayName || profile.name || "Admin AgriCare",
          role: profile.role || "admin",
        });
      }
    };
    loadAdminInfo();
  }, []);

  // ─── Realtime Firestore Listener ───
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onSnapshot(
        collection(db, Collections.ANNOUNCEMENTS),
        (snapshot) => {
          if (snapshot) {
            const data: AnnouncementItem[] = snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                title: d.title || "Untitled Announcement",
                content: d.content || "",
                contentBlocks: Array.isArray(d.contentBlocks)
                  ? d.contentBlocks
                  : undefined,
                audience: d.audience || "all",
                priority: d.priority || "high",
                createdBy: d.createdBy || "admin_001",
                authorName: d.authorName || "Admin AgriCare",
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
              };
            });
            setAnnouncements(data);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore announcements listen error:", error.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.warn("onSnapshot setup error:", err.message);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // ─── Filtered Announcements ───
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      const matchesAudience =
        selectedAudience === "all" || item.audience === selectedAudience;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.priority.toLowerCase().includes(q) ||
        item.audience.toLowerCase().includes(q);
      return matchesAudience && matchesSearch;
    });
  }, [announcements, selectedAudience, searchQuery]);

  // ─── Form Repeater Block Handlers ───
  const resetForm = () => {
    setFormTitle("");
    setFormAudience("all");
    setFormPriority("high");
    // Initial template pattern: image -> paragraph -> image -> paragraph
    setFormBlocks([
      {
        id: Date.now().toString() + "_1",
        type: "image",
        imageUrl: "",
        caption: "",
      },
      {
        id: Date.now().toString() + "_2",
        type: "paragraph",
        text: "",
      },
    ]);
    setEditingId(null);
  };

  const addParagraphBlock = () => {
    setFormBlocks((prev) => [
      ...prev,
      {
        id: Date.now().toString() + "_" + Math.random().toString(36).substring(7),
        type: "paragraph",
        text: "",
      },
    ]);
  };

  const addImageBlock = () => {
    setFormBlocks((prev) => [
      ...prev,
      {
        id: Date.now().toString() + "_" + Math.random().toString(36).substring(7),
        type: "image",
        imageUrl: "",
        caption: "",
      },
    ]);
  };

  const removeBlock = (id: string) => {
    if (formBlocks.length <= 1) {
      Alert.alert(
        "Notice",
        "Announcement must contain at least one content block."
      );
      return;
    }
    setFormBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === formBlocks.length - 1)
    ) {
      return;
    }
    const newBlocks = [...formBlocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    setFormBlocks(newBlocks);
  };

  const updateBlock = (id: string, fields: Partial<ContentBlock>) => {
    setFormBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...fields } : b))
    );
  };

  const handlePickBlockImage = async (blockId: string) => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Permission to access media library is required."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        updateBlock(blockId, { imageUrl: uri });
      }
    } catch (e: any) {
      const sample =
        "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=80";
      updateBlock(blockId, { imageUrl: sample });
    }
  };

  const uploadToStorage = async (
    localUri: string,
    folder: string
  ): Promise<string> => {
    if (localUri.startsWith("http://") || localUri.startsWith("https://")) {
      return localUri;
    }
    try {
      const filename = `${folder}/${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;
      const ref = storage().ref(filename);
      await ref.putFile(localUri);
      return await ref.getDownloadURL();
    } catch (e) {
      return localUri;
    }
  };

  const openCreateModal = () => {
    resetForm();
    setFormModalVisible(true);
  };

  const openEditModal = (item: AnnouncementItem) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormAudience(item.audience || "all");
    setFormPriority(item.priority || "high");

    if (item.contentBlocks && item.contentBlocks.length > 0) {
      setFormBlocks(item.contentBlocks);
    } else {
      setFormBlocks([
        {
          id: Date.now().toString(),
          type: "paragraph",
          text: item.content,
        },
      ]);
    }
    setFormModalVisible(true);
  };

  const openDetailModal = (item: AnnouncementItem) => {
    setSelectedAnnouncement(item);
    setDetailModalVisible(true);
  };

  // ─── Save Announcement Handler ───
  const handleSave = async () => {
    if (!formTitle.trim()) {
      Alert.alert("Required Field", "Please enter an announcement title.");
      return;
    }

    setSaving(true);

    try {
      const processedBlocks: ContentBlock[] = [];
      for (const block of formBlocks) {
        if (block.type === "image" && block.imageUrl) {
          const uploadedUrl = await uploadToStorage(
            block.imageUrl,
            "announcement_images"
          );
          processedBlocks.push({
            ...block,
            imageUrl: uploadedUrl,
          });
        } else if (block.type === "paragraph" && block.text?.trim()) {
          processedBlocks.push({
            ...block,
            text: block.text.trim(),
          });
        }
      }

      const combinedContent = processedBlocks
        .filter((b) => b.type === "paragraph" && b.text)
        .map((b) => b.text)
        .join("\n\n");

      if (editingId) {
        // Update existing announcement
        await firestore()
          .collection(Collections.ANNOUNCEMENTS)
          .doc(editingId)
          .update({
            title: formTitle.trim(),
            audience: formAudience,
            priority: formPriority,
            content: combinedContent,
            contentBlocks: processedBlocks,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });

        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === editingId
              ? {
                  ...a,
                  title: formTitle.trim(),
                  audience: formAudience,
                  priority: formPriority,
                  content: combinedContent,
                  contentBlocks: processedBlocks,
                }
              : a
          )
        );
      } else {
        // Create new announcement
        const newDocRef = firestore()
          .collection(Collections.ANNOUNCEMENTS)
          .doc();

        const newAnn: AnnouncementItem = {
          id: newDocRef.id,
          title: formTitle.trim(),
          audience: formAudience,
          priority: formPriority,
          content: combinedContent,
          contentBlocks: processedBlocks,
          createdBy: adminUser.id,
          authorName: adminUser.name,
        };

        await newDocRef.set({
          ...newAnn,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        setAnnouncements((prev) => [newAnn, ...prev]);
      }

      setFormModalVisible(false);
      resetForm();
      Alert.alert("Success", "Announcement saved successfully!");
    } catch (error: any) {
      console.error("Save announcement error:", error);
      Alert.alert("Error", error.message || "Failed to save announcement.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Announcement
  const handleDelete = (item: AnnouncementItem) => {
    Alert.alert(
      "Delete Announcement",
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await firestore()
                .collection(Collections.ANNOUNCEMENTS)
                .doc(item.id)
                .delete();

              setAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete.");
            }
          },
        },
      ]
    );
  };

  // Priority Badge Color Mapper
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "urgent":
        return { bg: "#FEE2E2", text: "#DC2626", label: "URGENT" };
      case "high":
        return { bg: "#FFEDD5", text: "#EA580C", label: "HIGH" };
      case "medium":
        return { bg: "#DBEAFE", text: "#2563EB", label: "MEDIUM" };
      default:
        return { bg: "#F1F5F9", text: "#64748B", label: "LOW" };
    }
  };

  // Audience Label Helper
  const getAudienceLabel = (aud: string) => {
    switch (aud) {
      case "farmers":
        return "Farmers Only";
      case "technicians":
        return "Technicians Only";
      default:
        return "All Users";
    }
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

          <Text style={styles.headerTitle}>Announcements</Text>

          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={openCreateModal}
            activeOpacity={0.8}
          >
            <Icon name="plus" size={18} color="#1B5E20" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsSummaryRow}>
          <View style={styles.statSummaryPill}>
            <Icon name="bell" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.statSummaryText}>
              {announcements.length} Bulletins
            </Text>
          </View>
          <View style={styles.statSummaryPill}>
            <Icon name="farmer" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.statSummaryText}>Targeted Broadcast</Text>
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
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Icon name="search" size={18} color="#718096" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bulletins, priority, target audience..."
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

        {/* Audience Filter Pills */}
        <View style={styles.audienceFilterRow}>
          <TouchableOpacity
            style={[
              styles.audiencePill,
              selectedAudience === "all" && styles.audiencePillActive,
            ]}
            onPress={() => setSelectedAudience("all")}
          >
            <Text
              style={[
                styles.audiencePillText,
                selectedAudience === "all" && styles.audiencePillTextActive,
              ]}
            >
              All Users
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.audiencePill,
              selectedAudience === "farmers" && styles.audiencePillActive,
            ]}
            onPress={() => setSelectedAudience("farmers")}
          >
            <Text
              style={[
                styles.audiencePillText,
                selectedAudience === "farmers" && styles.audiencePillTextActive,
              ]}
            >
              Farmers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.audiencePill,
              selectedAudience === "technicians" && styles.audiencePillActive,
            ]}
            onPress={() => setSelectedAudience("technicians")}
          >
            <Text
              style={[
                styles.audiencePillText,
                selectedAudience === "technicians" &&
                  styles.audiencePillTextActive,
              ]}
            >
              Technicians
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>Loading announcements...</Text>
          </View>
        ) : filteredAnnouncements.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <Icon name="bell" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Announcements</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No announcements match "${searchQuery}"`
                : "No broadcasts published yet."}
            </Text>
            <TouchableOpacity
              style={styles.createFirstBtn}
              onPress={openCreateModal}
            >
              <Icon name="plus" size={18} color={Colors.white} />
              <Text style={styles.createFirstBtnText}>
                Create Announcement
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Announcements List */
          <View style={styles.announcementsList}>
            {filteredAnnouncements.map((item) => {
              const prioStyle = getPriorityStyle(item.priority);
              const hasBlocks =
                item.contentBlocks && item.contentBlocks.length > 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.announcementCard}
                  onPress={() => openDetailModal(item)}
                  activeOpacity={0.8}
                >
                  {/* Top Header Meta */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View
                        style={[
                          styles.prioBadge,
                          { backgroundColor: prioStyle.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.prioBadgeText,
                            { color: prioStyle.text },
                          ]}
                        >
                          {prioStyle.label}
                        </Text>
                      </View>
                      <View style={styles.audienceBadge}>
                        <Text style={styles.audienceBadgeText}>
                          {getAudienceLabel(item.audience)}
                        </Text>
                      </View>
                      {hasBlocks && (
                        <View style={styles.repeaterBadge}>
                          <Icon name="image" size={12} color="#1D4ED8" />
                          <Text style={styles.repeaterBadgeText}>
                            {item.contentBlocks?.length} blocks
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.annIdText}>ID: {item.id}</Text>
                  </View>

                  {/* Title & Snippet */}
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSnippet} numberOfLines={2}>
                    {item.content}
                  </Text>

                  {/* Card Bottom Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.createdByText}>
                      By {item.authorName || item.createdBy}
                    </Text>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionBtnEdit}
                        onPress={() => openEditModal(item)}
                        activeOpacity={0.7}
                      >
                        <Icon name="edit" size={15} color="#2563EB" />
                        <Text style={styles.actionBtnEditText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnDelete}
                        onPress={() => handleDelete(item)}
                        activeOpacity={0.7}
                      >
                        <Icon name="close" size={15} color="#DC2626" />
                        <Text style={styles.actionBtnDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ─── ADD / EDIT ANNOUNCEMENT MODAL (REPEATER FORM) ─── */}
      <Modal
        visible={formModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFormModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.formModalContainer, { maxHeight: "90%" }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>
                {editingId ? "Edit Announcement" : "Create New Announcement"}
              </Text>
              <TouchableOpacity
                onPress={() => setFormModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Title Field */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Announcement Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. AgriCare App Launch!"
                  placeholderTextColor="#A0AEC0"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />
              </View>

              {/* Target Audience Selector */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Target Audience *</Text>
                <View style={styles.selectorRow}>
                  {AUDIENCE_OPTIONS.map((opt) => {
                    const isSelected = formAudience === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.selectorChip,
                          isSelected && styles.selectorChipActive,
                        ]}
                        onPress={() => setFormAudience(opt.value)}
                      >
                        <Text
                          style={[
                            styles.selectorChipText,
                            isSelected && styles.selectorChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Priority Selector */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Priority Level *</Text>
                <View style={styles.selectorRow}>
                  {PRIORITY_OPTIONS.map((opt) => {
                    const isSelected = formPriority === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.selectorChip,
                          isSelected && styles.selectorChipActivePrio,
                        ]}
                        onPress={() => setFormPriority(opt.value)}
                      >
                        <Text
                          style={[
                            styles.selectorChipText,
                            isSelected && styles.selectorChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* REPEATER CONTENT BLOCKS BUILDER */}
              <View style={styles.repeaterSectionHeader}>
                <Text style={styles.repeaterSectionTitle}>
                  Announcement Content Builder ({formBlocks.length} blocks)
                </Text>
                <Text style={styles.repeaterSectionSub}>
                  Arrange images and paragraphs in any sequential order:
                </Text>
              </View>

              <View style={styles.blocksList}>
                {formBlocks.map((block, index) => (
                  <View key={block.id} style={styles.blockItemCard}>
                    {/* Block Header Toolbar */}
                    <View style={styles.blockItemHeader}>
                      <View style={styles.blockItemTypeTag}>
                        <Icon
                          name={block.type === "image" ? "image" : "clipboard"}
                          size={14}
                          color={block.type === "image" ? "#2563EB" : "#16A34A"}
                        />
                        <Text style={styles.blockItemTypeText}>
                          Block #{index + 1}:{" "}
                          {block.type === "image" ? "IMAGE" : "PARAGRAPH"}
                        </Text>
                      </View>

                      <View style={styles.blockItemControls}>
                        <TouchableOpacity
                          style={[
                            styles.reorderBtn,
                            index === 0 && styles.reorderBtnDisabled,
                          ]}
                          onPress={() => moveBlock(index, "up")}
                          disabled={index === 0}
                        >
                          <Icon name="chevron-right" size={14} color="#64748B" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.reorderBtn,
                            index === formBlocks.length - 1 &&
                              styles.reorderBtnDisabled,
                          ]}
                          onPress={() => moveBlock(index, "down")}
                          disabled={index === formBlocks.length - 1}
                        >
                          <Icon name="chevron-down" size={14} color="#64748B" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeBlockBtn}
                          onPress={() => removeBlock(block.id)}
                        >
                          <Icon name="close" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Block Body Field */}
                    {block.type === "paragraph" ? (
                      <View style={styles.blockBody}>
                        <TextInput
                          style={[styles.formInput, styles.formInputArea]}
                          placeholder={`Enter announcement text for section #${index + 1}...`}
                          placeholderTextColor="#A0AEC0"
                          value={block.text || ""}
                          onChangeText={(val) =>
                            updateBlock(block.id, { text: val })
                          }
                          multiline={true}
                          numberOfLines={4}
                          textAlignVertical="top"
                        />
                      </View>
                    ) : (
                      <View style={styles.blockBody}>
                        {block.imageUrl ? (
                          <View style={styles.blockImagePreviewBox}>
                            <Image
                              source={{ uri: block.imageUrl }}
                              style={styles.blockImagePreview}
                              contentFit="cover"
                            />
                            <TouchableOpacity
                              style={styles.changePhotoBtn}
                              onPress={() => handlePickBlockImage(block.id)}
                            >
                              <Icon name="camera" size={14} color={Colors.white} />
                              <Text style={styles.changePhotoText}>
                                Change Photo
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.blockImagePickArea}>
                            <TouchableOpacity
                              style={styles.pickPhotoBigBtn}
                              onPress={() => handlePickBlockImage(block.id)}
                            >
                              <Icon name="image" size={24} color="#2563EB" />
                              <Text style={styles.pickPhotoBigText}>
                                Choose Photo from Gallery
                              </Text>
                            </TouchableOpacity>

                            <TextInput
                              style={[styles.formInput, { marginTop: 8 }]}
                              placeholder="Or paste Image URL (http://...)"
                              placeholderTextColor="#A0AEC0"
                              value={block.imageUrl || ""}
                              onChangeText={(val) =>
                                updateBlock(block.id, { imageUrl: val })
                              }
                            />
                          </View>
                        )}

                        <TextInput
                          style={[styles.formInput, { marginTop: 8 }]}
                          placeholder="Image caption (optional)"
                          placeholderTextColor="#A0AEC0"
                          value={block.caption || ""}
                          onChangeText={(val) =>
                            updateBlock(block.id, { caption: val })
                          }
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Add Block Action Buttons */}
              <View style={styles.addBlockButtonsRow}>
                <TouchableOpacity
                  style={styles.addParagraphBtn}
                  onPress={addParagraphBlock}
                  activeOpacity={0.8}
                >
                  <Icon name="plus" size={16} color="#16A34A" />
                  <Text style={styles.addParagraphText}>
                    + Add Paragraph Block
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addImageBlockBtn}
                  onPress={addImageBlock}
                  activeOpacity={0.8}
                >
                  <Icon name="image" size={16} color="#2563EB" />
                  <Text style={styles.addImageBlockText}>
                    + Add Image Block
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Author Readonly Info */}
              <View style={styles.authorInfoBox}>
                <Icon name="profile" size={16} color="#15803D" />
                <Text style={styles.authorInfoText}>
                  Published by: {adminUser.name} ({adminUser.role})
                </Text>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View
              style={[
                styles.modalFooter,
                { paddingBottom: Math.max(insets.bottom + 14, 24) },
              ]}
            >
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setFormModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Icon name="check" size={18} color={Colors.white} />
                    <Text style={styles.modalSaveText}>
                      {editingId ? "Update Bulletin" : "Publish Announcement"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── READ ANNOUNCEMENT DETAIL MODAL ─── */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalContainer, { maxHeight: "88%" }]}>
            {selectedAnnouncement && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.detailPrioBadge}>
                    <Text style={styles.detailPrioText}>
                      {selectedAnnouncement.priority.toUpperCase()} PRIORITY
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
                  <Text style={styles.detailTitle}>
                    {selectedAnnouncement.title}
                  </Text>

                  <View style={styles.detailMetaRow}>
                    <Text style={styles.detailAudience}>
                      Audience: {getAudienceLabel(selectedAnnouncement.audience)}
                    </Text>
                    <Text style={styles.detailAuthor}>
                      By {selectedAnnouncement.authorName || selectedAnnouncement.createdBy}
                    </Text>
                  </View>

                  <View style={styles.detailDivider} />

                  {/* RENDER REPEATER BLOCKS OR FALLBACK PLAIN TEXT */}
                  {selectedAnnouncement.contentBlocks &&
                  selectedAnnouncement.contentBlocks.length > 0 ? (
                    <View style={styles.readerBlocksContainer}>
                      {selectedAnnouncement.contentBlocks.map((block, idx) => (
                        <View key={block.id || idx} style={styles.readerBlock}>
                          {block.type === "image" && block.imageUrl ? (
                            <View style={styles.readerImageBox}>
                              <Image
                                source={{ uri: block.imageUrl }}
                                style={styles.readerImage}
                                contentFit="cover"
                              />
                              {block.caption ? (
                                <Text style={styles.readerImageCaption}>
                                  📷 {block.caption}
                                </Text>
                              ) : null}
                            </View>
                          ) : block.type === "paragraph" && block.text ? (
                            <Text style={styles.readerParagraphText}>
                              {block.text}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.detailContent}>
                      {selectedAnnouncement.content}
                    </Text>
                  )}
                </ScrollView>

                <View
                  style={[
                    styles.detailFooter,
                    { paddingBottom: Math.max(insets.bottom + 14, 24) },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.detailEditBtn}
                    onPress={() => {
                      setDetailModalVisible(false);
                      openEditModal(selectedAnnouncement);
                    }}
                  >
                    <Icon name="edit" size={16} color="#15803D" />
                    <Text style={styles.detailEditText}>Edit Bulletin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detailCloseDoneBtn}
                    onPress={() => setDetailModalVisible(false)}
                  >
                    <Text style={styles.detailCloseDoneText}>Close</Text>
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
  addHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B5E20",
  },
  statsSummaryRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statSummaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  statSummaryText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: "600",
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
  audienceFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.lg,
  },
  audiencePill: {
    backgroundColor: Colors.white,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  audiencePillActive: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
  },
  audiencePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  audiencePillTextActive: {
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
  createFirstBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1B5E20",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
  },
  createFirstBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
  announcementsList: {
    gap: Spacing.md,
  },
  announcementCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.lg,
    ...Shadow.light,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  prioBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  prioBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  audienceBadge: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  audienceBadgeText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  repeaterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  repeaterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  annIdText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
    lineHeight: 22,
  },
  cardSnippet: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    marginTop: 4,
  },
  createdByText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtnEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnEditText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  actionBtnDelete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnDeleteText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },

  // ─── Modal & Form Repeater Styles ───
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  formModalContainer: {
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
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
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
  formScroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  formField: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
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
  },
  formInputArea: {
    minHeight: 90,
  },
  selectorRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  selectorChip: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  selectorChipActive: {
    backgroundColor: "#15803D",
  },
  selectorChipActivePrio: {
    backgroundColor: "#EA580C",
  },
  selectorChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  selectorChipTextActive: {
    color: Colors.white,
  },

  // ─── REPEATER BLOCK BUILDER STYLES ───
  repeaterSectionHeader: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  repeaterSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  repeaterSectionSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  blocksList: {
    gap: 12,
  },
  blockItemCard: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 16,
    padding: 12,
    ...Shadow.light,
  },
  blockItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  blockItemTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  blockItemTypeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  blockItemControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reorderBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  removeBlockBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  blockBody: {},
  blockImagePreviewBox: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    height: 160,
    backgroundColor: "#F1F5F9",
  },
  blockImagePreview: {
    width: "100%",
    height: "100%",
  },
  changePhotoBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.white,
  },
  blockImagePickArea: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pickPhotoBigBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
    paddingVertical: 14,
    borderRadius: 12,
  },
  pickPhotoBigText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  addBlockButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  addParagraphBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingVertical: 10,
    borderRadius: 12,
  },
  addParagraphText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  addImageBlockBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#93C5FD",
    paddingVertical: 10,
    borderRadius: 12,
  },
  addImageBlockText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  authorInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: Spacing.xl,
  },
  authorInfoText: {
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: "600",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  modalSaveBtn: {
    flex: 2,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#1B5E20",
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },

  // ─── Detail Reader Modal ───
  detailModalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  detailPrioBadge: {
    backgroundColor: "#FFEDD5",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  detailPrioText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EA580C",
  },
  detailScroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 28,
    marginBottom: 8,
  },
  detailMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailAudience: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "700",
  },
  detailAuthor: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 16,
  },
  detailContent: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 24,
    marginBottom: 20,
  },
  readerBlocksContainer: {
    gap: 16,
    marginBottom: 20,
  },
  readerBlock: {},
  readerImageBox: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  readerImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  readerImageCaption: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 6,
    textAlign: "center",
  },
  readerParagraphText: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 24,
  },
  detailFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  detailEditBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
  },
  detailEditText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
  },
  detailCloseDoneBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  detailCloseDoneText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
});

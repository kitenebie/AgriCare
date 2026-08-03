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

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  content: string; // Combined text string for backward compatibility / search
  contentBlocks?: ContentBlock[];
  tags: string[];
  authorId: string;
  authorName: string;
  authorRole: string;
  views: number;
  createdAt?: any;
  updatedAt?: any;
}

const CATEGORIES = [
  "All",
  "Cattle Care",
  "Poultry",
  "Goat Health",
  "Swine Care",
  "Parasite Control",
  "Emergency",
  "Breeding",
  "General",
];

const PRESET_CATEGORIES = [
  "Cattle Care",
  "Poultry",
  "Goat Health",
  "Swine Care",
  "Parasite Control",
  "Emergency",
  "Breeding",
  "General",
];

// Fallback initial articles matching requested repeater structure example:
// (image) -> (paragraph) -> (image) -> (paragraph) -> (paragraph)...
const INITIAL_MOCK_ARTICLES: KnowledgeArticle[] = [
  {
    id: "kb_001",
    title: "Pag-aalaga ng Baka: Basic Guide",
    category: "Cattle Care",
    content:
      "Ang tamang pag-aalaga ng baka ay nagsisimula sa tamang nutrisyon. Siguraduhing may sapat na malinis na tubig, sariwang damo o feeds, at bakuna laban sa karaniwang sakit katulad ng Foot and Mouth Disease (FMD). Panatilihing malinis ang sabsaban at kulungan araw-araw.",
    contentBlocks: [
      {
        id: "b1",
        type: "image",
        imageUrl:
          "https://images.unsplash.com/photo-1546445317-29f4545f9d52?auto=format&fit=crop&w=800&q=80",
        caption: "Sariwa at malusog na baka sa pastulan",
      },
      {
        id: "b2",
        type: "paragraph",
        text: "Ang tamang pag-aalaga ng baka ay nagsisimula sa tamang nutrisyon. Siguraduhing may sapat na malinis na tubig at sariwang pasture grass araw-araw.",
      },
      {
        id: "b3",
        type: "image",
        imageUrl:
          "https://images.unsplash.com/photo-1570042707222-6b3a39e80a06?auto=format&fit=crop&w=800&q=80",
        caption: "Tamang suplay ng malinis na tubig at feeds",
      },
      {
        id: "b4",
        type: "paragraph",
        text: "Mahalagang sundin ang bakuna laban sa karaniwang sakit katulad ng Foot and Mouth Disease (FMD) at Hemorrhagic Septicemia.",
      },
      {
        id: "b5",
        type: "paragraph",
        text: "Panatilihing malinis at tuyo ang kulungan o sabsaban upang maiwasan ang hoof rot at parasitismo sa tiyan ng alagang baka.",
      },
    ],
    authorId: "admin_001",
    authorName: "Admin AgriCare",
    authorRole: "admin",
    tags: ["cattle", "nutrition", "beginner"],
    views: 234,
  },
  {
    id: "kb_002",
    title: "Vaccination Schedule para sa Manok",
    category: "Poultry",
    content:
      "Ang vaccination ng manok ay dapat sundin ayon sa edad: Day 1 (Marek's disease), Day 7 (Newcastle Disease/B1), Day 14 (Gumboro Disease), Day 21 (ND-LaSota).",
    contentBlocks: [
      {
        id: "b2_1",
        type: "paragraph",
        text: "Ang vaccination ng manok ay dapat sundin ayon sa tamang edad upang maiwasan ang nakamamatay na poultry outbreaks.",
      },
      {
        id: "b2_2",
        type: "image",
        imageUrl:
          "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80",
        caption: "Poultry vaccination schedule",
      },
      {
        id: "b2_3",
        type: "paragraph",
        text: "Day 1: Marek's disease vaccine sa hatchery.\nDay 7: Newcastle Disease (ND-B1) eye drop o drinking water.\nDay 14: Gumboro Disease vaccine.",
      },
    ],
    authorId: "tech_001",
    authorName: "Pedro Santos",
    authorRole: "technician",
    tags: ["poultry", "vaccination", "schedule"],
    views: 567,
  },
];

export default function KnowledgeBaseScreen() {
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] =
    useState<KnowledgeArticle | null>(null);

  // Form State (Repeater Content Blocks)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Cattle Care");
  const [formTags, setFormTags] = useState("");
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
        collection(db, Collections.KNOWLEDGE_BASE),
        (snapshot) => {
          if (snapshot) {
            const data: KnowledgeArticle[] = snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                title: d.title || "Untitled Article",
                category: d.category || "General",
                content: d.content || "",
                contentBlocks: Array.isArray(d.contentBlocks)
                  ? d.contentBlocks
                  : undefined,
                tags: Array.isArray(d.tags) ? d.tags : [],
                authorId: d.authorId || "admin_001",
                authorName: d.authorName || "Admin AgriCare",
                authorRole: d.authorRole || "admin",
                views: d.views || 0,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
              };
            });
            setArticles(data);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore knowledgeBase listen error:", error.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.warn("onSnapshot setup error:", err.message);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // ─── Filtered Articles ───
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesCategory =
        selectedCategory === "All" || art.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.content.toLowerCase().includes(q) ||
        art.category.toLowerCase().includes(q) ||
        art.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [articles, selectedCategory, searchQuery]);

  const totalViews = useMemo(
    () => articles.reduce((sum, a) => sum + (a.views || 0), 0),
    [articles]
  );

  // ─── Form Repeater Block Handlers ───
  const resetForm = () => {
    setFormTitle("");
    setFormCategory("Cattle Care");
    setFormTags("");
    // Default initial template: image -> paragraph -> image -> paragraph
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
        "Article must contain at least one content block."
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

  // Pick Image for Block using ImagePicker
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
      // Fallback sample image
      const sample =
        "https://images.unsplash.com/photo-1546445317-29f4545f9d52?auto=format&fit=crop&w=800&q=80";
      updateBlock(blockId, { imageUrl: sample });
    }
  };

  // Upload local image URI to Firebase Storage
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

  const openEditModal = (art: KnowledgeArticle) => {
    setEditingId(art.id);
    setFormTitle(art.title);
    setFormCategory(art.category || "Cattle Care");
    setFormTags(art.tags ? art.tags.join(", ") : "");

    if (art.contentBlocks && art.contentBlocks.length > 0) {
      setFormBlocks(art.contentBlocks);
    } else {
      // Fallback: convert plain content string into 1 paragraph block
      setFormBlocks([
        {
          id: Date.now().toString(),
          type: "paragraph",
          text: art.content,
        },
      ]);
    }
    setFormModalVisible(true);
  };

  const openDetailModal = async (art: KnowledgeArticle) => {
    setSelectedArticle(art);
    setDetailModalVisible(true);

    // Increment view count in Firestore
    try {
      if (art.id.startsWith("kb_")) {
        setArticles((prev) =>
          prev.map((a) => (a.id === art.id ? { ...a, views: a.views + 1 } : a))
        );
      }
      await firestore()
        .collection(Collections.KNOWLEDGE_BASE)
        .doc(art.id)
        .update({
          views: firestore.FieldValue.increment(1),
        });
    } catch (e) {}
  };

  // ─── Save Article Handler ───
  const handleSave = async () => {
    if (!formTitle.trim()) {
      Alert.alert("Required Field", "Please enter an article title.");
      return;
    }

    // Process blocks & upload images
    setSaving(true);

    try {
      const processedBlocks: ContentBlock[] = [];
      for (const block of formBlocks) {
        if (block.type === "image" && block.imageUrl) {
          const uploadedUrl = await uploadToStorage(
            block.imageUrl,
            "kb_article_images"
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

      // Combine paragraph texts for plain text search / snippet compatibility
      const combinedContent = processedBlocks
        .filter((b) => b.type === "paragraph" && b.text)
        .map((b) => b.text)
        .join("\n\n");

      const tagsArray = formTags
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
        .filter((t) => t.length > 0);

      if (editingId) {
        // Update existing article
        await firestore()
          .collection(Collections.KNOWLEDGE_BASE)
          .doc(editingId)
          .update({
            title: formTitle.trim(),
            category: formCategory,
            content: combinedContent,
            contentBlocks: processedBlocks,
            tags: tagsArray,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });

        setArticles((prev) =>
          prev.map((a) =>
            a.id === editingId
              ? {
                  ...a,
                  title: formTitle.trim(),
                  category: formCategory,
                  content: combinedContent,
                  contentBlocks: processedBlocks,
                  tags: tagsArray,
                }
              : a
          )
        );
      } else {
        // Create new article
        const newDocRef = firestore()
          .collection(Collections.KNOWLEDGE_BASE)
          .doc();

        const newArticle: KnowledgeArticle = {
          id: newDocRef.id,
          title: formTitle.trim(),
          category: formCategory,
          content: combinedContent,
          contentBlocks: processedBlocks,
          tags: tagsArray,
          authorId: adminUser.id,
          authorName: adminUser.name,
          authorRole: adminUser.role,
          views: 0,
        };

        await newDocRef.set({
          ...newArticle,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        setArticles((prev) => [newArticle, ...prev]);
      }

      setFormModalVisible(false);
      resetForm();
      Alert.alert("Success", "Article saved successfully!");
    } catch (error: any) {
      console.error("Save article error:", error);
      Alert.alert("Error", error.message || "Failed to save article.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Article
  const handleDelete = (art: KnowledgeArticle) => {
    Alert.alert(
      "Delete Article",
      `Are you sure you want to delete "${art.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await firestore()
                .collection(Collections.KNOWLEDGE_BASE)
                .doc(art.id)
                .delete();

              setArticles((prev) => prev.filter((a) => a.id !== art.id));
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete.");
            }
          },
        },
      ]
    );
  };

  // Category Color Map
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Cattle Care":
        return { bg: "#E2F7E2", text: "#2E7D32" };
      case "Poultry":
        return { bg: "#FFF3CD", text: "#D97706" };
      case "Goat Health":
        return { bg: "#E0F7FA", text: "#00897B" };
      case "Swine Care":
        return { bg: "#FCE4EC", text: "#C2185B" };
      case "Parasite Control":
        return { bg: "#E8EAF6", text: "#3F51B5" };
      case "Emergency":
        return { bg: "#FFEBEE", text: "#E53935" };
      case "Breeding":
        return { bg: "#F3E5F5", text: "#8E24AA" };
      default:
        return { bg: "#F1F5F9", text: "#475569" };
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

          <Text style={styles.headerTitle}>Knowledge Base</Text>

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
            <Icon name="clipboard" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.statSummaryText}>
              {articles.length} Articles
            </Text>
          </View>
          <View style={styles.statSummaryPill}>
            <Icon name="star" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.statSummaryText}>{totalViews} Total Views</Text>
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
            placeholder="Search guides, tags, keywords..."
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

        {/* Category Horizontal Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Loading Indicator */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>Loading articles...</Text>
          </View>
        ) : filteredArticles.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <Icon name="clipboard" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Articles Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No matches for "${searchQuery}"`
                : "No knowledge base articles created yet."}
            </Text>
            <TouchableOpacity
              style={styles.createFirstBtn}
              onPress={openCreateModal}
            >
              <Icon name="plus" size={18} color={Colors.white} />
              <Text style={styles.createFirstBtnText}>Create First Article</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Articles List */
          <View style={styles.articleList}>
            {filteredArticles.map((article) => {
              const catStyle = getCategoryColor(article.category);
              const hasBlocks =
                article.contentBlocks && article.contentBlocks.length > 0;

              return (
                <TouchableOpacity
                  key={article.id}
                  style={styles.articleCard}
                  onPress={() => openDetailModal(article)}
                  activeOpacity={0.8}
                >
                  {/* Top Badge & Info Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View
                        style={[
                          styles.catBadge,
                          { backgroundColor: catStyle.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.catBadgeText,
                            { color: catStyle.text },
                          ]}
                        >
                          {article.category}
                        </Text>
                      </View>
                      <View style={styles.authorTag}>
                        <Text style={styles.authorTagText}>
                          {article.authorName} ({article.authorRole})
                        </Text>
                      </View>
                      {hasBlocks && (
                        <View style={styles.repeaterBadge}>
                          <Icon name="image" size={12} color="#1D4ED8" />
                          <Text style={styles.repeaterBadgeText}>
                            {article.contentBlocks?.length} blocks
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.viewsBadge}>
                      <Icon name="clock" size={13} color="#718096" />
                      <Text style={styles.viewsText}>{article.views} views</Text>
                    </View>
                  </View>

                  {/* Article Title */}
                  <Text style={styles.articleTitle}>{article.title}</Text>

                  {/* Article Snippet */}
                  <Text style={styles.articleSnippet} numberOfLines={2}>
                    {article.content}
                  </Text>

                  {/* Tags */}
                  {article.tags && article.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                      {article.tags.map((tag, idx) => (
                        <View key={idx} style={styles.tagChip}>
                          <Text style={styles.tagChipText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Card Bottom Actions */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.articleIdText}>ID: {article.id}</Text>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionBtnEdit}
                        onPress={() => openEditModal(article)}
                        activeOpacity={0.7}
                      >
                        <Icon name="edit" size={15} color="#2563EB" />
                        <Text style={styles.actionBtnEditText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnDelete}
                        onPress={() => handleDelete(article)}
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

      {/* ─── ADD / EDIT ARTICLE MODAL (REPEATER BUILDER FORM) ─── */}
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
                {editingId ? "Edit Article" : "Create New Article"}
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
                <Text style={styles.formLabel}>Article Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Pag-aalaga ng Baka: Basic Guide"
                  placeholderTextColor="#A0AEC0"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />
              </View>

              {/* Category Field */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Category *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.formCatScroll}
                >
                  {PRESET_CATEGORIES.map((cat) => {
                    const isSelected = formCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.formCatPill,
                          isSelected && styles.formCatPillActive,
                        ]}
                        onPress={() => setFormCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.formCatPillText,
                            isSelected && styles.formCatPillTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* REPEATER CONTENT BLOCKS BUILDER */}
              <View style={styles.repeaterSectionHeader}>
                <Text style={styles.repeaterSectionTitle}>
                  Article Content Builder ({formBlocks.length} blocks)
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
                          placeholder={`Enter paragraph text for section #${index + 1}...`}
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

              {/* Tags Field */}
              <View style={[styles.formField, { marginTop: 16 }]}>
                <Text style={styles.formLabel}>Tags (comma separated)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. cattle, nutrition, beginner"
                  placeholderTextColor="#A0AEC0"
                  value={formTags}
                  onChangeText={setFormTags}
                />
              </View>

              {/* Author Info */}
              <View style={styles.authorInfoBox}>
                <Icon name="profile" size={16} color="#15803D" />
                <Text style={styles.authorInfoText}>
                  Author: {adminUser.name} ({adminUser.role})
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
                      {editingId ? "Update Article" : "Save Article"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── READ ARTICLE DETAIL MODAL ─── */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalContainer, { maxHeight: "88%" }]}>
            {selectedArticle && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.detailCatPill}>
                    <Text style={styles.detailCatText}>
                      {selectedArticle.category}
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
                    {selectedArticle.title}
                  </Text>

                  <View style={styles.detailMetaRow}>
                    <Text style={styles.detailAuthor}>
                      By {selectedArticle.authorName} ({selectedArticle.authorRole})
                    </Text>
                    <Text style={styles.detailViews}>
                      👁 {selectedArticle.views} views
                    </Text>
                  </View>

                  <View style={styles.detailDivider} />

                  {/* RENDER REPEATER BLOCKS OR FALLBACK PLAIN TEXT */}
                  {selectedArticle.contentBlocks &&
                  selectedArticle.contentBlocks.length > 0 ? (
                    <View style={styles.readerBlocksContainer}>
                      {selectedArticle.contentBlocks.map((block, idx) => (
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
                      {selectedArticle.content}
                    </Text>
                  )}

                  {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                    <View style={styles.detailTagsBox}>
                      <Text style={styles.detailTagsLabel}>Tags:</Text>
                      <View style={styles.tagsRow}>
                        {selectedArticle.tags.map((t, idx) => (
                          <View key={idx} style={styles.tagChip}>
                            <Text style={styles.tagChipText}>#{t}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
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
                      openEditModal(selectedArticle);
                    }}
                  >
                    <Icon name="edit" size={16} color="#15803D" />
                    <Text style={styles.detailEditText}>Edit Article</Text>
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
  categoryScroll: {
    marginBottom: Spacing.lg,
  },
  categoryScrollContent: {
    gap: 8,
  },
  categoryPill: {
    backgroundColor: Colors.white,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryPillActive: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  categoryPillTextActive: {
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
  articleList: {
    gap: Spacing.md,
  },
  articleCard: {
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
  catBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  authorTag: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  authorTagText: {
    fontSize: 11,
    color: "#64748B",
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
  viewsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewsText: {
    fontSize: 11,
    color: "#718096",
    fontWeight: "500",
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
    lineHeight: 22,
  },
  articleSnippet: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tagChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
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
  articleIdText: {
    fontSize: 11,
    color: "#94A3B8",
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
  formCatScroll: {
    flexDirection: "row",
  },
  formCatPill: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 6,
  },
  formCatPillActive: {
    backgroundColor: "#15803D",
  },
  formCatPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  formCatPillTextActive: {
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

  // ─── Detail Reader Modal & Sequential Blocks Reader ───
  detailModalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  detailCatPill: {
    backgroundColor: "#E2F7E2",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  detailCatText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
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
  detailAuthor: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  detailViews: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
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
  detailTagsBox: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
    marginBottom: 20,
  },
  detailTagsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
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

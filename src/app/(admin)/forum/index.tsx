import { Icon, Avatar } from "@/components/ui";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { Collections } from "@/services/firebase";
import { getCurrentUserProfile } from "@/services/authService";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
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

export interface ForumReply {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "none";
  createdAt?: any;
}

export interface ForumPost {
  id: string;
  title: string;
  category: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  likes: number;
  replies: number;
  views: number;
  status: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "none";
  likedBy?: string[];
  createdAt?: any;
  updatedAt?: any;
}

const CATEGORIES = [
  "All",
  "Cattle",
  "Swine",
  "Poultry",
  "Goat",
  "Health Tips",
  "General",
];

const PRESET_CATEGORIES = [
  "Cattle",
  "Swine",
  "Poultry",
  "Goat",
  "Health Tips",
  "General",
];

// Fallback initial data matching DB screenshot
const INITIAL_MOCK_POSTS: ForumPost[] = [
  {
    id: "forum_001",
    title: "Paano malalaman kung buntis ang baka?",
    category: "Cattle",
    content:
      "Mga tips po sana para malaman kung buntis na ang baka ko matapos ang AI (artificial insemination) dalawang buwan na ang nakararaan. Walang signs ng landi muli. Ano ang mga karaniwang sintomas?",
    authorId: "farmer_001",
    authorName: "Juan Dela Cruz",
    authorRole: "farmer",
    likes: 12,
    replies: 5,
    views: 89,
    status: "active",
    mediaUrl:
      "https://images.unsplash.com/photo-1546445317-29f4545f9d52?auto=format&fit=crop&w=800&q=80",
    mediaType: "image",
  },
  {
    id: "forum_002",
    title: "Tamang Feed Formulation para sa Baboy",
    category: "Swine",
    content:
      "Sharing ko lang ang formula na ginagamit ko para sa growing pigs: Corn 55%, Soybean meal 25%, Rice bran 15%, Vitamin & Mineral premix 5%. Maganda ang weight gain ng mga alaga sa Bulacan farm natin.",
    authorId: "tech_001",
    authorName: "Pedro Santos",
    authorRole: "technician",
    likes: 25,
    replies: 8,
    views: 156,
    status: "active",
  },
  {
    id: "forum_003",
    title: "May alam ba kayong magaling na tech sa Angat?",
    category: "General",
    content:
      "Need ko po ng technician na available this week para sa goat ko na may hinalang parasite infection. Paki-contact po ako o paki-refer ang magaling na vet tech.",
    authorId: "farmer_002",
    authorName: "Maria Garcia",
    authorRole: "farmer",
    likes: 3,
    replies: 4,
    views: 45,
    status: "active",
  },
  {
    id: "forum_004",
    title: "Common Signs ng Dehydration sa Livestock",
    category: "Health Tips",
    content:
      "Ito ang mga dapat bantayan lalo na sa tag-init: nanunuyong ilong, panghihina, hindi kumakain, at mabagal na skin pinch test. Panatilihing may malinis na tubig na may electrolytes.",
    authorId: "tech_003",
    authorName: "Mark Dela Cruz",
    authorRole: "technician",
    likes: 34,
    replies: 12,
    views: 234,
    status: "active",
    mediaUrl:
      "https://images.unsplash.com/photo-1570042707222-6b3a39e80a06?auto=format&fit=crop&w=800&q=80",
    mediaType: "image",
  },
  {
    id: "forum_005",
    title: "Best breed ng manok for egg production?",
    category: "Poultry",
    content:
      "Planning to expand yung poultry ko sa San Ildefonso. Any recommendations sa pagitan ng Rhode Island Red at Cobb 500 for egg laying capability?",
    authorId: "farmer_004",
    authorName: "Lorna Santos",
    authorRole: "farmer",
    likes: 8,
    replies: 6,
    views: 67,
    status: "active",
  },
];

const INITIAL_MOCK_REPLIES: Record<string, ForumReply[]> = {
  forum_001: [
    {
      id: "rep_001",
      authorId: "tech_001",
      authorName: "Pedro Santos",
      authorRole: "technician",
      content:
        "Magandang araw Juan! Kapag 60 days na matapos mag-AI at walang palatandaan ng paglalandi, malaking posibilidad na buntis ito. Pwede rin ipa-rectal palpation sa lisensyadong technician para makasiguro.",
    },
    {
      id: "rep_002",
      authorId: "farmer_003",
      authorName: "Jose Rivera",
      authorRole: "farmer",
      content:
        "Salamat sa tanong mo! Sa karanasan ko, tumataba rin ang tiyan sa kanang bahagi pagtuntong ng 3-4 months.",
    },
  ],
};

export default function ForumPage() {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [threadModalVisible, setThreadModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  // Form State (New Post)
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Cattle");
  const [formContent, setFormContent] = useState("");
  const [formMediaUrl, setFormMediaUrl] = useState<string | null>(null);
  const [formMediaType, setFormMediaType] = useState<
    "image" | "video" | "none"
  >("none");
  const [submitting, setSubmitting] = useState(false);

  // Reply Form State
  const [replyText, setReplyText] = useState("");
  const [replyMediaUrl, setReplyMediaUrl] = useState<string | null>(null);
  const [replyMediaType, setReplyMediaType] = useState<
    "image" | "video" | "none"
  >("none");
  const [sendingReply, setSendingReply] = useState(false);

  // Current admin user info
  const [currentUser, setCurrentUser] = useState({
    id: "admin_001",
    name: "Admin AgriCare",
    role: "admin",
  });

  useEffect(() => {
    const loadProfile = async () => {
      const profile: any = await getCurrentUserProfile();
      if (profile) {
        setCurrentUser({
          id: profile.id || profile.uid || "admin_001",
          name: profile.displayName || profile.name || "Admin AgriCare",
          role: profile.role || "admin",
        });
      }
    };
    loadProfile();
  }, []);

  // ─── Realtime Firestore Listener ───
  useEffect(() => {
    const unsubscribe = firestore()
      .collection(Collections.COMMUNITY_FORUM)
      .onSnapshot(
        (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const fetchedPosts: ForumPost[] = snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                title: d.title || "Untitled Post",
                category: d.category || "General",
                content: d.content || "",
                authorId: d.authorId || "farmer_001",
                authorName: d.authorName || "Anonymous User",
                authorRole: d.authorRole || "farmer",
                likes: d.likes || 0,
                replies: d.replies || 0,
                views: d.views || 0,
                status: d.status || "active",
                mediaUrl: d.mediaUrl || undefined,
                mediaType: d.mediaType || "none",
                likedBy: d.likedBy || [],
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
              };
            });
            setPosts(fetchedPosts);
          } else {
            setPosts([]);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore forum listen error:", error.message);
          setPosts([]);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  // ─── Filtered Posts ───
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [posts, selectedCategory, searchQuery]);

  // Total summary stats
  const totalReplies = useMemo(
    () => posts.reduce((sum, p) => sum + (p.replies || 0), 0),
    [posts]
  );
  const totalLikes = useMemo(
    () => posts.reduce((sum, p) => sum + (p.likes || 0), 0),
    [posts]
  );

  // ─── Pick Image / Video Handler ───
  const handlePickMedia = async (
    target: "post" | "reply",
    type: "image" | "video"
  ) => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Permission to access media library is required."
        );
        return;
      }

      const mediaTypes =
        type === "image"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: type === "image",
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        const localUri = pickedAsset.uri;

        if (target === "post") {
          setFormMediaUrl(localUri);
          setFormMediaType(type);
        } else {
          setReplyMediaUrl(localUri);
          setReplyMediaType(type);
        }
      }
    } catch (e: any) {
      console.warn("Media picker error:", e.message);
      // Fallback sample image for demo if simulator file picker is restricted
      const sampleUrl =
        type === "image"
          ? "https://images.unsplash.com/photo-1546445317-29f4545f9d52?auto=format&fit=crop&w=800&q=80"
          : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

      if (target === "post") {
        setFormMediaUrl(sampleUrl);
        setFormMediaType(type);
      } else {
        setReplyMediaUrl(sampleUrl);
        setReplyMediaType(type);
      }
    }
  };

  // ─── Upload Local File to Firebase Storage ───
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
      console.warn("Storage upload fallback to URI:", e);
      return localUri;
    }
  };

  // ─── Reset Post Form ───
  const resetForm = () => {
    setFormTitle("");
    setFormCategory("Cattle");
    setFormContent("");
    setFormMediaUrl(null);
    setFormMediaType("none");
  };

  // ─── Create New Post Handler ───
  const handleCreatePost = async () => {
    if (!formTitle.trim()) {
      Alert.alert("Required Field", "Please enter a discussion title.");
      return;
    }
    if (!formContent.trim()) {
      Alert.alert("Required Field", "Please enter discussion content.");
      return;
    }

    setSubmitting(true);

    try {
      let finalMediaUrl = undefined;
      if (formMediaUrl) {
        finalMediaUrl = await uploadToStorage(formMediaUrl, "forum_media");
      }

      const newDocRef = firestore()
        .collection(Collections.COMMUNITY_FORUM)
        .doc();

      const newPost: ForumPost = {
        id: newDocRef.id,
        title: formTitle.trim(),
        category: formCategory,
        content: formContent.trim(),
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        likes: 0,
        replies: 0,
        views: 0,
        status: "active",
        mediaUrl: finalMediaUrl,
        mediaType: formMediaType,
        likedBy: [],
      };

      await newDocRef.set({
        ...newPost,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Update local state for immediate feedback
      setPosts((prev) => [newPost, ...prev]);
      setCreateModalVisible(false);
      resetForm();
      Alert.alert("Success", "Discussion post published successfully!");
    } catch (error: any) {
      console.error("Create post error:", error);
      Alert.alert("Error", error.message || "Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Open Thread / View Replies ───
  const openThreadModal = async (post: ForumPost) => {
    setSelectedPost(post);
    setThreadModalVisible(true);
    setLoadingReplies(true);

    // Increment views
    try {
      firestore()
        .collection(Collections.COMMUNITY_FORUM)
        .doc(post.id)
        .update({ views: firestore.FieldValue.increment(1) });
    } catch (e) {}

    // Load replies from Firestore subcollection or mock
    try {
      const snapshot = await firestore()
        .collection(Collections.COMMUNITY_FORUM)
        .doc(post.id)
        .collection("replies")
        .orderBy("createdAt", "asc")
        .get();

      if (snapshot && !snapshot.empty) {
        const fetchedReplies: ForumReply[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ForumReply[];
        setReplies(fetchedReplies);
      } else {
        setReplies([]);
      }
    } catch (error) {
      setReplies([]);
    } finally {
      setLoadingReplies(false);
    }
  };

  // ─── Submit Reply Handler ───
  const handleSendReply = async () => {
    if (!replyText.trim() && !replyMediaUrl) {
      Alert.alert("Empty Reply", "Please enter a message or attach media.");
      return;
    }
    if (!selectedPost) return;

    setSendingReply(true);

    try {
      let finalMediaUrl = undefined;
      if (replyMediaUrl) {
        finalMediaUrl = await uploadToStorage(
          replyMediaUrl,
          "forum_reply_media"
        );
      }

      const postRef = firestore()
        .collection(Collections.COMMUNITY_FORUM)
        .doc(selectedPost.id);

      const replyRef = postRef.collection("replies").doc();

      const newReply: ForumReply = {
        id: replyRef.id,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        content: replyText.trim(),
        mediaUrl: finalMediaUrl,
        mediaType: replyMediaType,
      };

      await replyRef.set({
        ...newReply,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Update reply count on main post
      await postRef.update({
        replies: firestore.FieldValue.increment(1),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Local state update
      setReplies((prev) => [...prev, newReply]);
      setSelectedPost((prev) =>
        prev ? { ...prev, replies: (prev.replies || 0) + 1 } : null
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id ? { ...p, replies: p.replies + 1 } : p
        )
      );

      setReplyText("");
      setReplyMediaUrl(null);
      setReplyMediaType("none");
    } catch (error: any) {
      console.error("Send reply error:", error);
      Alert.alert("Error", error.message || "Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  };

  // ─── Edit Reply ───
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');

  const startEditReply = (reply: ForumReply) => {
    setEditingReplyId(reply.id);
    setEditReplyText(reply.content);
  };

  const handleUpdateReply = async () => {
    if (!editReplyText.trim() || !selectedPost || !editingReplyId) return;
    try {
      await firestore()
        .collection(Collections.COMMUNITY_FORUM)
        .doc(selectedPost.id)
        .collection('replies')
        .doc(editingReplyId)
        .update({
          content: editReplyText.trim(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      setReplies((prev) =>
        prev.map((r) => r.id === editingReplyId ? { ...r, content: editReplyText.trim() } : r)
      );
      setEditingReplyId(null);
      setEditReplyText('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update reply.');
    }
  };

  const cancelEditReply = () => {
    setEditingReplyId(null);
    setEditReplyText('');
  };

  // ─── Delete Reply ───
  const handleDeleteReply = (replyId: string) => {
    if (!selectedPost) return;
    Alert.alert('Delete Reply', 'Are you sure you want to delete this reply?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore()
              .collection(Collections.COMMUNITY_FORUM)
              .doc(selectedPost.id)
              .collection('replies')
              .doc(replyId)
              .delete();
            setReplies((prev) => prev.filter((r) => r.id !== replyId));
            // Decrement reply count
            await firestore()
              .collection(Collections.COMMUNITY_FORUM)
              .doc(selectedPost.id)
              .update({ replies: firestore.FieldValue.increment(-1) });
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete reply.');
          }
        },
      },
    ]);
  };


  // ─── Toggle Like Handler ───
  const handleToggleLike = async (post: ForumPost) => {
    const isLiked = post.likedBy?.includes(currentUser.id);
    const newLikes = isLiked
      ? Math.max(0, post.likes - 1)
      : post.likes + 1;
    const newLikedBy = isLiked
      ? (post.likedBy || []).filter((id) => id !== currentUser.id)
      : [...(post.likedBy || []), currentUser.id];

    // Immediate UI update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, likes: newLikes, likedBy: newLikedBy } : p
      )
    );
    if (selectedPost && selectedPost.id === post.id) {
      setSelectedPost((prev) =>
        prev ? { ...prev, likes: newLikes, likedBy: newLikedBy } : null
      );
    }

    try {
      await firestore()
        .collection(Collections.COMMUNITY_FORUM)
        .doc(post.id)
        .update({
          likes: isLiked
            ? firestore.FieldValue.increment(-1)
            : firestore.FieldValue.increment(1),
          likedBy: isLiked
            ? firestore.FieldValue.arrayRemove(currentUser.id)
            : firestore.FieldValue.arrayUnion(currentUser.id),
          replyActions: {
    marginTop: 8,
  },
  replyActionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  replyActionText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  editReplyRow: {
    marginTop: 6,
  },
  editReplyInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 40,
    marginBottom: 6,
  },
  editSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  editSaveBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  editCancelText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
    } catch (e) {}
  };

  // ─── Delete Post (Admin Moderate) ───
  const handleDeletePost = (post: ForumPost) => {
    Alert.alert(
      "Delete Post",
      `Are you sure you want to delete post "${post.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await firestore()
                .collection(Collections.COMMUNITY_FORUM)
                .doc(post.id)
                .delete();

              setPosts((prev) => prev.filter((p) => p.id !== post.id));
              if (selectedPost?.id === post.id) {
                setThreadModalVisible(false);
              }
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to delete.");
            }
          },
        },
      ]
    );
  };

  // Role Badge Styling Helper
  const getRoleStyle = (role: string) => {
    switch (role) {
      case "admin":
        return { bg: "#DCFCE7", text: "#15803D", label: "Admin" };
      case "technician":
        return { bg: "#E0F2FE", text: "#0369A1", label: "Technician" };
      default:
        return { bg: "#FEF3C7", text: "#B45309", label: "Farmer" };
    }
  };

  return (
    <View style={styles.container}>
      {/* Green Header */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 12, 44) }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Community Forum</Text>
            <Text style={styles.headerSubtitle}>
              Moderate & participate in farmer discussions
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newPostHeaderBtn}
            onPress={() => {
              resetForm();
              setCreateModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Icon name="plus" size={16} color="#1B5E20" strokeWidth={2.5} />
            <Text style={styles.newPostBtnText}>New Post</Text>
          </TouchableOpacity>
        </View>

        {/* Header Stats Bar */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Icon name="messages" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.statPillText}>{posts.length} Posts</Text>
          </View>
          <View style={styles.statPill}>
            <Icon name="messages-square" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.statPillText}>{totalReplies} Replies</Text>
          </View>
          <View style={styles.statPill}>
            <Icon name="thumbs-up" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.statPillText}>{totalLikes} Likes</Text>
          </View>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 80, 100),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={18} color="#718096" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search discussions, topics, authors..."
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
            <Text style={styles.loadingText}>Loading forum posts...</Text>
          </View>
        ) : filteredPosts.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <Icon name="messages" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Posts Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No results for "${searchQuery}"`
                : "No community discussions available."}
            </Text>
            <TouchableOpacity
              style={styles.createFirstBtn}
              onPress={() => {
                resetForm();
                setCreateModalVisible(true);
              }}
            >
              <Icon name="plus" size={18} color={Colors.white} />
              <Text style={styles.createFirstBtnText}>Create New Post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Posts List */
          <View style={styles.postsList}>
            {filteredPosts.map((post) => {
              const roleStyle = getRoleStyle(post.authorRole);
              const isLiked = post.likedBy?.includes(currentUser.id);

              return (
                <View key={post.id} style={styles.postCard}>
                  {/* Post Header: Avatar, Author, Category */}
                  <View style={styles.postHeader}>
                    <Avatar name={post.authorName} size={40} />
                    <View style={styles.postHeaderMeta}>
                      <View style={styles.authorRow}>
                        <Text style={styles.authorName}>{post.authorName}</Text>
                        <View
                          style={[
                            styles.roleBadge,
                            { backgroundColor: roleStyle.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleBadgeText,
                              { color: roleStyle.text },
                            ]}
                          >
                            {roleStyle.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.categorySub}>
                        Category: {post.category}
                      </Text>
                    </View>
                  </View>

                  {/* Post Title & Body Content */}
                  <TouchableOpacity
                    onPress={() => openThreadModal(post)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postContentSnippet} numberOfLines={3}>
                      {post.content}
                    </Text>
                  </TouchableOpacity>

                  {/* Media Preview Box (If image/video attached) */}
                  {post.mediaUrl && (
                    <TouchableOpacity
                      style={styles.mediaContainer}
                      onPress={() => openThreadModal(post)}
                      activeOpacity={0.9}
                    >
                      {post.mediaType === "video" ? (
                        <View style={styles.videoThumbnailBox}>
                          <Image
                            source={{ uri: post.mediaUrl }}
                            style={styles.mediaImage}
                            contentFit="cover"
                          />
                          <View style={styles.playIconOverlay}>
                            <Icon name="play" size={28} color={Colors.white} />
                          </View>
                          <View style={styles.videoBadge}>
                            <Icon name="video" size={12} color={Colors.white} />
                            <Text style={styles.videoBadgeText}>Video</Text>
                          </View>
                        </View>
                      ) : (
                        <Image
                          source={{ uri: post.mediaUrl }}
                          style={styles.mediaImage}
                          contentFit="cover"
                        />
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Post Footer Actions */}
                  <View style={styles.postFooter}>
                    <View style={styles.postFooterStats}>
                      <TouchableOpacity
                        style={[
                          styles.actionPillBtn,
                          isLiked && styles.actionPillBtnLiked,
                        ]}
                        onPress={() => handleToggleLike(post)}
                      >
                        <Icon
                          name="thumbs-up"
                          size={15}
                          color={isLiked ? "#15803D" : "#64748B"}
                        />
                        <Text
                          style={[
                            styles.actionPillText,
                            isLiked && styles.actionPillTextLiked,
                          ]}
                        >
                          {post.likes} Likes
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionPillBtn}
                        onPress={() => openThreadModal(post)}
                      >
                        <Icon name="messages-square" size={15} color="#64748B" />
                        <Text style={styles.actionPillText}>
                          {post.replies} Replies
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.deletePostBtn}
                      onPress={() => handleDeletePost(post)}
                    >
                      <Icon name="trash" size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ─── CREATE NEW POST MODAL (FORM) ─── */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Create New Forum Post</Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Title Input */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Discussion Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Paano malalaman kung buntis ang baka?"
                  placeholderTextColor="#A0AEC0"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />
              </View>

              {/* Category Selector */}
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

              {/* Content Input */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Discussion Details *</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputArea]}
                  placeholder="Share details, ask questions, or share tips with the community..."
                  placeholderTextColor="#A0AEC0"
                  value={formContent}
                  onChangeText={setFormContent}
                  multiline={true}
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              {/* Media Attachment Field (Image/Video Upload) */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Attach Image / Video</Text>

                {formMediaUrl ? (
                  /* Media Preview Box */
                  <View style={styles.formMediaPreviewBox}>
                    {formMediaType === "video" ? (
                      <View style={styles.previewVideoPlaceholder}>
                        <Icon name="video" size={32} color="#1B5E20" />
                        <Text style={styles.previewVideoText}>
                          Video Attached
                        </Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: formMediaUrl }}
                        style={styles.previewImage}
                        contentFit="cover"
                      />
                    )}
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() => {
                        setFormMediaUrl(null);
                        setFormMediaType("none");
                      }}
                    >
                      <Icon name="close" size={16} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Pick Buttons */
                  <View style={styles.mediaPickRow}>
                    <TouchableOpacity
                      style={styles.mediaPickBtn}
                      onPress={() => handlePickMedia("post", "image")}
                    >
                      <Icon name="image" size={20} color="#16A34A" />
                      <Text style={styles.mediaPickBtnText}>Add Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mediaPickBtn}
                      onPress={() => handlePickMedia("post", "video")}
                    >
                      <Icon name="video" size={20} color="#2563EB" />
                      <Text style={styles.mediaPickBtnText}>Add Video</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Author Readonly Info */}
              <View style={styles.authorInfoBox}>
                <Icon name="profile" size={16} color="#15803D" />
                <Text style={styles.authorInfoText}>
                  Posting as: {currentUser.name} ({currentUser.role})
                </Text>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View
              style={[
                styles.modalFooter,
                { paddingBottom: Math.max(insets.bottom + 14, 24) },
              ]}
            >
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleCreatePost}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Icon name="send" size={16} color={Colors.white} />
                    <Text style={styles.modalSaveText}>Publish Post</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── DISCUSSION THREAD & REPLIES MODAL ─── */}
      <Modal
        visible={threadModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setThreadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.threadModalContainer, { maxHeight: "90%" }]}
          >
            {selectedPost && (
              <>
                {/* Thread Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.threadHeaderLeft}>
                    <Text style={styles.threadHeaderTitle}>
                      Discussion Thread
                    </Text>
                    <View style={styles.catBadgeSmall}>
                      <Text style={styles.catBadgeSmallText}>
                        {selectedPost.category}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => setThreadModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Icon name="close" size={20} color="#475569" />
                  </TouchableOpacity>
                </View>

                {/* Thread Body & Replies Scroll View */}
                <ScrollView
                  style={styles.threadScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Main Original Post Details */}
                  <View style={styles.originalPostBox}>
                    <View style={styles.postHeader}>
                      <Avatar name={selectedPost.authorName} size={42} />
                      <View style={styles.postHeaderMeta}>
                        <View style={styles.authorRow}>
                          <Text style={styles.authorName}>
                            {selectedPost.authorName}
                          </Text>
                          <View
                            style={[
                              styles.roleBadge,
                              {
                                backgroundColor: getRoleStyle(
                                  selectedPost.authorRole
                                ).bg,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.roleBadgeText,
                                {
                                  color: getRoleStyle(
                                    selectedPost.authorRole
                                  ).text,
                                },
                              ]}
                            >
                              {getRoleStyle(selectedPost.authorRole).label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.categorySub}>
                          Category: {selectedPost.category} • {selectedPost.views}{" "}
                          views
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.threadDetailTitle}>
                      {selectedPost.title}
                    </Text>
                    <Text style={styles.threadDetailContent}>
                      {selectedPost.content}
                    </Text>

                    {/* Attached Media in Main Post */}
                    {selectedPost.mediaUrl && (
                      <View style={styles.threadMediaBox}>
                        {selectedPost.mediaType === "video" ? (
                          <View style={styles.videoPlayerPlaceholder}>
                            <Icon name="video" size={40} color={Colors.white} />
                            <Text style={styles.videoPlayerText}>
                              Video Player (Tap to play)
                            </Text>
                          </View>
                        ) : (
                          <Image
                            source={{ uri: selectedPost.mediaUrl }}
                            style={styles.threadMediaImage}
                            contentFit="cover"
                          />
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.repliesSectionDivider}>
                    <Text style={styles.repliesSectionTitle}>
                      Replies ({replies.length})
                    </Text>
                  </View>

                  {/* Replies List */}
                  {loadingReplies ? (
                    <ActivityIndicator
                      size="small"
                      color="#1B5E20"
                      style={{ marginVertical: 20 }}
                    />
                  ) : replies.length === 0 ? (
                    <View style={styles.emptyRepliesBox}>
                      <Text style={styles.emptyRepliesText}>
                        No replies yet. Be the first to join the conversation!
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.repliesList}>
                      {replies.map((reply) => {
                        const rRoleStyle = getRoleStyle(reply.authorRole);
                        return (
                          <View key={reply.id} style={styles.replyCard}>
                            <Avatar name={reply.authorName} size={32} />
                            <View style={styles.replyBody}>
                              <View style={styles.authorRow}>
                                <Text style={styles.replyAuthorName}>
                                  {reply.authorName}
                                </Text>
                                <View
                                  style={[
                                    styles.roleBadge,
                                    { backgroundColor: rRoleStyle.bg },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.roleBadgeText,
                                      { color: rRoleStyle.text },
                                    ]}
                                  >
                                    {rRoleStyle.label}
                                  </Text>
                                </View>
                              </View>

                              <Text style={styles.replyContent}>
                                {reply.content}
                              </Text>

                              {/* Media Attachment in Reply */}
                              {reply.mediaUrl && (
                                <View style={styles.replyMediaBox}>
                                  {reply.mediaType === "video" ? (
                                    <View style={styles.replyVideoPill}>
                                      <Icon
                                        name="video"
                                        size={14}
                                        color="#2563EB"
                                      />
                                      <Text style={styles.replyVideoText}>
                                        Attached Video
                                      </Text>
                                    </View>
                                  ) : (
                                    <Image
                                      source={{ uri: reply.mediaUrl }}
                                      style={styles.replyMediaImage}
                                      contentFit="cover"
                                    />
                                  )}
                                </View>
                              )}

                              {/* Edit/Delete buttons (only for own replies or admin) */}
                              {(reply.authorId === currentUser.id || currentUser.role === 'admin') && (
                                <View style={styles.replyActions}>
                                  {editingReplyId === reply.id ? (
                                    <View style={styles.editReplyRow}>
                                      <TextInput
                                        style={styles.editReplyInput}
                                        value={editReplyText}
                                        onChangeText={setEditReplyText}
                                        multiline
                                      />
                                      <TouchableOpacity style={styles.editSaveBtn} onPress={handleUpdateReply}>
                                        <Text style={styles.editSaveBtnText}>Save</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity onPress={cancelEditReply}>
                                        <Text style={styles.editCancelText}>Cancel</Text>
                                      </TouchableOpacity>
                                    </View>
                                  ) : (
                                    <View style={styles.replyActionRow}>
                                      <TouchableOpacity onPress={() => startEditReply(reply)}>
                                        <Text style={styles.replyActionText}>Edit</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity onPress={() => handleDeleteReply(reply.id)}>
                                        <Text style={[styles.replyActionText, { color: Colors.error }]}>Delete</Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>

                {/* Reply Form Input Dock at Bottom */}
                <View
                  style={[
                    styles.replyInputDock,
                    { paddingBottom: Math.max(insets.bottom + 10, 16) },
                  ]}
                >
                  {/* Media Attachment Preview on Reply */}
                  {replyMediaUrl && (
                    <View style={styles.replyMediaPreviewBar}>
                      <Text style={styles.replyMediaPreviewText}>
                        Media attached ({replyMediaType})
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setReplyMediaUrl(null);
                          setReplyMediaType("none");
                        }}
                      >
                        <Icon name="close" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.replyInputRow}>
                    <TouchableOpacity
                      style={styles.attachReplyMediaBtn}
                      onPress={() => handlePickMedia("reply", "image")}
                    >
                      <Icon name="camera" size={20} color="#64748B" />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.replyTextInput}
                      placeholder="Write a reply..."
                      placeholderTextColor="#A0AEC0"
                      value={replyText}
                      onChangeText={setReplyText}
                      multiline={true}
                    />

                    <TouchableOpacity
                      style={[
                        styles.sendReplyBtn,
                        (!replyText.trim() && !replyMediaUrl) &&
                          styles.sendReplyBtnDisabled,
                      ]}
                      onPress={handleSendReply}
                      disabled={
                        sendingReply || (!replyText.trim() && !replyMediaUrl)
                      }
                    >
                      {sendingReply ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Icon name="send" size={16} color={Colors.white} />
                      )}
                    </TouchableOpacity>
                  </View>
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
  // ─── Header ───
  header: {
    backgroundColor: "#1B5E20",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  newPostHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.white,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  newPostBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B5E20",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  statPillText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: "600",
  },
  // ─── Main Content ───
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  searchContainer: {
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
  // ─── Loading & Empty ───
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
  // ─── Post Cards ───
  postsList: {
    gap: Spacing.md,
  },
  postCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    ...Shadow.light,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  postHeaderMeta: {
    flex: 1,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  roleBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  categorySub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
    marginBottom: 6,
  },
  postContentSnippet: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 12,
  },
  // ─── Media Container ───
  mediaContainer: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    height: 180,
    backgroundColor: "#F1F5F9",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  videoThumbnailBox: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  playIconOverlay: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  videoBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    zIndex: 2,
  },
  videoBadgeText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: "600",
  },
  // ─── Post Footer ───
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  postFooterStats: {
    flexDirection: "row",
    gap: 12,
  },
  actionPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  actionPillBtnLiked: {
    backgroundColor: "#DCFCE7",
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  actionPillTextLiked: {
    color: "#15803D",
  },
  deletePostBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  // ─── Modal Shared ───
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  formModalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
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
    minHeight: 110,
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
    color: Colors.white,
    fontWeight: "500",
  },
  formCatPillTextActive: {
    color: Colors.white,
    fontWeight: "700",
  },
  formMediaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  formMediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formMediaBtnText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  formMediaPreview: {
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  formMediaImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
  },
  replyActions: {
    marginTop: 8,
  },
  replyActionRow: {
    flexDirection: "row",
    gap: 16,
  },
  replyActionText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
  editReplyRow: {
    marginTop: 6,
  },
  editReplyInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 40,
    marginBottom: 6,
  },
  editSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  editSaveBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  editCancelText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  replyInputDock: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
  },
  replyMediaPreviewBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  replyMediaPreviewText: {
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: "600",
  },
  replyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attachReplyMediaBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  replyTextInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
    color: "#0F172A",
  },
  sendReplyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1B5E20",
    justifyContent: "center",
    alignItems: "center",
  },
  sendReplyBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  replyContent: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    marginTop: 4,
  },
  replyMediaBox: {
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  replyVideoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DBEAFE",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  replyVideoText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E40AF",
  },
  replyMediaImage: {
    width: 140,
    height: 90,
    borderRadius: 8,
  },
  emptyRepliesText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
  repliesList: {
    gap: 12,
    paddingBottom: 16,
  },
  replyCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 12,
  },
  replyBody: {
    flex: 1,
  },
  replyAuthorName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  videoPlayerText: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: "600",
  },
  threadMediaImage: {
    width: "100%",
    height: "100%",
  },
  repliesSectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 8,
    marginBottom: 12,
  },
  repliesSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  emptyRepliesBox: {
    paddingVertical: 24,
    alignItems: "center",
  },
  originalPostBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  threadDetailTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 24,
    marginBottom: 8,
  },
  threadDetailContent: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 12,
  },
  threadMediaBox: {
    borderRadius: 12,
    overflow: "hidden",
    height: 180,
    backgroundColor: "#E2E8F0",
    marginTop: 8,
  },
  videoPlayerPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  threadHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  threadHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  catBadgeSmall: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  catBadgeSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  threadScroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
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
  threadModalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  mediaPickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    paddingVertical: 12,
    borderRadius: 12,
  },
  mediaPickBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  authorInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: 12,
    padding: 12,
    marginBottom: Spacing.xl,
  },
  authorInfoText: {
    fontSize: 12,
    color: "#15803D",
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
  previewVideoPlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#0F172A",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  previewVideoText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
  },
  removeMediaBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaPickRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  formMediaPreviewBox: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
});

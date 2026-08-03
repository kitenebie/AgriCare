import { Icon } from "@/components/ui";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { db, storage, Collections } from "@/services/firebase";
import firestore, { collection, onSnapshot } from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface LivestockCategory {
  id: string;
  name: string;
  focusType: "cow" | "swine" | "other"; // Client requested Cattle/Cow & Swine focus!
  breeds: string[];
  description?: string;
  imageUrl?: string;
  count: number;
}

const FOCUS_TYPE_OPTIONS: { value: "cow" | "swine" | "other"; label: string; icon: string }[] = [
  { value: "cow", label: "Cattle / Cow 🐄", icon: "cow" },
  { value: "swine", label: "Swine / Pig 🐖", icon: "paw" },
  { value: "other", label: "Other Livestock 🌾", icon: "tag" },
];

// Client requested Cow & Swine breed suggestions
const POPULAR_COW_BREEDS = [
  "Brahman",
  "Holstein-Friesian",
  "Simmental",
  "Angus",
  "Hereford",
  "Philippine Native Cattle",
];

const POPULAR_SWINE_BREEDS = [
  "Landrace",
  "Large White",
  "Duroc",
  "Pietrain",
  "Berkshire",
  "Philippine Native Swine",
];


const safeStr = (val: any, fallback = ""): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return fallback;
};

export default function LivestockCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<LivestockCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formFocusType, setFormFocusType] = useState<"cow" | "swine" | "other">("cow");
  const [formDescription, setFormDescription] = useState("");
  const [formBreeds, setFormBreeds] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // ─── Realtime Firestore Listener ───
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onSnapshot(
        collection(db, Collections.LIVESTOCK_CATEGORIES),
        (snapshot) => {
          if (snapshot) {
            const data: LivestockCategory[] = snapshot.docs.map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                name: safeStr(d.name, "Livestock Category"),
                focusType: (safeStr(d.focusType || d.type, "cow") as any),
                breeds: Array.isArray(d.breeds) ? d.breeds.map((b) => safeStr(b)) : [],
                description: safeStr(d.description, ""),
                imageUrl: safeStr(d.imageUrl, ""),
                count: typeof d.count === "number" ? d.count : 0,
              };
            });
            setCategories(data);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore categories listen error:", error.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      console.warn("onSnapshot setup error:", err.message);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormFocusType("cow");
    setFormDescription("");
    setFormBreeds("");
    setFormImageUrl("");
    setEditingId(null);
  };

  const openAddModal = (focusType: "cow" | "swine" = "cow") => {
    resetForm();
    setFormFocusType(focusType);
    if (focusType === "cow") {
      setFormName("Cattle / Cow Breed Category");
    } else {
      setFormName("Swine / Pig Breed Category");
    }
    setModalVisible(true);
  };

  const openEdit = (cat: LivestockCategory) => {
    setFormName(cat.name);
    setFormFocusType(cat.focusType || "cow");
    setFormDescription(cat.description || "");
    setFormBreeds(cat.breeds ? cat.breeds.join(", ") : "");
    setFormImageUrl(cat.imageUrl || "");
    setEditingId(cat.id);
    setModalVisible(true);
  };

  // ─── Image Picker & Storage Upload ───
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const localUri = result.assets[0].uri;
        setUploadingImage(true);

        try {
          const filename = `categories_${Date.now()}.jpg`;
          const storageRef = storage.ref(`livestockCategories/${filename}`);
          await storageRef.putFile(localUri);
          const downloadUrl = await storageRef.getDownloadURL();
          setFormImageUrl(downloadUrl);
        } catch (uploadError: any) {
          console.warn("Firebase Storage upload error, fallback to local URI:", uploadError);
          setFormImageUrl(localUri);
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (err: any) {
      Alert.alert("Image Error", err.message || "Failed to pick image.");
      setUploadingImage(false);
    }
  };

  // Quick Breed Suggestion Adder
  const addBreedSuggestion = (breedName: string) => {
    const existing = formBreeds
      .split(",")
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    if (!existing.includes(breedName)) {
      const updated = [...existing, breedName].join(", ");
      setFormBreeds(updated);
    }
  };

  // ─── Save to Firestore ───
  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert("Missing Name", "Please enter a category name.");
      return;
    }

    const breedsList = formBreeds
      .split(",")
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    setSaving(true);

    const payload = {
      name: formName.trim(),
      focusType: formFocusType,
      type: formFocusType === "cow" ? "large" : "small", // Backward compatibility
      breeds: breedsList,
      description: formDescription.trim(),
      imageUrl: formImageUrl.trim(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    try {
      if (editingId) {
        // Update existing
        await firestore()
          .collection(Collections.LIVESTOCK_CATEGORIES)
          .doc(editingId)
          .update(payload);
      } else {
        // Add new
        await firestore()
          .collection(Collections.LIVESTOCK_CATEGORIES)
          .add({
            ...payload,
            count: 0,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
      }

      setModalVisible(false);
      resetForm();
    } catch (error: any) {
      console.warn("Save category error:", error.message);
      // Fallback local state update
      if (editingId) {
        setCategories((prev) =>
          prev.map((c) => (c.id === editingId ? { ...c, ...payload } : c))
        );
      } else {
        const newCat: LivestockCategory = {
          id: `cat_${Date.now()}`,
          name: payload.name,
          focusType: payload.focusType,
          breeds: payload.breeds,
          description: payload.description,
          imageUrl: payload.imageUrl,
          count: 0,
        };
        setCategories((prev) => [newCat, ...prev]);
      }
      setModalVisible(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Category ───
  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Category", `Are you sure you want to delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setCategories((prev) => prev.filter((c) => c.id !== id));
          try {
            await firestore()
              .collection(Collections.LIVESTOCK_CATEGORIES)
              .doc(id)
              .delete();
          } catch (error: any) {
            console.warn("Delete error:", error.message);
          }
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>Cattle & Swine Breeds</Text>

        <TouchableOpacity
          onPress={() => openAddModal("cow")}
          style={styles.addHeaderBtn}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={16} color="#15803D" />
          <Text style={styles.addHeaderBtnText}>Add Breed</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 80, 100),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Client Focus Info Banner */}
        <View style={styles.clientFocusBanner}>
          <View style={styles.focusBannerHeader}>
            <Icon name="cow" size={20} color="#1E40AF" />
            <Text style={styles.focusBannerTitle}>
              Primary Focus: Cattle 🐄 & Swine 🐖 Breeds
            </Text>
          </View>
          <Text style={styles.focusBannerSub}>
            Manage breed classification, photo references, and health specs for cows and pigs.
          </Text>

          <View style={styles.quickAddRow}>
            <TouchableOpacity
              style={styles.quickAddCowBtn}
              onPress={() => openAddModal("cow")}
            >
              <Text style={styles.quickAddBtnText}>+ Add Cattle Category</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAddSwineBtn}
              onPress={() => openAddModal("swine")}
            >
              <Text style={styles.quickAddBtnText}>+ Add Swine Category</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.loadingText}>Loading livestock breeds...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="cow" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No Livestock Categories Found</Text>
          </View>
        ) : (
          categories.map((cat) => {
            const isCow = cat.focusType === "cow";
            const isSwine = cat.focusType === "swine";

            return (
              <TouchableOpacity key={cat.id} style={styles.card} onPress={() => router.push({ pathname: "/(admin)/livestock/preview", params: { id: cat.id, name: cat.name, type: cat.focusType, breeds: (cat.breeds || []).join(","), description: cat.description || "", count: String(cat.count || 0) } })} activeOpacity={0.8}>
                {/* Category Image Thumbnail */}
                <View style={styles.cardImageContainer}>
                  {cat.imageUrl ? (
                    <Image
                      source={{ uri: cat.imageUrl }}
                      style={styles.cardImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.cardIconFallback,
                        {
                          backgroundColor: isCow
                            ? "#DBEAFE"
                            : isSwine
                            ? "#FCE7F3"
                            : "#F1F5F9",
                        },
                      ]}
                    >
                      <Icon
                        name={isCow ? "cow" : "paw"}
                        size={24}
                        color={isCow ? "#1D4ED8" : isSwine ? "#DB2777" : "#475569"}
                      />
                    </View>
                  )}
                </View>

                {/* Info Section */}
                <View style={styles.cardInfo}>
                  <View style={styles.cardHeaderLine}>
                    <Text style={styles.cardName}>{cat.name}</Text>

                    <View
                      style={[
                        styles.focusPill,
                        isCow
                          ? styles.cowPill
                          : isSwine
                          ? styles.swinePill
                          : styles.otherPill,
                      ]}
                    >
                      <Text
                        style={[
                          styles.focusPillText,
                          isCow
                            ? styles.cowPillText
                            : isSwine
                            ? styles.swinePillText
                            : styles.otherPillText,
                        ]}
                      >
                        {isCow ? "Cattle 🐄" : isSwine ? "Swine 🐖" : "Livestock"}
                      </Text>
                    </View>
                  </View>

                  {cat.description ? (
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {cat.description}
                    </Text>
                  ) : null}

                  {/* Breeds Chips Preview */}
                  <Text style={styles.breedsTitle}>
                    Breeds ({cat.breeds ? cat.breeds.length : 0}):
                  </Text>
                  <Text style={styles.breedsListText} numberOfLines={2}>
                    {cat.breeds && cat.breeds.length > 0
                      ? cat.breeds.join(" • ")
                      : "No breeds listed yet"}
                  </Text>
                </View>

                {/* Edit & Delete Action Buttons */}
                <View style={styles.actionsColumn}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEdit(cat)}
                    activeOpacity={0.8}
                  >
                    <Icon name="edit" size={14} color={Colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(cat.id, cat.name)}
                    activeOpacity={0.8}
                  >
                    <Icon name="close" size={14} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ─── ADD / EDIT CATEGORY MODAL FORM ─── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View
            style={[
              styles.modal,
              { paddingBottom: Math.max(insets.bottom + 16, 24) },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? "Edit" : "Add"} Livestock Category
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Icon name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Category Name */}
              <Text style={styles.label}>Category Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Commercial Swine & Hogs..."
                placeholderTextColor={Colors.textLight}
                value={formName}
                onChangeText={setFormName}
              />

              {/* Animal Type Selector */}
              <Text style={styles.label}>Focus Animal Type *</Text>
              <View style={styles.typeRow}>
                {FOCUS_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.typeBtn,
                      formFocusType === opt.value && styles.typeBtnActive,
                    ]}
                    onPress={() => setFormFocusType(opt.value)}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        formFocusType === opt.value && styles.typeBtnTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Picture Upload / Image URL */}
              <Text style={styles.label}>Category Photo (Upload or URL)</Text>

              {formImageUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: formImageUrl }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setFormImageUrl("")}
                  >
                    <Icon name="close" size={14} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.imageInputRow}>
                <TouchableOpacity
                  style={styles.uploadImageBtn}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Icon name="image" size={18} color={Colors.primary} />
                      <Text style={styles.uploadImageBtnText}>
                        {formImageUrl ? "Change Photo" : "Upload Photo"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Or paste image URL (https://...)"
                  placeholderTextColor={Colors.textLight}
                  value={formImageUrl}
                  onChangeText={setFormImageUrl}
                  autoCapitalize="none"
                />
              </View>

              {/* Description */}
              <Text style={styles.label}>Description / Overview</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
                placeholder="Characteristics, breeding traits, and guidelines..."
                placeholderTextColor={Colors.textLight}
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
              />

              {/* Breeds List */}
              <Text style={styles.label}>Breeds (comma separated)</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
                placeholder="e.g. Brahman, Holstein, Landrace, Duroc..."
                placeholderTextColor={Colors.textLight}
                value={formBreeds}
                onChangeText={setFormBreeds}
                multiline
              />

              {/* Popular Breeds Quick Suggestions */}
              <Text style={styles.suggestionTitle}>
                Quick Add {formFocusType === "cow" ? "Cattle 🐄" : "Swine 🐖"} Breeds:
              </Text>

              <View style={styles.chipRow}>
                {(formFocusType === "cow" ? POPULAR_COW_BREEDS : POPULAR_SWINE_BREEDS).map(
                  (bName) => (
                    <TouchableOpacity
                      key={bName}
                      style={styles.chipBtn}
                      onPress={() => addBreedSuggestion(bName)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.chipText}>+ {bName}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving || uploadingImage}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editingId ? "Update Category" : "Save Category"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7F4" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1B5E20",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
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
  addHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addHeaderBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  list: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  clientFocusBanner: {
    backgroundColor: "#EFF6FF",
    borderRadius: 18,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  focusBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  focusBannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E40AF",
  },
  focusBannerSub: {
    fontSize: 12,
    color: "#3B82F6",
    marginBottom: 10,
    lineHeight: 17,
  },
  quickAddRow: {
    flexDirection: "row",

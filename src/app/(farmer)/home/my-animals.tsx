import { Icon } from "@/components/ui";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { Collections } from "@/services/firebase";
import { logCrud } from "@/services/logService";
import { getSession } from "@/services/sessionService";
import { pickImage, uploadImageToSupabase } from "@/services/storage";
import firestore from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { modalAlert } from '@/components/ui/ModalAlert';

interface Animal {
  id: string;
  name: string;
  breed: string;
  type: string;
  age: number;
  gender: string;
  weight: string;
  healthStatus: string;
  imageUrl: string;
  count?: number;
}
interface Category {
  id: string;
  name: string;
  focusType: string;
  breeds: string[];
  imageUrl?: string;
}

const SCREEN_W = Dimensions.get("window").width;
const MODAL_PADDING = 24; // Spacing.xl
const GRID_GAP = 8;
const COL_W = Math.floor((SCREEN_W - MODAL_PADDING * 2 - GRID_GAP * 2) / 3);

export default function MyAnimalsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState("");
  
  // Edit mode
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);

  // Registration steps
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState(1); // 1=category, 2=breed, 3=details
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedBreed, setSelectedBreed] = useState("");

  // Form (step 3)
  const [formName, setFormName] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formAgeUnit, setFormAgeUnit] = useState<
    "days" | "weeks" | "months" | "years"
  >("years");
  const [formGender, setFormGender] = useState("male");
  const [formWeight, setFormWeight] = useState("");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formCount, setFormCount] = useState("1");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUid(session.uid);

      const catSnap = await firestore()
        .collection(Collections.LIVESTOCK_CATEGORIES)
        .get();
      setCategories(
        catSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category),
      );

      const unsub = firestore()
        .collection("animals")
        .where("ownerId", "==", session.uid)
        .onSnapshot(
          (snap) => {
            setAnimals(
              snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Animal),
            );
            setLoading(false);
          },
          () => setLoading(false),
        );
      return () => unsub();
    };
    load();
  }, []);

  const resetForm = () => {
    setStep(1);
    setSelectedCat(null);
    setSelectedBreed("");
    setFormName("");
    setFormAge("");
    setFormAgeUnit("years");
    setFormGender("male");
    setFormWeight("");
    setFormImage(null);
    setFormCount("1");
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCat(cat);
    if (cat.breeds && cat.breeds.length > 0) {
      setStep(2);
    } else {
      setSelectedBreed("");
      setStep(3);
    }
  };

  const handleSelectBreed = (breed: string) => {
    setSelectedBreed(breed);
    setStep(3);
  };

  const handlePickImage = async () => {
    try {
      modalAlert("Add Photo", "Choose an option", [
        {
          text: "Camera",
          onPress: async () => {
            const { status } =
              await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              modalAlert(
                "Permission Denied",
                "Camera permission is required.",
              );
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.7,
            });
            if (!result.canceled && result.assets?.[0]?.uri)
              setFormImage(result.assets[0].uri);
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            const uri = await pickImage();
            if (uri) setFormImage(uri);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } catch (e: any) {
      modalAlert("Error", e.message);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      modalAlert("Error", "Animal name is required.");
      return;
    }
    setSaving(true);

    let imageUrl = "";
    if (formImage) {
      setUploading(true);
      const result = await uploadImageToSupabase(formImage, "animals");
      setUploading(false);
      if (result.success && result.publicUrl) imageUrl = result.publicUrl;
    }

    try {
      const docRef = await firestore()
        .collection("animals")
        .add({
          name: formName.trim(),
          type: selectedCat?.focusType || selectedCat?.name || "",
          breed: selectedBreed || "Unknown",
          count: parseInt(formCount) || 1,
          age: parseInt(formAge) || 0,
          ageUnit: formAgeUnit,
          gender: formGender,
          weight: formWeight.trim(),
          healthStatus: "healthy",
          imageUrl,
          ownerId: uid,
          vaccinationUpToDate: false,
          lastCheckup: "",
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      await logCrud(
        "Animal Registered",
        `Added: ${formName.trim()} (${selectedBreed || selectedCat?.name})`,
        "animals",
        docRef.id,
        {
          old: {},
          new: {
            name: formName.trim(),
            type: selectedCat?.focusType || "",
            breed: selectedBreed,
            count: parseInt(formCount) || 1,
            age: parseInt(formAge) || 0,
            gender: formGender,
            weight: formWeight.trim(),
            imageUrl,
          },
        },
      );
      setModal(false);
      resetForm();
      modalAlert("Success", "Animal registered!");
    } catch (e: any) {
      modalAlert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── EDIT ANIMAL ───
  const handleEdit = (animal: Animal) => {
    setEditingAnimal(animal);
    // Pre-fill form with existing data
    setFormName(animal.name);
    setFormAge(String(animal.age || ''));
    setFormGender(animal.gender || 'male');
    setFormWeight(animal.weight || '');
    setFormImage(animal.imageUrl || null);
    setFormCount(String(animal.count || 1));
    setSelectedBreed(animal.breed || '');
    // Find matching category
    const matchedCat = categories.find(c => c.focusType === animal.type || c.name === animal.type);
    setSelectedCat(matchedCat || null);
    setStep(3); // Go directly to details form
    setModal(true);
  };

  const handleUpdate = async () => {
    if (!editingAnimal || !formName.trim()) {
      modalAlert('Error', 'Animal name is required.');
      return;
    }
    setSaving(true);

    let imageUrl = editingAnimal.imageUrl || '';
    if (formImage && formImage !== editingAnimal.imageUrl) {
      setUploading(true);
      const result = await uploadImageToSupabase(formImage, 'animals');
      setUploading(false);
      if (result.success && result.publicUrl) imageUrl = result.publicUrl;
    }

    try {
      await firestore().collection('animals').doc(editingAnimal.id).update({
        name: formName.trim(),
        breed: selectedBreed || editingAnimal.breed,
        count: parseInt(formCount) || 1,
        age: parseInt(formAge) || 0,
        gender: formGender,
        weight: formWeight.trim(),
        imageUrl,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      await logCrud('Animal Updated', `Updated: ${formName.trim()}`, 'animals', editingAnimal.id, {
        old: { name: editingAnimal.name, breed: editingAnimal.breed },
        new: { name: formName.trim(), breed: selectedBreed },
      });
      setModal(false);
      setEditingAnimal(null);
      resetForm();
      modalAlert('Success', 'Animal updated!');
    } catch (e: any) {
      modalAlert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── DELETE ANIMAL ───
  const handleDelete = (animal: Animal) => {
    modalAlert('Delete Animal', `Are you sure you want to remove "${animal.name}" from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await firestore().collection('animals').doc(animal.id).delete();
          await logCrud('Animal Deleted', `Removed: ${animal.name} (${animal.breed})`, 'animals', animal.id);
          modalAlert('Deleted', `${animal.name} has been removed.`);
        } catch (e: any) {
          modalAlert('Error', e.message);
        }
      }},
    ]);
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon
            name="chevron-right"
            size={20}
            color={Colors.white}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Animals</Text>
        <TouchableOpacity
          style={s.dotsBtn}
          onPress={() => {
            resetForm();
            setEditingAnimal(null);
            setModal(true);
          }}
        >
          <Icon name="dots" size={28} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        <Text style={s.count}>{animals.length} registered</Text>
        {animals.length === 0 && (
          <View style={s.empty}>
            <Icon name="cow" size={48} color={Colors.textLight} />
            <Text style={s.emptyText}>No animals registered yet</Text>
            <Text style={s.emptySubtext}>
              Tap + to register your first animal
            </Text>
          </View>
        )}
        {animals.map((a) => (
          <View key={a.id} style={s.card}>
            {a.imageUrl ? (
              <Image source={{ uri: a.imageUrl }} style={s.cardImg} />
            ) : (
              <View style={[s.cardImg, s.cardImgPlaceholder]}>
                <Icon name="cow" size={28} color={Colors.textLight} />
              </View>
            )}
            <View style={s.cardInfo}>
              <Text style={s.cardName}>{a.name}</Text>
              {a.count && a.count > 1 ? (
                <Text style={s.cardCount}>×{a.count} heads</Text>
              ) : null}
              <Text style={s.cardBreed}>{a.breed}</Text>
              <View style={s.cardMeta}>
                <Text style={s.metaText}>{a.type}</Text>
                <Text style={s.metaText}>•</Text>
                <Text style={s.metaText}>{a.gender}</Text>
                <Text style={s.metaText}>•</Text>
                <Text style={s.metaText}>{a.age}yrs</Text>
                {a.weight ? (
                  <>
                    <Text style={s.metaText}>•</Text>
                    <Text style={s.metaText}>{a.weight}</Text>
                  </>
                ) : null}
              </View>
              <View
                style={[
                  s.healthBadge,
                  a.healthStatus !== "healthy" && {
                    backgroundColor: "#FFEBEE",
                  },
                ]}
              >
                <Text
                  style={[
                    s.healthText,
                    a.healthStatus !== "healthy" && { color: Colors.error },
                  ]}
                >
                  {a.healthStatus}
                </Text>
              </View>
              {/* Edit & Delete buttons */}
              <View style={s.cardActions}>
                <TouchableOpacity style={s.editBtn} onPress={() => handleEdit(a)}>
                  <Icon name="pencil" size={13} color="#1565C0" />
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(a)}>
                  <Icon name="trash" size={13} color={Colors.error} />
                  <Text style={s.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Registration Modal */}
      <Modal
        visible={modal}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(false)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            {/* Header */}
            <View style={s.modalHead}>
              <TouchableOpacity
                onPress={() => {
                  if (step > 1) setStep(step - 1);
                  else setModal(false);
                }}
              >
                <Icon
                  name={step > 1 ? "chevron-left" : ""}
                  size={22}
                  color={Colors.text}
                  style={
                    step > 1 ? { transform: [{ rotate: "180deg" }] } : undefined
                  }
                />
              </TouchableOpacity>
              <Text style={s.modalTitle}>
                {step === 1
                  ? "Select Category"
                  : step === 2
                    ? "Select Breed"
                    : editingAnimal ? "Edit Animal" : "Animal Details"}
              </Text>
              <TouchableOpacity onPress={() => { setModal(false); }}>
                <Icon name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Step 1: Category Grid */}
            {step === 1 && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.stepDesc}>
                  What type of animal are you registering?
                </Text>
                <View style={s.grid}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={s.gridItem}
                      activeOpacity={0.7}
                      onPress={() => handleSelectCategory(cat)}
                    >
                      {cat.imageUrl ? (
                        <Image
                          source={{ uri: cat.imageUrl }}
                          style={s.gridImg}
                        />
                      ) : (
                        <View style={[s.gridImg, s.gridImgPlaceholder]}>
                          <Icon name="cow" size={28} color={Colors.primary} />
                        </View>
                      )}
                      <Text style={s.gridLabel} numberOfLines={2}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ height: 80 }} />
              </ScrollView>
            )}

            {/*    */}
            {step === 2 && selectedCat && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.stepDesc}>
                  Select breed for {selectedCat.name}
                </Text>
                <View style={s.breedList}>
                  {selectedCat.breeds.map((breed) => (
                    <TouchableOpacity
                      key={breed}
                      style={s.breedItem}
                      activeOpacity={0.7}
                      onPress={() => handleSelectBreed(breed)}
                    >
                      <View style={s.breedIcon}>
                        <Icon name="paw" size={18} color={Colors.primary} />
                      </View>
                      <Text style={s.breedText}>{breed}</Text>
                      <Icon
                        name="chevron-right"
                        size={16}
                        color={Colors.textLight}
                      />
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[s.breedItem, { borderColor: Colors.textLight }]}
                    onPress={() => {
                      setSelectedBreed("");
                      setStep(3);
                    }}
                  >
                    <View style={[s.breedIcon, { backgroundColor: "#FFF3E0" }]}>
                      <Icon name="dots" size={18} color="#FF9800" />
                    </View>
                    <Text style={s.breedText}>Other / Not Listed</Text>
                    <Icon
                      name="chevron-right"
                      size={16}
                      color={Colors.textLight}
                    />
                  </TouchableOpacity>
                  <View style={{ height: 80 }} />
                </View>
              </ScrollView>
            )}

            {/* Step 3: Details Form */}
            {step === 3 && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={s.stepDesc}>
                    Fill in your animal's information
                  </Text>

                  {/* Selected info */}
                  <View style={s.selectedInfo}>
                    <Text style={s.selectedInfoText}>
                      Category:{" "}
                      <Text
                        style={{ fontWeight: "700", color: Colors.primary }}
                      >
                        {selectedCat?.name}
                      </Text>
                    </Text>
                    {selectedBreed ? (
                      <Text style={s.selectedInfoText}>
                        Breed:{" "}
                        <Text
                          style={{ fontWeight: "700", color: Colors.primary }}
                        >
                          {selectedBreed}
                        </Text>
                      </Text>
                    ) : null}
                  </View>

                  {/* Image */}
                  <TouchableOpacity
                    style={s.imgPicker}
                    onPress={handlePickImage}
                  >
                    {formImage ? (
                      <Image source={{ uri: formImage }} style={s.imgPreview} />
                    ) : (
                      <View style={s.imgPlaceholder}>
                        <Icon
                          name="camera"
                          size={28}
                          color={Colors.textLight}
                        />
                        <Text style={s.imgPlaceholderText}>Add Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Name */}
                  <Text style={s.label}>Name</Text>
                  <TextInput
                    style={s.input}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="e.g. Manny"
                    placeholderTextColor={Colors.textLight}
                  />

                  {/* Quantity */}
                  <Text style={s.label}>Quantity</Text>
                  <TextInput
                    style={s.input}
                    value={formCount}
                    onChangeText={setFormCount}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textLight}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.textLight,
                      marginTop: 4,
                    }}
                  >
                    For batch registration (e.g. 12 piglets as one record)
                  </Text>

                  {/* Breed (if not selected in step 2) */}
                  {!selectedBreed && (
                    <>
                      <Text style={s.label}>Breed</Text>
                      <TextInput
                        style={s.input}
                        value={selectedBreed}
                        onChangeText={setSelectedBreed}
                        placeholder="Enter breed"
                        placeholderTextColor={Colors.textLight}
                      />
                    </>
                  )}

                  {/* Age & Weight */}
                  <Text style={s.label}>Age</Text>
                  <View style={s.row}>
                    <TextInput
                      style={[s.input, { flex: 1 }]}
                      value={formAge}
                      onChangeText={setFormAge}
                      placeholder="e.g. 7"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.textLight}
                    />
                    <View style={[s.genderRow, { flex: 2, marginLeft: 8 }]}>
                      {(["days", "weeks", "months", "years"] as const).map(
                        (unit) => (
                          <TouchableOpacity
                            key={unit}
                            style={[
                              s.unitBtn,
                              formAgeUnit === unit && s.unitBtnActive,
                            ]}
                            onPress={() => setFormAgeUnit(unit)}
                          >
                            <Text
                              style={[
                                s.unitText,
                                formAgeUnit === unit && s.unitTextActive,
                              ]}
                            >
                              {unit}
                            </Text>
                          </TouchableOpacity>
                        ),
                      )}
                    </View>
                  </View>

                  <Text style={s.label}>Weight (optional)</Text>
                  <TextInput
                    style={s.input}
                    value={formWeight}
                    onChangeText={setFormWeight}
                    placeholder="Leave blank if unknown"
                    placeholderTextColor={Colors.textLight}
                  />

                  {/* Gender */}
                  <Text style={s.label}>Gender</Text>
                  <View style={s.genderRow}>
                    <TouchableOpacity
                      style={[
                        s.genderBtn,
                        formGender === "male" && s.genderBtnActive,
                      ]}
                      onPress={() => setFormGender("male")}
                    >
                      <Text
                        style={[
                          s.genderText,
                          formGender === "male" && s.genderTextActive,
                        ]}
                      >
                        ♂ Male
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        s.genderBtn,
                        formGender === "female" && s.genderBtnActive,
                      ]}
                      onPress={() => setFormGender("female")}
                    >
                      <Text
                        style={[
                          s.genderText,
                          formGender === "female" && s.genderTextActive,
                        ]}
                      >
                        ♀ Female
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        s.genderBtn,
                        formGender === "mixed" && s.genderBtnActive,
                      ]}
                      onPress={() => setFormGender("mixed")}
                    >
                      <Text
                        style={[
                          s.genderText,
                          formGender === "mixed" && s.genderTextActive,
                        ]}
                      >
                        ⚥ Mixed
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Save */}
                  <TouchableOpacity
                    style={[s.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={editingAnimal ? handleUpdate : handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={s.saveBtnText}>
                        {uploading ? "Uploading..." : editingAnimal ? "Update Animal" : "Register Animal"}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <View style={{ height: 80 }} />
                </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "180deg" }],
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  list: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  count: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: 4,
  },
  // Animal Card
  card: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    overflow: "hidden",
    ...Shadow.light,
  },
  cardImg: { width: 100, alignSelf: 'stretch' },
  cardImgPlaceholder: {
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: { flex: 1, padding: Spacing.md },
  cardName: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  cardCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF9800",
    marginTop: 1,
  },
  cardBreed: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 1 },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  metaText: { fontSize: 11, color: Colors.textSecondary },
  healthBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  healthText: { fontSize: 10, fontWeight: "700", color: "#4CAF50" },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#E3F2FD' },
  editBtnText: { fontSize: 11, fontWeight: '600', color: '#1565C0' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#FFEBEE' },
  deleteBtnText: { fontSize: 11, fontWeight: '600', color: '#EF4444' },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 40,
    maxHeight: "92%",
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text },
  stepIndicator: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepDesc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  // Step 1: Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    justifyContent: "flex-start",
  },
  gridItem: {
    width: COL_W,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  gridImg: {
    width: COL_W - 24,
    height: COL_W - 24,
    borderRadius: BorderRadius.md,
  },
  gridImgPlaceholder: {
    backgroundColor: Colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
    marginTop: 6,
  },
  // Step 2: Breeds
  breedList: { gap: Spacing.sm },
  breedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  breedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  breedText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  // Step 3: Form
  selectedInfo: {
    backgroundColor: Colors.primary + "08",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  selectedInfoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
  },
  row: { flexDirection: "row" },
  imgPicker: { alignSelf: "center", marginBottom: Spacing.sm },
  imgPreview: { width: 120, height: 120, borderRadius: BorderRadius.lg },
  imgPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  imgPlaceholderText: { fontSize: 12, color: Colors.textLight, marginTop: 4 },
  genderRow: { flexDirection: "row", gap: Spacing.sm },
  genderBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
  },
  genderBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  genderText: { fontSize: FontSize.md, color: Colors.textSecondary },
  genderTextActive: { color: Colors.primary, fontWeight: "700" },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.xxl,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  dotsBtn: {
    width: 42,
    height: 42,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface + "20",
  },
});

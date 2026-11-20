import { Icon } from "@/components/ui";
import {
  BorderRadius, Colors, FontSize, Shadow, Spacing, } from "@/constants/theme";
import { logCrud } from "@/services/logService";
import { getSession } from "@/services/sessionService";
import { pickImage, uploadImageToSupabase } from "@/services/storage";
import firestore from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View, KeyboardAvoidingView, Platform } from "react-native";
import { AppTextInput as TextInput, AppText as Text } from '@/components/ui/FontScale';
import { modalAlert } from '@/components/ui/ModalAlert';
import { catalog, normalizeAnimalTypeId } from '../../../../functions/shared/technicianServiceMatching';

interface Animal {
  id: string;
  name: string;
  breed: string;
  type: string;
  age: number;
  ageUnit?: string;
  gender: string;
  weight: string;
  healthStatus: string;
  imageUrl: string;
  count?: number;
}

const animalArtwork = (animal: Animal) => {
  const type = `${animal.type || ''} ${animal.name || ''}`.toLowerCase();
  if (/\b(pig|swine|hog)\b/.test(type)) return { source: require('../../../../assets/images/farmer/pig.png'), background: '#FFF0F1' };
  if (/\b(cow|cattle|carabao|buffalo)\b/.test(type)) return { source: require('../../../../assets/images/farmer/cow.png'), background: '#FFF8E7' };
  return { source: require('../../../../assets/images/farmer/cow-pig.png'), background: '#E9F9F0' };
};

export default function MyAnimalsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState("");
  
  // Edit mode
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);

  // Registration steps
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState(1); // 1=animal type, 2=details
  const [animalType, setAnimalType] = useState("");
  const [selectedBreed, setSelectedBreed] = useState("");
  const [approvedBreeds, setApprovedBreeds] = useState<{ animalTypeId: string; name: string }[]>([]);
  const [animalTypePicker, setAnimalTypePicker] = useState(false);
  const [breedPicker, setBreedPicker] = useState(false);

  // Form (step 2)
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

      void firestore().collection("livestockCategories").get().then(categories => {
        setApprovedBreeds(categories.docs.flatMap(doc => {
          const data = doc.data();
          const animalTypeId = normalizeAnimalTypeId(data.name) || normalizeAnimalTypeId(data.type);
          return Array.isArray(data.breeds) ? data.breeds.filter((name: unknown): name is string => typeof name === "string" && !!name.trim())
            .map((name: string) => ({ animalTypeId, name: name.trim() })) : [];
        }));
      }).catch(() => {});

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

  const selectedAnimalTypeId = normalizeAnimalTypeId(animalType) || animalType.trim().toLowerCase();
  const fixedBreeds = catalog.breeds.filter(breed => breed.animalTypeId === selectedAnimalTypeId).map(breed => breed.name);
  const breedOptions = fixedBreeds.length ? fixedBreeds : [...new Set(approvedBreeds
    .filter(breed => breed.animalTypeId === selectedAnimalTypeId).map(breed => breed.name))];
  if (editingAnimal && selectedBreed && !breedOptions.includes(selectedBreed)) breedOptions.unshift(selectedBreed);

  const resetForm = () => {
    setStep(1);
    setAnimalType("");
    setSelectedBreed("");
    setFormName("");
    setFormAge("");
    setFormAgeUnit("years");
    setFormGender("male");
    setFormWeight("");
    setFormImage(null);
    setFormCount("1");
  };

  const handleContinueAnimalType = () => {
    if (!selectedAnimalTypeId) {
      modalAlert("Animal type required", "Select an animal type to continue.");
      return;
    }
    setSelectedBreed("");
    setStep(2);
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

  const validateAnimalForm = () => {
    if (!animalType.trim()) {
      modalAlert("Animal type required", "Enter the animal type.");
      return false;
    }
    if (!/^\d+$/.test(formCount) || Number(formCount) < 1) {
      modalAlert("Invalid Quantity", "Enter a whole number greater than zero.");
      return false;
    }
    if (formAge && !/^\d+$/.test(formAge)) {
      modalAlert("Invalid Age", "Enter age using numbers only.");
      return false;
    }
    if (formWeight && (!/^\d+(\.\d+)?$/.test(formWeight) || Number(formWeight) <= 0)) {
      modalAlert("Invalid Weight", "Enter a valid weight using numbers only.");
      return false;
    }
    return true;
  };

  const hasDuplicateAnimal = async (excludeId?: string) => {
    const normalize = (value?: string) => (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const normalizeAgeUnit = (value?: string) => normalize(value || 'years').replace(/s$/, '');
    const type = normalize(animalType);
    const breed = normalize(selectedBreed || 'Unknown');
    const age = parseInt(formAge, 10) || 0;
    const snapshot = await firestore().collection('animals').where('ownerId', '==', uid).get();
    return snapshot.docs.some(doc => {
      if (doc.id === excludeId) return false;
      const animal = doc.data() as Animal;
      return (
      normalize(animal.type || animal.name) === type &&
      normalize(animal.breed || 'Unknown') === breed &&
      Number(animal.age || 0) === age &&
      normalizeAgeUnit(animal.ageUnit) === normalizeAgeUnit(formAgeUnit) &&
      normalize(animal.gender || 'male') === normalize(formGender)
      );
    });
  };

  const handleSave = async () => {
    if (!validateAnimalForm()) return;
    try {
      if (await hasDuplicateAnimal()) {
        modalAlert('Animal already registered', 'This animal type, breed, age, and gender already exist. Update the quantity on the existing record instead.');
        return;
      }
    } catch (e: any) {
      modalAlert('Error', e.message);
      return;
    }
    const animalName = animalType.trim() || "Animal";
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
          name: animalName,
          type: animalName,
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
        `Added: ${animalName} (${selectedBreed || animalName})`,
        "animals",
        docRef.id,
        {
          old: {},
          new: {
            name: animalName,
            type: animalName,
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
    setFormAgeUnit((animal.ageUnit || 'years') as typeof formAgeUnit);
    setFormGender(animal.gender || 'male');
    setFormWeight(animal.weight || '');
    setFormImage(animal.imageUrl || null);
    setFormCount(String(animal.count || 1));
    setSelectedBreed(animal.breed || '');
    // Find matching category
    const type = animal.type || animal.name;
    setAnimalType(type);
    setStep(2); // Go directly to details form
    setModal(true);
  };

  const handleUpdate = async () => {
    if (!editingAnimal || !formName.trim()) {
      modalAlert('Error', 'Animal name is required.');
      return;
    }
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'-]*$/.test(formName.trim())) {
      modalAlert('Invalid Name', 'Use letters only, with spaces, apostrophes, or hyphens.');
      return;
    }
    if (!validateAnimalForm()) return;
    try {
      if (await hasDuplicateAnimal(editingAnimal.id)) {
        modalAlert('Animal already registered', 'This animal type, breed, age, and gender already exist. Update the quantity on the existing record instead.');
        return;
      }
    } catch (e: any) {
      modalAlert('Error', e.message);
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
        ageUnit: formAgeUnit,
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
          <Icon name="plus" size={24} color={Colors.white} />
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
        {animals.map((a) => {
          const artwork = animalArtwork(a);
          return (
          <View key={a.id} style={s.card}>
            {a.imageUrl ? (
              <Image source={{ uri: a.imageUrl }} style={s.cardImg} />
            ) : (
              <View style={[s.cardImg, s.cardImgPlaceholder, { backgroundColor: artwork.background }]}>
                <Image source={artwork.source} style={s.animalArt} resizeMode="contain" accessibilityLabel={`${a.type || a.name} 3D animal image`} />
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
                <Text style={s.metaText}>{a.age} {a.ageUnit || 'years'}</Text>
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
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Registration Modal */}
      <Modal
        visible={modal}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                {step > 1 && <Icon name="chevron-left" size={22} color={Colors.text} style={{ transform: [{ rotate: "180deg" }] }} />}
              </TouchableOpacity>
              <Text style={s.modalTitle}>
                {step === 1 ? "Add Animal" : editingAnimal ? "Edit Animal" : "Animal Details"}
              </Text>
              <TouchableOpacity onPress={() => { setModal(false); }}>
                <Icon name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Step 1: Animal type */}
            {step === 1 && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
                <Text style={s.stepDesc}>
                  Select the animal type for this record.
                </Text>
                <Text style={s.label}>Animal type</Text>
                <TouchableOpacity style={[s.input, s.breedSelect]} onPress={() => setAnimalTypePicker(true)} accessibilityRole="button" accessibilityLabel={`Animal type: ${animalType || "select animal type"}`}>
                  <Text style={[s.breedValue, !animalType && { color: Colors.textLight }]}>{animalType || "Select animal type"}</Text>
                  <Icon name="chevron-down" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={s.continueButton} onPress={handleContinueAnimalType} accessibilityRole="button">
                  <Text style={s.continueButtonText}>Continue</Text>
                  <Icon name="chevron-right" size={18} color={Colors.white} />
                </TouchableOpacity>
                <View style={{ height: 24 }} />
              </ScrollView>
            )}

            {/* Step 2: Details Form */}
            {step === 2 && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  automaticallyAdjustKeyboardInsets
                >
                  <Text style={s.stepDesc}>
                    Fill in your animal's information
                  </Text>

                  {/* Selected info */}
                  <View style={s.selectedInfo}>
                    <Text style={s.selectedInfoText}>
                      Animal type:{" "}
                      <Text
                        style={{ fontWeight: "700", color: Colors.primary }}
                      >
                        {animalType}
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

                  {editingAnimal && (
                    <>
                      <Text style={s.label}>Name</Text>
                      <TextInput
                        style={s.input}
                        value={formName}
                        onChangeText={(value) => setFormName(value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ .'-]/g, ''))}
                        placeholder="e.g. Manny"
                        placeholderTextColor={Colors.textLight}
                      />
                    </>
                  )}

                  {/* Quantity */}
                  <Text style={s.label}>Quantity</Text>
                  <TextInput
                    style={s.input}
                    value={formCount}
                    onChangeText={(value) => setFormCount(value.replace(/\D/g, ''))}
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

                  {/* Breed */}
                  <Text style={s.label}>Breed</Text>
                  <TouchableOpacity style={[s.input, s.breedSelect, !breedOptions.length && s.breedSelectDisabled]} onPress={() => setBreedPicker(true)} disabled={!breedOptions.length} accessibilityRole="button" accessibilityLabel={`Breed: ${selectedBreed || (breedOptions.length ? 'select breed' : 'no predefined breeds')}`}>
                    <Text style={[s.breedValue, !selectedBreed && { color: Colors.textLight }]}>{selectedBreed || (breedOptions.length ? "Select breed" : "No predefined breeds")}</Text>
                    {!!breedOptions.length && <Icon name="chevron-down" size={18} color={Colors.textSecondary} />}
                  </TouchableOpacity>

                  {/* Age & Weight */}
                  <Text style={s.label}>Age</Text>
                  <View style={s.row}>
                    <TextInput
                      style={[s.input, { flex: 1 }]}
                      value={formAge}
                      onChangeText={(value) => setFormAge(value.replace(/\D/g, ''))}
                      placeholder="e.g. 7"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.textLight}
                    />
                    <View style={[s.genderRow, { flex: 2, marginLeft: 8 }]}>
                      {(["days", "weeks", "months", "years"] as const).map(
                        (unit) => (
                          <TouchableOpacity
                            key={unit}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: formAgeUnit === unit }}
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
                    onChangeText={(value) => setFormWeight(value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                    placeholder="Leave blank if unknown"
                    keyboardType="decimal-pad"
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
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={animalTypePicker} transparent animationType="slide" onRequestClose={() => setAnimalTypePicker(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Select Animal Type</Text>
              <TouchableOpacity onPress={() => setAnimalTypePicker(false)} accessibilityRole="button" accessibilityLabel="Close animal type list">
                <Icon name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {catalog.animalTypes.map(type => (
                <TouchableOpacity key={type.id} style={s.breedOption} onPress={() => { setAnimalType(type.name); setSelectedBreed(""); setAnimalTypePicker(false); }} accessibilityRole="radio" accessibilityState={{ selected: selectedAnimalTypeId === type.id }}>
                  <Text style={s.breedOptionText}>{type.name}</Text>
                  {selectedAnimalTypeId === type.id && <Icon name="check" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={breedPicker} transparent animationType="slide" onRequestClose={() => setBreedPicker(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Select Breed</Text>
              <TouchableOpacity onPress={() => setBreedPicker(false)} accessibilityRole="button" accessibilityLabel="Close breed list">
                <Icon name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {breedOptions.map(breed => (
                <TouchableOpacity key={breed} style={s.breedOption} onPress={() => { setSelectedBreed(breed); setBreedPicker(false); }} accessibilityRole="radio" accessibilityState={{ selected: selectedBreed === breed }}>
                  <Text style={s.breedOptionText}>{breed}</Text>
                  {selectedBreed === breed && <Icon name="check" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    justifyContent: "center",
    alignItems: "center",
  },
  animalArt: { width: 94, height: 118 },
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
  continueButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.primary, marginTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  continueButtonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: "700" },
  // Step 2: Form
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
  breedSelect: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  breedSelectDisabled: { opacity: 0.7 },
  breedValue: { fontSize: FontSize.md, color: Colors.text },
  breedOption: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  breedOptionText: { fontSize: FontSize.md, color: Colors.text },
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
  unitBtn: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  unitBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "10" },
  unitText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  unitTextActive: { color: Colors.primary, fontWeight: "700" },
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

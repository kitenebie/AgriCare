/**
 * Example Screen: Add Animal with Image Upload
 *
 * Flow: Pick Image → Upload to Supabase → Save URL to Firestore
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { modalAlert } from '@/components/ui/ModalAlert';
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { pickImage, uploadAnimalWithImage } from "@/services/storage";

export default function AddAnimalExample() {
  const [animalName, setAnimalName] = useState("");
  const [breed, setBreed] = useState("");
  const [owner, setOwner] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      const uri = await pickImage();
      if (uri) setImageUri(uri);
    } catch (error: any) {
      modalAlert("Error", error.message);
    }
  };

  const handleSubmit = async () => {
    if (!animalName.trim() || !breed.trim() || !owner.trim()) {
      modalAlert("Error", "Please fill in all fields.");
      return;
    }
    if (!imageUri) {
      modalAlert("Error", "Please select an image.");
      return;
    }

    setLoading(true);
    try {
      const result = await uploadAnimalWithImage(imageUri, animalName.trim(), breed.trim(), owner.trim());

      if (result.success) {
        modalAlert("Success", `Animal saved! ID: ${result.documentId}`);
        // Reset form
        setAnimalName("");
        setBreed("");
        setOwner("");
        setImageUri(null);
      } else {
        modalAlert("Error", result.error || "Failed to save.");
      }
    } catch (error: any) {
      modalAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <Text style={s.title}>Add Animal</Text>

      {/* Image Picker */}
      <TouchableOpacity style={s.imagePicker} onPress={handlePickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.imagePreview} />
        ) : (
          <View style={s.imagePlaceholder}>
            <Text style={s.imagePlaceholderText}>Tap to select image</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Form */}
      <Text style={s.label}>Animal Name</Text>
      <TextInput style={s.input} placeholder="e.g. Cow" value={animalName} onChangeText={setAnimalName} placeholderTextColor="#94A3B8" />

      <Text style={s.label}>Breed</Text>
      <TextInput style={s.input} placeholder="e.g. Holstein Friesian" value={breed} onChangeText={setBreed} placeholderTextColor="#94A3B8" />

      <Text style={s.label}>Owner</Text>
      <TextInput style={s.input} placeholder="e.g. Juan Dela Cruz" value={owner} onChangeText={setOwner} placeholderTextColor="#94A3B8" />

      {/* Submit */}
      <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Upload & Save</Text>}
      </TouchableOpacity>

      {loading && <Text style={s.loadingText}>Uploading image to Supabase...</Text>}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  title: { fontSize: FontSize.xxl, fontWeight: "800", color: Colors.text, marginBottom: Spacing.xl },
  imagePicker: { marginBottom: Spacing.xl },
  imagePreview: { width: "100%", height: 200, borderRadius: BorderRadius.lg },
  imagePlaceholder: { width: "100%", height: 200, borderRadius: BorderRadius.lg, backgroundColor: "#E2E8F0", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#CBD5E1", borderStyle: "dashed" },
  imagePlaceholderText: { fontSize: FontSize.md, color: "#94A3B8" },
  label: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.text, marginBottom: 6, marginTop: Spacing.md },
  input: { backgroundColor: "#fff", borderRadius: BorderRadius.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: FontSize.md, borderWidth: 1, borderColor: "#E2E8F0", color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 16, alignItems: "center", marginTop: Spacing.xl },
  submitBtnText: { color: "#fff", fontSize: FontSize.lg, fontWeight: "700" },
  loadingText: { textAlign: "center", color: "#64748B", marginTop: Spacing.md, fontSize: FontSize.sm },
});

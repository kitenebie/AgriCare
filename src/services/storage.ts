/**
 * Storage Service — Supabase Storage for images + Firestore for data
 *
 * Flow: Image Picker → Supabase Storage → Public URL → Firestore
 */

import { decode as base64Decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { fetch as expoFetch } from "expo/fetch";
import { File } from "expo-file-system";
import firestore from "@react-native-firebase/firestore";
import { authInstance } from "./firebase";
import { supabase } from "../../utils/supabase";
import { Collections } from "./firebase";
import { logCrud } from "./logService";

// ─── Interfaces ───

export type StorageBucket =
  | "animals"
  | "technician_profile_photo"
  | "farmer_profile_photo";

// ─── Data Interfaces ───

export interface AnimalData {
  animalName: string;
  breed: string;
  owner: string;
  imageURL: string;
  createdAt: any;
}

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

export const uploadRegistrationDocuments = async (identityUri: string, proofUri?: string): Promise<{ identityPath?: string; proofPath?: string; error?: string }> => {
  try {
    const user = authInstance.currentUser;
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const apiKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
    if (!user || !baseUrl || !apiKey || !identityUri.startsWith("file://") || (proofUri && !proofUri.startsWith("file://"))) throw new Error("Could not securely upload your registration documents. Select the images again and retry.");
    console.info("[Registration ID] Upload started", { proofIncluded: Boolean(proofUri) });
    const appendFile = (form: FormData, field: string, uri: string) => {
      form.append(field, new File(uri));
    };
    const form = new FormData();
    form.append("action", "upload_registration_documents");
    appendFile(form, "identity", identityUri);
    if (proofUri) appendFile(form, "proof", proofUri);
    const response = await expoFetch(`${baseUrl}/functions/v1/registration-email-otp`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, apikey: apiKey },
      body: form,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.identityPath !== "string" || (proofUri && typeof result.proofPath !== "string")) {
      console.error("[Registration ID] Upload failed", { status: response.status, detail: result.error || "Missing storage path." });
      throw new Error(result.error || "Could not securely upload your registration documents.");
    }
    console.info("[Registration ID] Upload complete", { identityPath: result.identityPath, proofPath: result.proofPath || null });
    return { identityPath: result.identityPath, ...(typeof result.proofPath === "string" ? { proofPath: result.proofPath } : {}) };
  } catch (error: any) {
    console.error("[Registration ID] Upload request failed", error.message || error);
    return { error: error.message || "Could not securely upload your registration documents." };
  }
};

export interface SaveResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

// ─── Pick Image ───

export const pickImage = async (): Promise<string | null> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Permission to access gallery was denied.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // Compress
    });

    if (result.canceled || !result.assets || !result.assets[0].uri) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error: any) {
    console.error("[Storage] pickImage error:", error.message);
    throw error;
  }
};

// ─── Upload Image to Supabase Storage ───

export const uploadImageToSupabase = async (
  localUri: string,
  bucket: StorageBucket = "animals"
): Promise<UploadResult> => {
  try {
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
    const filePath = `uploads/${filename}`;

    let arrayBuffer: ArrayBuffer;
    let contentType = "image/jpeg";

    if (localUri.startsWith("data:")) {
      // Handle base64 data URI (from WebView face detection)
      const matches = localUri.match(/^data:(.+?);base64,(.+)$/);
      if (!matches) throw new Error("Invalid data URI format");
      contentType = matches[1];
      arrayBuffer = base64Decode(matches[2]);
    } else {
      // Handle file:// or content:// URIs (from ImagePicker)
      const response = await fetch(localUri);
      const blob = await response.blob();
      arrayBuffer = await new Response(blob).arrayBuffer();
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("[Storage] Supabase upload error:", error.message);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { success: true, publicUrl: urlData.publicUrl };
  } catch (error: any) {
    console.error("[Storage] uploadImageToSupabase error:", error.message);
    return { success: false, error: error.message };
  }
};

// ─── Convenience Upload Functions ───

export const uploadTechnicianProfilePhoto = async (
  localUri: string
): Promise<UploadResult> => {
  return uploadImageToSupabase(localUri, "technician_profile_photo");
};

export const uploadFarmerProfilePhoto = async (
  localUri: string
): Promise<UploadResult> => {
  return uploadImageToSupabase(localUri, "farmer_profile_photo");
};

// ─── Save Animal to Firestore ───

export const saveAnimalToFirestore = async (
  animalName: string,
  breed: string,
  owner: string,
  imageURL: string
): Promise<SaveResult> => {
  try {
    const docRef = await firestore().collection("animals").add({
      animalName,
      breed,
      owner,
      imageURL,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    await logCrud(
      "Animal Created",
      `Added: ${animalName} (${breed})`,
      "animals",
      docRef.id,
      { old: {}, new: { animalName, breed, owner, imageURL } }
    );

    return { success: true, documentId: docRef.id };
  } catch (error: any) {
    console.error("[Storage] saveAnimalToFirestore error:", error.message);
    return { success: false, error: error.message };
  }
};

// ─── Complete Upload Flow (convenience) ───

export const uploadAnimalWithImage = async (
  localUri: string,
  animalName: string,
  breed: string,
  owner: string
): Promise<SaveResult> => {
  // Step 1: Upload image to Supabase
  const uploadResult = await uploadImageToSupabase(localUri, "animals");
  if (!uploadResult.success || !uploadResult.publicUrl) {
    return { success: false, error: uploadResult.error || "Upload failed" };
  }

  // Step 2: Save to Firestore with public URL
  const saveResult = await saveAnimalToFirestore(
    animalName,
    breed,
    owner,
    uploadResult.publicUrl
  );

  return saveResult;
};

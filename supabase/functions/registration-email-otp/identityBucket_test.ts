import { parseFaceData, profileIdSource, profilePhotoSource, resolveSignedStorageUrl } from "./index.ts";

Deno.test("registration IDs use the ids bucket and remain scoped to their owner", () => {
  const source = profileIdSource("farmer-uid", "ids/farmer-uid/id.jpg");
  if (source.bucket !== "ids" || source.path !== "farmer-uid/id.jpg") throw new Error("Expected an ids bucket object path.");

  let rejected = false;
  try { profileIdSource("farmer-uid", "ids/another-uid/id.jpg"); } catch { rejected = true; }
  if (!rejected) throw new Error("Registration ID paths owned by another user must be rejected.");
});

Deno.test("private ID signed paths resolve to a single storage URL", () => {
  const base = "https://project.supabase.co/storage/v1";
  const path = "/object/sign/ids/farmer-uid/id.jpg?token=sample";
  const expected = `https://project.supabase.co/storage/v1${path}`;
  if (resolveSignedStorageUrl(base, path) !== expected) throw new Error("Storage API object path was joined incorrectly.");
  if (resolveSignedStorageUrl(base, `/storage/v1${path}`) !== expected) throw new Error("Full storage path was joined incorrectly.");
});

Deno.test("captured selfie data URI decodes for the server-side matching request", () => {
  const face = parseFaceData("data:image/jpeg;base64,/9j/");
  if (face.mimeType !== "image/jpeg" || face.bytes.length !== 3) throw new Error("Expected captured JPEG bytes from the data URI.");
});

Deno.test("profile selfie comparison accepts only same-project profile photos", () => {
  const source = profilePhotoSource("https://project.supabase.co", "farmer", "https://project.supabase.co/storage/v1/object/public/farmer_profile_photo/uploads/123_selfie.jpg");
  if (!source.endsWith("/farmer_profile_photo/uploads/123_selfie.jpg")) throw new Error("Expected the saved farmer photo URL.");
  let rejected = false;
  try { profilePhotoSource("https://project.supabase.co", "farmer", "https://other.example/image.jpg"); } catch { rejected = true; }
  if (!rejected) throw new Error("External profile photo URLs must be rejected.");
});

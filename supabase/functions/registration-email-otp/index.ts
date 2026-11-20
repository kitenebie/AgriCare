const technicianCatalog = {"specializations":[{"id":"pig-healthcare-treatment","name":"Pig Healthcare and Treatment"},{"id":"cattle-healthcare-treatment","name":"Cattle Healthcare and Treatment"},{"id":"goat-healthcare-treatment","name":"Goat Healthcare and Treatment"},{"id":"horse-healthcare-treatment","name":"Horse Healthcare and Treatment"},{"id":"carabao-healthcare-treatment","name":"Carabao Healthcare and Treatment"}],"subSpecializations":[{"id":"pig-artificial-insemination","specializationId":"pig-healthcare-treatment","animalTypeId":"pig","serviceTypeId":"5","name":"Pig Artificial Insemination"},{"id":"pig-castration","specializationId":"pig-healthcare-treatment","animalTypeId":"pig","serviceTypeId":"8","name":"Pig Castration"},{"id":"pig-vaccination","specializationId":"pig-healthcare-treatment","animalTypeId":"pig","serviceTypeId":"2","name":"Vaccination"},{"id":"pig-health-check","specializationId":"pig-healthcare-treatment","animalTypeId":"pig","serviceTypeId":"1","name":"Health Check"},{"id":"pig-vitamin-injection","specializationId":"pig-healthcare-treatment","animalTypeId":"pig","serviceTypeId":"7","name":"Vitamin Injection"},{"id":"pig-iron-injection","specializationId":"pig-healthcare-treatment","animalTypeId":"pig","serviceTypeId":"6","name":"Iron Injection"},{"id":"pig-antibiotic-injection","specializationId":"pig-healthcare-treatment","animalTypeId":"pig","serviceTypeId":"10","name":"Antibiotic Injection"},{"id":"pig-deworming","specializationId":"pig-healthcare-treatment","animalTypeId":"pig","serviceTypeId":"4","name":"Deworming"},{"id":"pig-wound-treatment","specializationId":"pig-healthcare-treatment","animalTypeId":"pig","serviceTypeId":"9","name":"Wound Treatment"},{"id":"cattle-artificial-insemination","specializationId":"cattle-healthcare-treatment","animalTypeId":"cattle","serviceTypeId":"5","name":"Cattle Artificial Insemination"},{"id":"cattle-vaccination","specializationId":"cattle-healthcare-treatment","animalTypeId":"cattle","serviceTypeId":"2","name":"Vaccination"},{"id":"cattle-health-check","specializationId":"cattle-healthcare-treatment","animalTypeId":"cattle","serviceTypeId":"1","name":"Health Check"},{"id":"cattle-vitamin-injection","specializationId":"cattle-healthcare-treatment","animalTypeId":"cattle","serviceTypeId":"7","name":"Vitamin Injection"},{"id":"cattle-iron-injection","specializationId":"cattle-healthcare-treatment","animalTypeId":"cattle","serviceTypeId":"6","name":"Iron Injection"},{"id":"cattle-antibiotic-injection","specializationId":"cattle-healthcare-treatment","animalTypeId":"cattle","serviceTypeId":"10","name":"Antibiotic Injection"},{"id":"cattle-deworming","specializationId":"cattle-healthcare-treatment","animalTypeId":"cattle","serviceTypeId":"4","name":"Deworming"},{"id":"cattle-wound-treatment","specializationId":"cattle-healthcare-treatment","animalTypeId":"cattle","serviceTypeId":"9","name":"Wound Treatment"},{"id":"goat-vaccination","specializationId":"goat-healthcare-treatment","animalTypeId":"goat","serviceTypeId":"2","name":"Vaccination"},{"id":"goat-health-check","specializationId":"goat-healthcare-treatment","animalTypeId":"goat","serviceTypeId":"1","name":"Health Check"},{"id":"goat-vitamin-injection","specializationId":"goat-healthcare-treatment","animalTypeId":"goat","serviceTypeId":"7","name":"Vitamin Injection"},{"id":"goat-iron-injection","specializationId":"goat-healthcare-treatment","animalTypeId":"goat","serviceTypeId":"6","name":"Iron Injection"},{"id":"goat-antibiotic-injection","specializationId":"goat-healthcare-treatment","animalTypeId":"goat","serviceTypeId":"10","name":"Antibiotic Injection"},{"id":"goat-deworming","specializationId":"goat-healthcare-treatment","animalTypeId":"goat","serviceTypeId":"4","name":"Deworming"},{"id":"goat-wound-treatment","specializationId":"goat-healthcare-treatment","animalTypeId":"goat","serviceTypeId":"9","name":"Wound Treatment"},{"id":"horse-vaccination","specializationId":"horse-healthcare-treatment","animalTypeId":"horse","serviceTypeId":"2","name":"Vaccination"},{"id":"horse-health-check","specializationId":"horse-healthcare-treatment","animalTypeId":"horse","serviceTypeId":"1","name":"Health Check"},{"id":"horse-vitamin-injection","specializationId":"horse-healthcare-treatment","animalTypeId":"horse","serviceTypeId":"7","name":"Vitamin Injection"},{"id":"horse-iron-injection","specializationId":"horse-healthcare-treatment","animalTypeId":"horse","serviceTypeId":"6","name":"Iron Injection"},{"id":"horse-antibiotic-injection","specializationId":"horse-healthcare-treatment","animalTypeId":"horse","serviceTypeId":"10","name":"Antibiotic Injection"},{"id":"horse-deworming","specializationId":"horse-healthcare-treatment","animalTypeId":"horse","serviceTypeId":"4","name":"Deworming"},{"id":"horse-wound-treatment","specializationId":"horse-healthcare-treatment","animalTypeId":"horse","serviceTypeId":"9","name":"Wound Treatment"},{"id":"carabao-artificial-insemination","specializationId":"carabao-healthcare-treatment","animalTypeId":"carabao","serviceTypeId":"5","name":"Carabao Artificial Insemination"},{"id":"carabao-vaccination","specializationId":"carabao-healthcare-treatment","animalTypeId":"carabao","serviceTypeId":"2","name":"Vaccination"},{"id":"carabao-health-check","specializationId":"carabao-healthcare-treatment","animalTypeId":"carabao","serviceTypeId":"1","name":"Health Check"},{"id":"carabao-vitamin-injection","specializationId":"carabao-healthcare-treatment","animalTypeId":"carabao","serviceTypeId":"7","name":"Vitamin Injection"},{"id":"carabao-iron-injection","specializationId":"carabao-healthcare-treatment","animalTypeId":"carabao","serviceTypeId":"6","name":"Iron Injection"},{"id":"carabao-antibiotic-injection","specializationId":"carabao-healthcare-treatment","animalTypeId":"carabao","serviceTypeId":"10","name":"Antibiotic Injection"},{"id":"carabao-deworming","specializationId":"carabao-healthcare-treatment","animalTypeId":"carabao","serviceTypeId":"4","name":"Deworming"},{"id":"carabao-wound-treatment","specializationId":"carabao-healthcare-treatment","animalTypeId":"carabao","serviceTypeId":"9","name":"Wound Treatment"}]} as const;

const projectId = "agecare-ca137";
const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const response = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
const hmac = async (value: string) => {
  const secret = Deno.env.get("REGISTRATION_OTP_SECRET");
  if (!secret) throw new Error("Missing registration OTP secret.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
};
const sha256 = async (value: string) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const rpc = async (name: string, body: Record<string, unknown>) => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase service configuration.");
  const result = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!result.ok) throw new Error(`Supabase request failed (${result.status}).`);
  return result.json();
};

const randomCode = () => {
  const range = 4_294_800_000;
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value); while (value[0] >= range);
  return String(100000 + (value[0] % 900000));
};

let firebaseKeys: JsonWebKey[] = [];
const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
};
const decodeJwtPart = (value: string) => JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));

const verifyFirebaseToken = async (token: string) => {
  const [encodedHeader, encodedClaims, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedClaims || !encodedSignature) throw new Error("Invalid Firebase token.");
  const header = decodeJwtPart(encodedHeader);
  const claims = decodeJwtPart(encodedClaims);
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== "RS256" || claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}` ||
    typeof claims.sub !== "string" || !claims.sub || typeof claims.exp !== "number" || claims.exp <= now ||
    typeof claims.iat !== "number" || claims.iat > now + 300 || typeof claims.email !== "string") {
    throw new Error("Invalid Firebase token.");
  }
  if (!firebaseKeys.length) {
    const result = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
    if (!result.ok) throw new Error("Could not verify Firebase token.");
    firebaseKeys = (await result.json()).keys;
  }
  let key = firebaseKeys.find((candidate: any) => candidate.kid === header.kid);
  if (!key) {
    firebaseKeys = [];
    const result = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
    if (!result.ok) throw new Error("Could not verify Firebase token.");
    firebaseKeys = (await result.json()).keys;
    key = firebaseKeys.find((candidate: any) => candidate.kid === header.kid);
  }
  if (!key) throw new Error("Invalid Firebase token.");
  const cryptoKey = await crypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, decodeBase64Url(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedClaims}`));
  if (!valid) throw new Error("Invalid Firebase token.");
  return claims;
};

const firebaseAdminAccessToken = async () => {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) throw new Error("Missing Firebase service account.");
  const serviceAccount = JSON.parse(raw);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encoder = new TextEncoder();
  const unsigned = `${encode(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })))}.${encode(encoder.encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })))}`;
  const pem = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const keyBytes = Uint8Array.from(atob(pem), (char) => char.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey("pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, encoder.encode(unsigned));
  const assertion = `${unsigned}.${encode(new Uint8Array(signature))}`;
  const authResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!authResponse.ok) throw new Error("Firebase admin authentication failed.");
  const { access_token } = await authResponse.json();
  return access_token as string;
};

const firebaseAdminUpdateEmailVerified = async (uid: string) => {
  const accessToken = await firebaseAdminAccessToken();
  const update = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  if (!update.ok) throw new Error("Could not mark the Firebase email as verified.");
};

const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const firestoreResource = `projects/${projectId}/databases/(default)/documents`;
const decodeFirestoreValue = (value: any): any => {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields || {});
  return undefined;
};
const decodeFirestoreFields = (fields: Record<string, any> = {}) => Object.fromEntries(
  Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
);
const encodeFirestoreValue = (value: any): Record<string, unknown> => {
  if (value === null) return { nullValue: "NULL_VALUE" };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeFirestoreValue(item)])) } };
};
const encodeFirestoreTimestamp = (value: string) => ({ timestampValue: new Date(value).toISOString() });
const adminHeaders = async () => ({ Authorization: `Bearer ${await firebaseAdminAccessToken()}`, "Content-Type": "application/json" });
const firestoreDocument = async (path: string, headers: Record<string, string>, transaction?: string): Promise<Record<string, any> | null> => {
  const query = transaction ? `?transaction=${encodeURIComponent(transaction)}` : "";
  const result = await fetch(`${firestoreUrl}/${path}${query}`, { headers });
  if (result.status === 404) return null;
  if (!result.ok) throw new Error(`Could not read Firestore record (HTTP ${result.status}).`);
  const document = await result.json();
  return { id: document.name.split("/").pop(), ...decodeFirestoreFields(document.fields) };
};
const firestoreQuery = async (collection: string, filters: Record<string, unknown>[], headers: Record<string, string>, transaction?: string): Promise<Record<string, any>[]> => {
  const where = filters.length === 1 ? filters[0] : { compositeFilter: { op: "AND", filters } };
  const result = await fetch(`${firestoreUrl}:runQuery`, {
    method: "POST", headers,
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where }, ...(transaction ? { transaction } : {}) }),
  });
  if (!result.ok) throw new Error(`Could not query Firestore (HTTP ${result.status}).`);
  return (await result.json()).flatMap((row: any) => row.document ? [{
    id: row.document.name.split("/").pop(), ...decodeFirestoreFields(row.document.fields),
  }] : []);
};
const firestoreFilter = (fieldPath: string, op: string, value: unknown) => ({
  fieldFilter: { field: { fieldPath }, op, value: encodeFirestoreValue(value) },
});
export const profilePatch = (value: any, role = "farmer") => {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !["displayName", "phoneNumber", "location"].includes(key))) {
    throw Object.assign(new Error("Only name, phone number, and address can be updated here."), { status: 422 });
  }
  const patch = {
    displayName: typeof value.displayName === "string" ? value.displayName.trim() : "",
    phoneNumber: typeof value.phoneNumber === "string" ? value.phoneNumber.trim() : "",
    location: typeof value.location === "string" ? value.location.trim() : "",
  };
  const validLocation = role === "farmer"
    ? /^Purok [1-7], Gabao, Irosin, Sorsogon$/i.test(patch.location)
    : typeof patch.location === "string" && patch.location.length <= 200 && !/[<>\r\n]/.test(patch.location);
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'-]{1,99}$/.test(patch.displayName) || !/^09\d{9}$/.test(patch.phoneNumber) || !validLocation) {
    throw Object.assign(new Error("Enter a valid name, mobile number, and address."), { status: 422 });
  }
  return patch;
};
export const profileIdSource = (uid: string, value: unknown) => {
  if (typeof value === "string") {
    const match = value.match(/^(ids|farmer_identity|technician_identity|technician_proof)\/([^/]+)\/([A-Za-z0-9._-]+\.(?:jpg|png))$/i);
    if (match && match[2] === uid) return { bucket: match[1], path: `${uid}/${match[3]}` };
  }
  try {
    const url = new URL(String(value));
    const origin = new URL(Deno.env.get("SUPABASE_URL") || "").origin;
    const match = url.pathname.match(/^\/storage\/v1\/object\/public\/(farmers_proof|technician_proof)\/(uploads\/[A-Za-z0-9._-]+\.(?:jpg|png))$/i);
    if (url.protocol !== "https:" || url.origin !== origin || !match || url.username || url.password || url.search || url.hash) throw new Error();
    return { bucket: match[1], path: match[2] };
  } catch {
    throw Object.assign(new Error("Your original registration ID is unavailable."), { status: 422 });
  }
};
export const profilePhotoSource = (supabaseUrl: string, role: string, value: unknown) => {
  try {
    const url = new URL(String(value));
    const origin = new URL(supabaseUrl).origin;
    const bucket = role === "farmer" ? "farmer_profile_photo" : role === "technician" ? "technician_profile_photo" : "";
    const match = url.pathname.match(/^\/storage\/v1\/object\/public\/(farmer_profile_photo|technician_profile_photo)\/uploads\/[A-Za-z0-9._-]+\.(?:jpg|png)$/i);
    if (url.protocol !== "https:" || url.origin !== origin || !bucket || !match || match[1] !== bucket || url.username || url.password || url.search || url.hash) throw new Error();
    return url.toString();
  } catch {
    throw Object.assign(new Error("Your current profile photo is unavailable. Upload a profile photo before updating your profile."), { status: 422 });
  }
};
const storageBase = () => {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Private identity storage is not configured.");
  return { url: `${url.replace(/\/+$/, "")}/storage/v1`, headers: { apikey: key, Authorization: `Bearer ${key}` } };
};
const privateObjectUrl = (base: string, bucket: string, path: string) => `${base}/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
export const resolveSignedStorageUrl = (storageUrl: string, signedPath: string) => {
  if (signedPath.startsWith("http")) return signedPath;
  const path = signedPath.startsWith("/storage/v1/") ? signedPath.slice("/storage/v1".length) : signedPath.startsWith("/") ? signedPath : `/${signedPath}`;
  return `${storageUrl}${path}`;
};
const uploadVerifiedProfileSelfie = async (uid: string, role: string, face: { bytes: Uint8Array; mimeType: string }) => {
  if (face.bytes.length > 8 * 1024 * 1024) throw Object.assign(new Error("Your captured selfie is too large to save as a profile photo."), { status: 422 });
  const bucket = role === "farmer" ? "farmer_profile_photo" : "technician_profile_photo";
  const path = `uploads/${uid}_${crypto.randomUUID()}.${face.mimeType === "image/png" ? "png" : "jpg"}`;
  const storage = storageBase();
  const saved = await fetch(privateObjectUrl(storage.url, bucket, path), {
    method: "POST", headers: { ...storage.headers, "Content-Type": face.mimeType, "x-upsert": "false" },
    body: new Blob([face.bytes.buffer as ArrayBuffer], { type: face.mimeType }),
  });
  if (!saved.ok) {
    console.error("[Profile Selfie] Supabase upload failed", { bucket, status: saved.status });
    throw Object.assign(new Error("Could not save your verified selfie as your profile photo."), { status: 503 });
  }
  const baseUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  const photoURL = `${baseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
  console.info("[Profile Selfie] Updated verified profile photo", { bucket, path });
  return { bucket, path, photoURL, storage };
};
const signedPrivateObjectUrl = async (bucket: string, path: string) => {
  const { url, headers } = storageBase();
  const signed = await fetch(`${url}/object/sign/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 300 }),
  });
  if (!signed.ok) throw Object.assign(new Error("The identity document is unavailable."), { status: 422 });
  const result = await signed.json();
  const signedPath = result.signedURL || result.signedUrl;
  if (typeof signedPath !== "string") throw new Error("Could not sign the identity document.");
  return resolveSignedStorageUrl(url, signedPath);
};
const identityPreviewAction = async (uid: string, targetUserId?: unknown, documentField?: unknown) => {
  const headers = await adminHeaders();
  const caller = await firestoreDocument(`users/${uid}`, headers);
  const targetId = typeof targetUserId === "string" && targetUserId ? targetUserId : uid;
  const field = documentField === "proofImageUrl" ? "proofImageUrl" : "idImageUrl";
  const canViewOwnId = targetId === uid && ["farmer", "technician"].includes(caller?.role) && field === "idImageUrl";
  if (!caller || caller.status !== "active" || (!canViewOwnId && (targetId === uid || caller.role !== "admin"))) {
    throw Object.assign(new Error("You are not allowed to view this identity document."), { status: 403 });
  }
  const target = targetId === uid ? caller : await firestoreDocument(`users/${encodeURIComponent(targetId)}`, headers);
  if (!target?.[field]) throw Object.assign(new Error("The registration document is unavailable."), { status: 422 });
  const source = profileIdSource(targetId, target[field]);
  return { signedUrl: await signedPrivateObjectUrl(source.bucket, source.path) };
};
const uploadRegistrationDocumentsAction = async (uid: string, identityFile: File | null, proofFile: File | null) => {
  const inspectImage = async (file: File | null, required: boolean) => {
    if (!file && !required) return null;
    if (!file || !["image/jpeg", "image/png"].includes(file.type) || !file.size || file.size > 8 * 1024 * 1024) {
      throw Object.assign(new Error("Choose valid JPEG or PNG registration documents under 8 MB."), { status: 422 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
    if ((!isJpeg && !isPng) || (isPng && file.type !== "image/png") || (isJpeg && file.type !== "image/jpeg")) {
      throw Object.assign(new Error("Choose valid JPEG or PNG registration documents."), { status: 422 });
    }
    return { bytes, contentType: isPng ? "image/png" : "image/jpeg", extension: isPng ? "png" : "jpg" };
  };
  const identity = await inspectImage(identityFile, true);
  if (!identity) throw Object.assign(new Error("Choose a registration ID image."), { status: 422 });
  const firestoreHeaders = await adminHeaders();
  const user = await firestoreDocument(`users/${uid}`, firestoreHeaders);
  if (!user || !["farmer", "technician"].includes(user.role) || !["active", "pending"].includes(user.status) || user.idImageUrl || (user.role === "technician" && user.proofImageUrl)) {
    throw Object.assign(new Error("This account cannot upload registration documents."), { status: 403 });
  }
  const proof = await inspectImage(proofFile, user.role === "technician");
  if (user.role === "farmer" && proof) throw Object.assign(new Error("Farmers can upload only their identity document here."), { status: 422 });
  const identityBucket = "ids";
  const identityPath = `${uid}/${crypto.randomUUID()}.${identity.extension}`;
  const proofBucket = "technician_proof";
  const proofPath = proof ? `${uid}/${crypto.randomUUID()}.${proof.extension}` : "";
  const storage = storageBase();
  const identityUpload = await fetch(privateObjectUrl(storage.url, identityBucket, identityPath), {
    method: "POST", headers: { ...storage.headers, "Content-Type": identity.contentType, "x-upsert": "false" }, body: identity.bytes,
  });
  if (!identityUpload.ok) {
    const detail = (await identityUpload.text().catch(() => "")).slice(0, 300);
    console.error("[Registration ID] Supabase upload failed", { bucket: identityBucket, status: identityUpload.status, detail });
    throw Object.assign(new Error("Could not securely store the registration ID."), { status: 503 });
  }
  console.info("[Registration ID] Stored in Supabase", { bucket: identityBucket, path: identityPath, bytes: identity.bytes.length });
  if (proof) {
    const proofUpload = await fetch(privateObjectUrl(storage.url, proofBucket, proofPath), {
      method: "POST", headers: { ...storage.headers, "Content-Type": proof.contentType, "x-upsert": "false" }, body: proof.bytes,
    });
    if (!proofUpload.ok) {
      await fetch(privateObjectUrl(storage.url, identityBucket, identityPath), { method: "DELETE", headers: storage.headers }).catch(() => {});
      throw Object.assign(new Error("Could not securely store the technician qualification proof."), { status: 503 });
    }
  }
  const fields: Record<string, unknown> = { idImageUrl: { stringValue: `${identityBucket}/${identityPath}` } };
  const fieldPaths = ["idImageUrl"];
  if (proof) { fields.proofImageUrl = { stringValue: `${proofBucket}/${proofPath}` }; fieldPaths.push("proofImageUrl"); }
  const updateUrl = new URL(`${firestoreUrl}/users/${encodeURIComponent(uid)}`);
  fieldPaths.forEach(field => updateUrl.searchParams.append("updateMask.fieldPaths", field));
  const saved = await fetch(updateUrl, { method: "PATCH", headers: firestoreHeaders, body: JSON.stringify({ fields }) });
  if (!saved.ok) {
    await Promise.all([
      fetch(privateObjectUrl(storage.url, identityBucket, identityPath), { method: "DELETE", headers: storage.headers }).catch(() => {}),
      ...(proof ? [fetch(privateObjectUrl(storage.url, proofBucket, proofPath), { method: "DELETE", headers: storage.headers }).catch(() => {})] : []),
    ]);
    throw Object.assign(new Error("Could not finish saving the registration documents."), { status: 503 });
  }
  return { identityPath: `${identityBucket}/${identityPath}`, ...(proof ? { proofPath: `${proofBucket}/${proofPath}` } : {}) };
};
export const parseFaceData = (value: unknown) => {
  const match = typeof value === "string" && value.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length > 11_200_000) throw Object.assign(new Error("Capture a new live face photo to continue."), { status: 422 });
  const binary = atob(match[2]);
  if (!binary.length || binary.length > 8 * 1024 * 1024) throw Object.assign(new Error("The face photo is too large. Retake it and try again."), { status: 422 });
  return { mimeType: match[1], bytes: Uint8Array.from(binary, char => char.charCodeAt(0)) };
};
const profileChallengeFields = (challenge: Record<string, any>): Record<string, any> => ({ mapValue: { fields: {
  tokenHash: { stringValue: challenge.tokenHash }, profileHash: { stringValue: challenge.profileHash },
  expiresAt: encodeFirestoreTimestamp(challenge.expiresAt), attempts: { integerValue: String(challenge.attempts) },
  ...(challenge.lockId ? { lockId: { stringValue: challenge.lockId }, lockUntil: encodeFirestoreTimestamp(challenge.lockUntil) } : {}),
} } });
const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};
const profileUpdateAction = async (uid: string, body: Record<string, any>) => {
  const headers = await adminHeaders();
  const user = await firestoreDocument(`users/${uid}`, headers);
  if (!user || !["farmer", "technician"].includes(user.role) || user.status !== "active") throw Object.assign(new Error("Only an active farmer or technician can update this profile."), { status: 403 });
  const patch = profilePatch(body.profile, user.role);
  const profileHash = await sha256(JSON.stringify(patch));
  if (body.action === "start_farmer_profile_verification") {
    profilePhotoSource(Deno.env.get("SUPABASE_URL") || "", user.role, user.photoURL);
    const challengeToken = randomToken();
    const challenge = { tokenHash: await sha256(challengeToken), profileHash, expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(), attempts: 0 };
    const url = new URL(`${firestoreUrl}/users/${encodeURIComponent(uid)}`);
    url.searchParams.append("updateMask.fieldPaths", "profileUpdateChallenge");
    const saved = await fetch(url, { method: "PATCH", headers, body: JSON.stringify({ fields: { profileUpdateChallenge: profileChallengeFields(challenge) } }) });
    if (!saved.ok) throw new Error("Could not start identity verification.");
    return { challengeToken, expiresAt: Date.parse(challenge.expiresAt) };
  }
  if (body.action !== "complete_farmer_profile_verification") throw Object.assign(new Error("Unknown profile verification action."), { status: 400 });
  const token = body.challengeToken;
  if (typeof token !== "string" || token.length < 32 || token.length > 128) throw Object.assign(new Error("Start a new identity verification and try again."), { status: 422 });
  const face = parseFaceData(body.faceImage);
  const tokenHash = await sha256(token);
  const transactionStart = await fetch(`${firestoreUrl}:beginTransaction`, { method: "POST", headers, body: JSON.stringify({ options: { readWrite: {} } }) });
  if (!transactionStart.ok) throw new Error("Could not start identity verification.");
  const { transaction } = await transactionStart.json();
  let activeTransaction: string | null = transaction;
  let lockId = crypto.randomUUID();
  let claimedPhotoURL = "";
  let uploadedSelfie: { bucket: string; path: string; photoURL: string; storage: { url: string; headers: Record<string, string> } } | null = null;
  try {
    const current = await firestoreDocument(`users/${encodeURIComponent(uid)}`, headers, transaction);
    const challenge = current?.profileUpdateChallenge;
    if (!current || current.role !== user.role || current.status !== "active") throw Object.assign(new Error("Only an active farmer or technician can update this profile."), { status: 403 });
    if (challenge?.tokenHash !== tokenHash || challenge?.profileHash !== profileHash || Date.parse(challenge?.expiresAt || "") <= Date.now()) throw Object.assign(new Error("Verification expired or does not match these profile changes. Start again."), { status: 422 });
    if (Number(challenge.attempts) >= 3) throw Object.assign(new Error("Too many attempts. Start a new verification."), { status: 429 });
    if (Date.parse(challenge.lockUntil || "") > Date.now()) throw Object.assign(new Error("Verification is already in progress."), { status: 409 });
    claimedPhotoURL = current.photoURL || "";
    const oldPhotoURL = profilePhotoSource(Deno.env.get("SUPABASE_URL") || "", user.role, claimedPhotoURL);
    const claimed = { ...challenge, attempts: Number(challenge.attempts || 0) + 1, lockId, lockUntil: new Date(Date.now() + 2 * 60_000).toISOString() };
    const commit = await fetch(`${firestoreUrl}:commit`, { method: "POST", headers, body: JSON.stringify({ transaction, writes: [{ update: { name: `${firestoreResource}/users/${uid}`, fields: { profileUpdateChallenge: profileChallengeFields(claimed) } }, updateMask: { fieldPaths: ["profileUpdateChallenge"] } }] }) });
    if (!commit.ok) throw Object.assign(new Error("Could not claim the verification attempt."), { status: 409 });
    activeTransaction = null;

    const apiKey = Deno.env.get("FACE_MATCH_API_KEY");
    if (!apiKey) throw new Error("Face matching is not configured on the server.");
    uploadedSelfie = await uploadVerifiedProfileSelfie(uid, user.role, face);
    console.info("[Profile Selfie Match] Sending API request", { oldProfileAvailable: true, newProfileAvailable: true });
    let matched: Response;
    try {
      matched = await fetch("https://meet.earms.site/api/v1/match/urls", {
        method: "POST",
        headers: { Accept: "*/*", "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ url_1: oldPhotoURL, url_2: uploadedSelfie.photoURL }),
      });
    } catch (error) {
      console.error("[Profile Selfie Match] API request failed", error instanceof Error ? error.message : "Network request failed");
      throw Object.assign(new Error("Could not connect to the profile selfie matching service. Try again."), { status: 503 });
    }
    const matchResult = await matched.json().catch(() => ({}));
    console.info("[Profile Selfie Match] API response", { status: matched.status, match: matchResult.match === true });
    if (!matched.ok || matchResult.match !== true) throw Object.assign(new Error(typeof matchResult.detail === "string" ? matchResult.detail : "Your new selfie did not match your saved profile photo."), { status: matched.status >= 500 ? 503 : 422 });
    const profileSelfie = uploadedSelfie;

    const finalStart = await fetch(`${firestoreUrl}:beginTransaction`, { method: "POST", headers, body: JSON.stringify({ options: { readWrite: {} } }) });
    if (!finalStart.ok) throw new Error("Could not save the verified profile.");
    const { transaction: finalTransaction } = await finalStart.json();
    activeTransaction = finalTransaction;
    const latest = await firestoreDocument(`users/${encodeURIComponent(uid)}`, headers, finalTransaction);
    const latestChallenge = latest?.profileUpdateChallenge;
    if (!latest || latest.role !== user.role || latest.status !== "active" || latest.photoURL !== claimedPhotoURL || latestChallenge?.tokenHash !== tokenHash || latestChallenge?.profileHash !== profileHash || latestChallenge?.lockId !== lockId || Date.parse(latestChallenge?.expiresAt || "") <= Date.now()) {
      await fetch(`${firestoreUrl}:rollback`, { method: "POST", headers, body: JSON.stringify({ transaction: finalTransaction }) }).catch(() => {});
      activeTransaction = null;
      throw Object.assign(new Error("Verification expired or your profile photo changed. Start again."), { status: 422 });
    }
    const fields = Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, encodeFirestoreValue(value)]));
    fields.photoURL = encodeFirestoreValue(profileSelfie.photoURL);
    fields.profileUpdatedAt = encodeFirestoreTimestamp(new Date().toISOString());
    const saved = await fetch(`${firestoreUrl}:commit`, { method: "POST", headers, body: JSON.stringify({ transaction: finalTransaction, writes: [{ update: { name: `${firestoreResource}/users/${uid}`, fields }, updateMask: { fieldPaths: [...Object.keys(patch), "photoURL", "profileUpdatedAt", "profileUpdateChallenge"] } }] }) });
    if (!saved.ok) throw Object.assign(new Error("Could not save the verified profile."), { status: 503 });
    activeTransaction = null;
    return { verified: true, message: "Profile photos matched and profile updated.", photoURL: profileSelfie.photoURL };
  } catch (error) {
    if (activeTransaction) await fetch(`${firestoreUrl}:rollback`, { method: "POST", headers, body: JSON.stringify({ transaction: activeTransaction }) }).catch(() => {});
    if (uploadedSelfie) await fetch(privateObjectUrl(uploadedSelfie.storage.url, uploadedSelfie.bucket, uploadedSelfie.path), { method: "DELETE", headers: uploadedSelfie.storage.headers }).catch(() => {});
    if (lockId && claimedPhotoURL) {
      const unlockStart = await fetch(`${firestoreUrl}:beginTransaction`, { method: "POST", headers, body: JSON.stringify({ options: { readWrite: {} } }) }).catch(() => null);
      if (unlockStart?.ok) {
        const { transaction: unlockTransaction } = await unlockStart.json();
        const latest = await firestoreDocument(`users/${encodeURIComponent(uid)}`, headers, unlockTransaction).catch(() => null);
        const challenge = latest?.profileUpdateChallenge;
        if (challenge?.lockId === lockId) {
          const unlocked = { ...challenge, lockId: undefined, lockUntil: undefined };
          const fields = profileChallengeFields(unlocked);
          delete fields.mapValue.fields.lockId;
          delete fields.mapValue.fields.lockUntil;
          await fetch(`${firestoreUrl}:commit`, { method: "POST", headers, body: JSON.stringify({ transaction: unlockTransaction, writes: [{ update: { name: `${firestoreResource}/users/${uid}`, fields: { profileUpdateChallenge: fields } }, updateMask: { fieldPaths: ["profileUpdateChallenge"] } }] }) }).catch(() => {});
        } else await fetch(`${firestoreUrl}:rollback`, { method: "POST", headers, body: JSON.stringify({ transaction: unlockTransaction }) }).catch(() => {});
      }
    }
    throw error;
  }
};
const normalizeAnimalType = (value: unknown) => {
  const normalized = String(value || "").trim().toLowerCase();
  return ({ swine: "pig", baboy: "pig", cow: "cattle", baka: "cattle", kambing: "goat", kabayo: "horse", kalabaw: "carabao" } as Record<string, string>)[normalized] ||
    (technicianCatalog.specializations.some(item => item.id === `${normalized}-healthcare-treatment`) ? normalized : "");
};
export const filterRelevantTechnicians = (technicians: any[], animalTypes: Set<string>) => technicians.filter(tech =>
  tech.role === "technician" && tech.status === "active" && tech.qualificationVerified === true && Array.isArray(tech.qualificationKeys) &&
  tech.qualificationKeys.some((key: unknown) => typeof key === "string" && animalTypes.has(key.split(":")[0])));
const timeMinutes = (value: unknown) => {
  const match = typeof value === "string" && value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 12 || Number(match[2]) > 59) return null;
  return ((Number(match[1]) % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(match[2]);
};
const timeInRange = (time: unknown, start: unknown, end: unknown) => {
  const value = timeMinutes(time), from = timeMinutes(start), to = timeMinutes(end);
  return value !== null && from !== null && to !== null && from !== to && (from < to ? value >= from && value < to : value >= from || value < to);
};
const scheduledAt = (tech: any, date: string, time: string) => {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const previousDate = new Date(`${date}T12:00:00Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const previousDateKey = previousDate.toISOString().slice(0, 10);
  const slots = Array.isArray(tech.availabilitySlots) ? tech.availabilitySlots : [];
  const hasSlot = slots.some((slot: any) => {
    const dateMatches = slot.date ? slot.date === date : slot.dayOfWeek === day;
    const previousDateMatches = slot.date ? slot.date === previousDateKey : slot.dayOfWeek === (day + 6) % 7;
    const start = timeMinutes(slot.startTime), end = timeMinutes(slot.endTime), requested = timeMinutes(time);
    const continuesOvernight = start !== null && end !== null && requested !== null && start > end && requested < end;
    return (dateMatches && (slot.startTime && slot.endTime ? timeInRange(time, slot.startTime, slot.endTime) : slot.time?.trim?.().toUpperCase() === time.toUpperCase())) ||
      (previousDateMatches && continuesOvernight);
  });
  const ranges = Array.isArray(tech.alwaysAvailable) ? tech.alwaysAvailable : tech.alwaysAvailable ? [tech.alwaysAvailable] : [];
  return hasSlot || (tech.alwaysAvailableEnabled !== false && ranges.some((range: any) => timeInRange(time, range.startTime, range.endTime)));
};
const appointmentActive = (item: any) => ["confirmed", "upcoming"].includes(item.status) ||
  (item.status === "pending" && (!item.responseDeadlineAt || Date.parse(item.responseDeadlineAt) > Date.now()));
const timeConflict = (date: string, time: string, item: any) => {
  const requested = timeMinutes(time), existing = timeMinutes(item.time);
  if (requested === null || existing === null || !item.date) return true;
  const start = Date.parse(`${date}T00:00:00Z`) + requested * 60000;
  const other = Date.parse(`${item.date}T00:00:00Z`) + existing * 60000;
  return start < other + 3600000 && other < start + 3600000;
};
const serviceTypes = ["Health Check", "Vaccination", "Treatment", "Deworming", "Artificial Insemination", "Iron Injection", "Vitamin Injection", "Castration", "Wound Treatment", "Antibiotic Injection"]
  .map((name, index) => ({ id: String(index + 1), name }));
const animalNames: Record<string, string> = { pig: "Pig", cattle: "Cattle", goat: "Goat", horse: "Horse", carabao: "Carabao" };
const createServiceAction = async (uid: string, body: Record<string, any>) => {
  const headers = await adminHeaders();
  const me = await firestoreDocument(`users/${uid}`, headers);
  if (body.action === "service_catalog") {
    const result = await fetch(`${firestoreUrl}/livestockCategories?pageSize=1000`, { headers });
    if (!result.ok) throw new Error(`Could not load approved breeds (HTTP ${result.status}).`);
    const categories = await result.json();
    const additionalBreeds = (categories.documents || []).flatMap((document: any) => {
      const data = decodeFirestoreFields(document.fields);
      const animalTypeId = normalizeAnimalType(data.name || data.type);
      if (!animalTypeId || !["goat", "horse"].includes(animalTypeId) || !Array.isArray(data.breeds)) return [];
      const categoryId = document.name.split("/").pop();
      return data.breeds.filter((name: unknown) => typeof name === "string" && name.trim()).map((name: string) => ({
        id: `approved-${categoryId}-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        sourceCategoryId: categoryId, animalTypeId, name: name.trim(),
      }));
    });
    return { additionalBreeds };
  }
  if (!me || me.role !== "farmer" || !["active", "pending"].includes(me.status)) throw Object.assign(new Error("Only an active farmer can submit a service request."), { status: 403 });
  if (body.action === "relevant_technicians") {
    const animals = await firestoreQuery("animals", [firestoreFilter("ownerId", "EQUAL", uid)], headers);
    const animalTypes = new Set(animals.map(animal => normalizeAnimalType(animal.animalTypeId || animal.type || animal.name)).filter(Boolean));
    if (!animalTypes.size) return { technicians: [] };
    const technicians = await firestoreQuery("users", [firestoreFilter("role", "EQUAL", "technician"), firestoreFilter("status", "EQUAL", "active")], headers);
    return { technicians: filterRelevantTechnicians(technicians, animalTypes).map(({ id, displayName, photoURL, specialization, expertise, specializationIds, subSpecializationIds, qualificationKeys, qualificationVerified, available, availabilitySlots, alwaysAvailable, alwaysAvailableEnabled, timezone, rating, reviewCount }: any) => ({
      id, role: "technician", status: "active", displayName: displayName || "Technician", photoURL: photoURL || "", specialization: specialization || "", expertise: expertise || [],
      specializationIds: specializationIds || [], subSpecializationIds: subSpecializationIds || [], qualificationKeys: qualificationKeys || [], qualificationVerified, available: available !== false,
      availabilitySlots: availabilitySlots || [], alwaysAvailable: alwaysAvailable || [], alwaysAvailableEnabled: alwaysAvailableEnabled !== false, timezone: timezone || "Asia/Manila", rating: rating || 0, reviewCount: reviewCount || 0,
    })) };
  }
  const animalTypeId = normalizeAnimalType(body.animalTypeId);
  const serviceTypeId = String(body.serviceTypeId || "");
  const animalRecordId = typeof body.animalRecordId === "string" ? body.animalRecordId.trim() : "";
  const date = body.date, time = body.time, description = body.description;
  if (body.action === "eligible_technicians") {
    if (!animalTypeId || !technicianCatalog.subSpecializations.some(item => item.animalTypeId === animalTypeId && item.serviceTypeId === serviceTypeId)) throw Object.assign(new Error("That animal and service combination is not supported."), { status: 400 });
    const filters = [firestoreFilter("role", "EQUAL", "technician"), firestoreFilter("status", "EQUAL", "active"), firestoreFilter("qualificationKeys", "ARRAY_CONTAINS", `${animalTypeId}:${serviceTypeId}`)];
    const technicians = await firestoreQuery("users", filters, headers);
    let appointments: any[] = [];
    if (date || time) {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || timeMinutes(time) === null) throw Object.assign(new Error("A valid date and time are required."), { status: 400 });
      appointments = await firestoreQuery("appointments", [firestoreFilter("date", "EQUAL", date)], headers);
    }
    return { technicians: technicians.filter((tech: any) => tech.qualificationVerified === true && tech.available !== false &&
      (!date || (scheduledAt(tech, date, time) && !appointments.some((item: any) => item.technicianId === tech.id && appointmentActive(item) && timeConflict(date, time, item)))))
      .map(({ id, displayName, photoURL, rating, availabilitySlots, alwaysAvailable, alwaysAvailableEnabled, qualificationKeys, qualificationVerified, specialization }: any) => ({
        id, displayName: displayName || "Technician", photoURL: photoURL || "", rating: rating || 0, qualificationKeys: qualificationKeys || [],
        qualificationVerified: qualificationVerified === true, specialization: specialization || "", availabilitySlots: availabilitySlots || [],
        alwaysAvailable: alwaysAvailable || [], alwaysAvailableEnabled: alwaysAvailableEnabled !== false,
      })) };
  }

  if (body.action !== "create_service_request") throw new Error("Unknown service action.");
  if (body.technicianId !== undefined && typeof body.technicianId !== "string") throw Object.assign(new Error("Invalid technician selection."), { status: 422 });
  if (!animalTypeId || !technicianCatalog.subSpecializations.some(item => item.animalTypeId === animalTypeId && item.serviceTypeId === serviceTypeId) || !serviceTypes.some(item => item.id === serviceTypeId)) throw Object.assign(new Error("That animal and service combination is not supported."), { status: 422 });
  if (!animalRecordId) throw Object.assign(new Error("Select one of your registered animals."), { status: 422 });
  const animal = await firestoreDocument(`animals/${encodeURIComponent(animalRecordId)}`, headers);
  if (!animal || animal.ownerId !== uid) throw Object.assign(new Error("That animal record does not belong to your account."), { status: 422 });
  if (normalizeAnimalType(animal.type || animal.name) !== animalTypeId) throw Object.assign(new Error("The selected animal record does not match the chosen animal type."), { status: 422 });
  const quantity = Number(body.animalQuantity);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000 || quantity > Number(animal.count || 1)) throw Object.assign(new Error("Enter a valid animal quantity."), { status: 422 });
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || timeMinutes(time) === null || typeof description !== "string" || description.length > 5000) throw Object.assign(new Error("Enter a valid date, time, and request description."), { status: 422 });
  if (!Number.isFinite(body.appointmentLatitude) || body.appointmentLatitude < -90 || body.appointmentLatitude > 90 || !Number.isFinite(body.appointmentLongitude) || body.appointmentLongitude < -180 || body.appointmentLongitude > 180 || (body.appointmentLocationAccuracy !== null && (!Number.isFinite(body.appointmentLocationAccuracy) || body.appointmentLocationAccuracy > 50))) throw Object.assign(new Error("A valid service location is required."), { status: 422 });
  const [year, month, day] = date.split("-").map(Number);
  if (new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== date || Date.UTC(year, month - 1, day) + timeMinutes(time)! * 60000 - 8 * 3600000 <= Date.now()) throw Object.assign(new Error("Choose a future date and time."), { status: 422 });

  const breedId = typeof body.animalBreedId === "string" ? body.animalBreedId : "";
  const staticBreeds: Record<string, { id: string; name: string }[]> = {
    pig: [{ id: "pig-large-white", name: "Large White" }, { id: "pig-landrace", name: "Landrace" }, { id: "pig-duroc", name: "Duroc" }, { id: "pig-pietrain", name: "Pietrain" }, { id: "pig-hampshire", name: "Hampshire" }],
    cattle: [{ id: "cattle-brahman", name: "Brahman" }, { id: "cattle-holstein", name: "Holstein" }],
    carabao: [{ id: "carabao-murrah", name: "Murrah" }, { id: "carabao-bulgarian", name: "Bulgarian" }, { id: "carabao-buffalo", name: "Buffalo" }],
  };
  const breedOptions = [...(staticBreeds[animalTypeId] || [])];
  if (["goat", "horse"].includes(animalTypeId)) {
    const categories = await fetch(`${firestoreUrl}/livestockCategories?pageSize=1000`, { headers });
    if (!categories.ok) throw new Error("Could not verify the selected animal breed.");
    for (const document of (await categories.json()).documents || []) {
      const category = decodeFirestoreFields(document.fields), categoryId = document.name.split("/").pop();
      if (normalizeAnimalType(category.name || category.type) !== animalTypeId || !Array.isArray(category.breeds)) continue;
      for (const name of category.breeds) if (typeof name === "string" && name.trim()) breedOptions.push({ id: `approved-${categoryId}-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, name: name.trim() });
    }
  }
  const recordBreed = typeof animal.breed === "string" ? animal.breed.trim() : "";
  const selectedBreed = breedOptions.find(item => item.id === breedId);
  const recordBreedOption = breedOptions.find(item => item.name.toLowerCase() === recordBreed.toLowerCase());
  if (breedOptions.length && (!selectedBreed || !recordBreedOption || selectedBreed.id !== recordBreedOption.id)) throw Object.assign(new Error("Update this animal with an approved breed before requesting service."), { status: 422 });

  const candidates = await firestoreQuery("users", [firestoreFilter("role", "EQUAL", "technician"), firestoreFilter("status", "EQUAL", "active"), firestoreFilter("qualificationKeys", "ARRAY_CONTAINS", `${animalTypeId}:${serviceTypeId}`)], headers);
  const appointments = await firestoreQuery("appointments", [firestoreFilter("date", "EQUAL", date)], headers);
  const available = candidates.filter((tech: any) => tech.qualificationVerified === true && tech.available !== false && scheduledAt(tech, date, time) &&
    !appointments.some((item: any) => item.technicianId === tech.id && appointmentActive(item) && timeConflict(date, time, item)));
  const technicianId = typeof body.technicianId === "string" ? body.technicianId : "";
  const recipients = technicianId ? available.filter((tech: any) => tech.id === technicianId) : available;
  if (!recipients.length) throw Object.assign(new Error(technicianId ? "The selected technician is not qualified or available for this animal, service, and time." : "No active, qualified technician is available for this animal, service, and time."), { status: 422 });
  const tech = technicianId ? recipients[0] : null;
  const appointmentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const serviceType = serviceTypes.find(item => item.id === serviceTypeId)!.name;
  const appointment = {
    serviceTypeId, serviceType, animalTypeId, animalType: animalNames[animalTypeId], animalName: animal.name || animalNames[animalTypeId], animalRecordId,
    animalBreedId: breedId, animalBreed: selectedBreed?.name || recordBreed, animalQuantity: quantity, farmerId: uid,
    farmerName: me.displayName || me.name || "Farmer", technicianId: tech?.id || "", technicianName: tech?.displayName || "Unassigned",
    eligibleTechnicianIds: recipients.map((item: any) => item.id), requestMode: tech ? "direct" : "general", declinedByTechnicianIds: [],
    date, time, status: "pending", description: description.trim(), location: typeof body.location === "string" ? body.location.slice(0, 500) : "",
    appointmentLatitude: body.appointmentLatitude, appointmentLongitude: body.appointmentLongitude, appointmentLocationAccuracy: body.appointmentLocationAccuracy,
    createdAt: now, updatedAt: now,
  };
  const write = await fetch(`${firestoreUrl}/appointments?documentId=${appointmentId}`, {
    method: "POST", headers,
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(appointment).map(([key, value]) => [key,
      ["createdAt", "updatedAt", "responseDeadlineAt"].includes(key) ? encodeFirestoreTimestamp(value) : encodeFirestoreValue(value),
    ])) }),
  });
  if (!write.ok) throw new Error(`Could not save service request (HTTP ${write.status}).`);
  let notificationsQueued = true;
  try {
    for (let i = 0; i < recipients.length; i += 450) {
      const writes = recipients.slice(i, i + 450).map((recipient: any) => ({
        update: { name: `${firestoreResource}/notifications/service-request-${appointmentId}-${recipient.id}`, fields: Object.fromEntries(Object.entries({
          userId: recipient.id, type: "service_request", title: "New Service Request", body: `${serviceType} requested for ${animalNames[animalTypeId]} on ${date} at ${time}.`,
          read: false, data: { appointmentId }, createdAt: now,
        }).map(([key, value]) => [key, key === "createdAt" ? encodeFirestoreTimestamp(String(value)) : encodeFirestoreValue(value)])) },
      }));
      const commit = await fetch(`${firestoreUrl}:commit`, { method: "POST", headers, body: JSON.stringify({ writes }) });
      if (!commit.ok) { notificationsQueued = false; break; }
    }
  } catch { notificationsQueued = false; }
  return { appointmentId, eligibleTechnicianCount: recipients.length, notificationsQueued };
};

const acceptServiceAction = async (uid: string, body: Record<string, any>) => {
  const appointmentId = typeof body.appointmentId === "string" ? body.appointmentId.trim() : "";
  if (!appointmentId) throw Object.assign(new Error("A valid request ID is required."), { status: 422 });
  const headers = await adminHeaders();
  const begin = await fetch(`${firestoreUrl}:beginTransaction`, { method: "POST", headers, body: JSON.stringify({}) });
  if (!begin.ok) throw new Error(`Could not start request acceptance (HTTP ${begin.status}).`);
  const { transaction } = await begin.json();
  try {
    const [appointment, tech] = await Promise.all([
      firestoreDocument(`appointments/${encodeURIComponent(appointmentId)}`, headers, transaction),
      firestoreDocument(`users/${uid}`, headers, transaction),
    ]);
    if (!appointment) throw Object.assign(new Error("This request no longer exists."), { status: 422 });
    if (!tech || tech.role !== "technician" || tech.status !== "active") throw Object.assign(new Error("Only an active technician can accept a request."), { status: 422 });
    if (appointment.status === "confirmed" && appointment.technicianId === uid) {
      await fetch(`${firestoreUrl}:commit`, { method: "POST", headers, body: JSON.stringify({ transaction, writes: [] }) });
      return { alreadyAccepted: true, previousTechnicianId: uid, existingCalendarEventId: appointment.calendarEventId || null };
    }
    if (appointment.status !== "pending") throw Object.assign(new Error("This request is no longer pending."), { status: 422 });
    if (appointment.declinedByTechnicianIds?.includes(uid)) throw Object.assign(new Error("You already declined this request."), { status: 422 });
    const previousTechnicianId = appointment.technicianId || "";
    const expired = !!appointment.responseDeadlineAt && Date.parse(appointment.responseDeadlineAt) <= Date.now();
  if (previousTechnicianId === uid && expired && appointment.requestMode !== "direct") throw Object.assign(new Error("The response window expired. The request is being shared with other qualified technicians."), { status: 422 });
    if (previousTechnicianId && previousTechnicianId !== uid && !expired) throw Object.assign(new Error("This request is reserved for another technician."), { status: 422 });
    if (appointment.animalTypeId && appointment.serviceTypeId) {
      const type = normalizeAnimalType(appointment.animalTypeId);
      if (!type || tech.qualificationVerified !== true || !tech.qualificationKeys?.includes(`${type}:${appointment.serviceTypeId}`) || !appointment.eligibleTechnicianIds?.includes(uid) || (appointment.requestMode === "direct" && appointment.technicianId !== uid)) {
        throw Object.assign(new Error("You are not qualified or eligible to accept this service request."), { status: 422 });
      }
    } else if (previousTechnicianId !== uid) throw Object.assign(new Error("Legacy requests can only be accepted by their previously assigned technician."), { status: 422 });
    if (tech.available === false || !scheduledAt(tech, appointment.date, appointment.time)) throw Object.assign(new Error("You are not available for this request's scheduled time."), { status: 422 });

    const assigned = await firestoreQuery("appointments", [firestoreFilter("technicianId", "EQUAL", uid)], headers, transaction);
    const otherAssigned = assigned.filter(item => item.id !== appointmentId);
    if (otherAssigned.some(item => appointmentActive(item) && timeConflict(appointment.date, appointment.time, item))) throw Object.assign(new Error("Complete your current service before accepting another request."), { status: 422 });
    const hasDailyLimit = Number.isInteger(tech.maxRequestsPerDay) && tech.maxRequestsPerDay > 0;
    if (hasDailyLimit && !appointment.date) throw Object.assign(new Error("This request has no scheduled date, so its daily limit cannot be checked."), { status: 422 });
    const writes: Record<string, unknown>[] = [];
    if (appointment.date) {
      const dailyPath = `users/${uid}/dailyRequestCounts/${appointment.date}`;
      const daily = await firestoreDocument(dailyPath, headers, transaction);
      const acceptedForDay = otherAssigned.filter(item => item.date === appointment.date && ["confirmed", "upcoming", "completed"].includes(item.status)).length;
      const storedCount = daily?.acceptedCount;
      const currentCount = Number.isInteger(storedCount) && storedCount >= 0 ? storedCount : acceptedForDay;
      if (hasDailyLimit && currentCount >= tech.maxRequestsPerDay) throw Object.assign(new Error(`You reached your limit of ${tech.maxRequestsPerDay} accepted requests for ${appointment.date}.`), { status: 422 });
      writes.push({ update: { name: `${firestoreResource}/${dailyPath}`, fields: { acceptedCount: encodeFirestoreValue(currentCount + 1), updatedAt: encodeFirestoreTimestamp(new Date().toISOString()) } }, updateMask: { fieldPaths: ["acceptedCount", "updatedAt"] } });
    }
    writes.push({ update: { name: `${firestoreResource}/appointments/${appointmentId}`, fields: {
      status: encodeFirestoreValue("confirmed"), technicianId: encodeFirestoreValue(uid), technicianName: encodeFirestoreValue(tech.displayName || "Technician"),
    } }, updateMask: { fieldPaths: ["status", "technicianId", "technicianName", "responseDeadlineAt"] } });
    const activeIds = [...new Set([...(Array.isArray(tech.activeAppointmentIds) ? tech.activeAppointmentIds : []), appointmentId])];
    writes.push({ update: { name: `${firestoreResource}/users/${uid}`, fields: {
      activeAppointmentId: encodeFirestoreValue(appointmentId), activeAppointmentIds: encodeFirestoreValue(activeIds),
    } }, updateMask: { fieldPaths: ["activeAppointmentId", "activeAppointmentIds"] } });
    const commit = await fetch(`${firestoreUrl}:commit`, { method: "POST", headers, body: JSON.stringify({ transaction, writes }) });
    if (!commit.ok) {
      const detail = await commit.text();
      let message = "Firestore rejected the transaction.";
      try { message = JSON.parse(detail).error?.message || message; } catch { message = detail.slice(0, 200) || message; }
      console.error("[Service Request] Firestore accept commit rejected", commit.status, message);
      throw Object.assign(new Error(`Request acceptance could not be committed (HTTP ${commit.status}): ${message}`), { status: 422 });
    }
    return { alreadyAccepted: false, previousTechnicianId, existingCalendarEventId: null };
  } catch (error) {
    await fetch(`${firestoreUrl}:rollback`, { method: "POST", headers, body: JSON.stringify({ transaction }) }).catch(() => {});
    throw error;
  }
};

const updateTechnicianQualifications = async (req: Request, body: Record<string, unknown>) => {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return { status: 401, body: { error: "Authentication required." } };
  const claims = await verifyFirebaseToken(token);
  const specializationIds = body.specializationIds;
  const subSpecializationIds = body.subSpecializationIds;
  if (!Array.isArray(specializationIds) || !Array.isArray(subSpecializationIds) || !specializationIds.length || !subSpecializationIds.length ||
    specializationIds.some(id => typeof id !== "string") || subSpecializationIds.some(id => typeof id !== "string")) {
    return { status: 400, body: { error: "Select at least one specialization and service." } };
  }
  if (new Set(specializationIds).size !== specializationIds.length || new Set(subSpecializationIds).size !== subSpecializationIds.length) {
    return { status: 400, body: { error: "Duplicate qualifications are not allowed." } };
  }
  const selectedSpecializations = new Set(specializationIds as string[]);
  const selectedSubs = (subSpecializationIds as string[]).map(id => technicianCatalog.subSpecializations.find(item => item.id === id));
  if ((specializationIds as string[]).some(id => !technicianCatalog.specializations.some(item => item.id === id)) ||
    selectedSubs.some(item => !item || !selectedSpecializations.has(item.specializationId))) {
    return { status: 400, body: { error: "One or more selected qualifications are invalid." } };
  }
  if ((specializationIds as string[]).some(id => !selectedSubs.some(item => item?.specializationId === id))) {
    return { status: 400, body: { error: "Choose at least one service under every selected animal specialization." } };
  }

  const uid = claims.sub;
  const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
  const accessToken = await firebaseAdminAccessToken();
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const existing = await fetch(docUrl, { headers });
  if (existing.status === 404) return { status: 403, body: { error: "Technician profile not found." } };
  if (!existing.ok) throw new Error(`Could not load technician profile (HTTP ${existing.status}).`);
  const profile = await existing.json();
  const fields = profile.fields || {};
  if (fields.role?.stringValue !== "technician" || !["pending", "active"].includes(fields.status?.stringValue)) {
    return { status: 403, body: { error: "Only an active or pending technician can update qualifications." } };
  }

  const subs = selectedSubs as NonNullable<typeof selectedSubs[number]>[];
  const serviceIds = subSpecializationIds as string[];
  const query = new URLSearchParams();
  ["specializationIds", "subSpecializationIds", "qualificationKeys", "qualificationVerified", "qualificationCatalogVersion", "expertise", "specialization", "updatedAt"]
    .forEach(field => query.append("updateMask.fieldPaths", field));
  const saved = await fetch(`${docUrl}?${query}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields: {
      specializationIds: { arrayValue: { values: (specializationIds as string[]).map(stringValue => ({ stringValue })) } },
      subSpecializationIds: { arrayValue: { values: serviceIds.map(stringValue => ({ stringValue })) } },
      qualificationKeys: { arrayValue: { values: [...new Set(subs.map(item => `${item.animalTypeId}:${item.serviceTypeId}`))].map(stringValue => ({ stringValue })) } },
      qualificationVerified: { booleanValue: true },
      qualificationCatalogVersion: { integerValue: "1" },
      expertise: { arrayValue: { values: subs.map(item => ({ stringValue: item.name })) } },
      specialization: { stringValue: (specializationIds as string[]).map(id => technicianCatalog.specializations.find(item => item.id === id)!.name).join(", ") },
      updatedAt: { timestampValue: new Date().toISOString() },
    } }),
  });
  if (!saved.ok) throw new Error(`Could not save technician qualifications (HTTP ${saved.status}).`);
  return { status: 200, body: { ok: true } };
};

if (import.meta.main) Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: jsonHeaders });
  if (req.method !== "POST") return response(405, { error: "Method not allowed." });

  let stage = "parse_request";
  try {
    let body: Record<string, any>;
    let identityFile: File | null = null;
    let proofFile: File | null = null;
    if (req.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      const form = await req.formData();
      body = { action: form.get("action") };
      const identity = form.get("identity"), proof = form.get("proof");
      if (identity instanceof File) identityFile = identity;
      if (proof instanceof File) proofFile = proof;
      const profile = form.get("profile"), challengeToken = form.get("challengeToken");
      if (typeof profile === "string") body.profile = JSON.parse(profile);
      if (typeof challengeToken === "string") body.challengeToken = challengeToken;
    } else body = await req.json();
    stage = ["request", "verify", "complete", "update_technician_qualifications", "service_catalog", "relevant_technicians", "eligible_technicians", "create_service_request", "accept_service_request", "start_farmer_profile_verification", "complete_farmer_profile_verification", "upload_registration_documents", "get_identity_preview"].includes(body.action) ? body.action : "unknown_action";
    if (body.action === "update_technician_qualifications") {
      const result = await updateTechnicianQualifications(req, body);
      return response(result.status, result.body);
    }
    if (["service_catalog", "relevant_technicians", "eligible_technicians", "create_service_request", "accept_service_request", "start_farmer_profile_verification", "complete_farmer_profile_verification", "upload_registration_documents", "get_identity_preview"].includes(body.action)) {
      const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) return response(401, { error: "Authentication required." });
      const claims = await verifyFirebaseToken(token);
      try {
        if (body.action === "accept_service_request") return response(200, await acceptServiceAction(claims.sub, body));
        if (body.action === "upload_registration_documents") return response(201, await uploadRegistrationDocumentsAction(claims.sub, identityFile, proofFile));
        if (body.action === "get_identity_preview") return response(200, await identityPreviewAction(claims.sub, body.targetUserId, body.documentField));
        if (body.action === "start_farmer_profile_verification" || body.action === "complete_farmer_profile_verification") return response(200, await profileUpdateAction(claims.sub, body));
        return response(body.action === "create_service_request" ? 201 : 200, await createServiceAction(claims.sub, body));
      } catch (error) {
        const status = Number((error as any)?.status) || 500;
        return response(status, { error: error instanceof Error ? error.message : "Service request failed." });
      }
    }
    const email = String(body.email || "").trim().toLowerCase();
    if (!validEmail(email)) return response(400, { error: "Enter a valid email address." });
    const emailHash = await sha256(email);

    if (body.action === "request") {
      stage = "request_rate_limit";
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const code = randomCode();
      const codeHash = await hmac(`${email}:${salt}:${code}`);
      const forwardedIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
      const retryAfter = Number(await rpc("request_registration_email_otp", {
        p_email_hash: emailHash,
        p_ip_hash: await sha256(forwardedIp),
        p_salt: salt,
        p_code_hash: codeHash,
      }));
      if (retryAfter > 0) {
        console.log("Registration email OTP rate limited.");
        return response(429, { error: `Please wait ${retryAfter} seconds before requesting another code.` });
      }

      stage = "resend_request";
      const apiKey = Deno.env.get("RESEND_API_KEY");
      const from = Deno.env.get("EMAIL_FROM");
      if (!apiKey || !from) throw new Error("Missing Resend configuration.");
      const emailResult = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `registration-otp-${emailHash}-${Date.now()}` },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "AgriCare email verification code",
          text: `Your AgriCare verification code is ${code}. It expires in 10 minutes.`,
          html: `<p>Your AgriCare verification code is:</p><h2>${code}</h2><p>It expires in 10 minutes.</p>`,
        }),
      });
      if (!emailResult.ok) {
        await rpc("clear_registration_email_otp", { p_email_hash: emailHash });
        console.error("Resend rejected registration OTP:", emailResult.status);
        return response(502, { error: `Email provider rejected the request (HTTP ${emailResult.status}). Check RESEND_API_KEY and EMAIL_FROM.` });
      }
      console.log("Registration OTP email accepted by Resend.");
      return response(200, { ok: true });
    }

    if (body.action === "verify") {
      const code = String(body.code || "");
      if (!/^\d{6}$/.test(code)) return response(400, { error: "Enter the 6-digit code sent to your email." });
      const saltResult = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/registration_email_otp_state?email_hash=eq.${emailHash}&select=salt`, {
        headers: { apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      });
      if (!saltResult.ok) throw new Error("Could not check the verification code.");
      const rows = await saltResult.json();
      if (!rows[0]?.salt) return response(400, { error: "The code expired. Request a new one." });
      const codeHash = await hmac(`${email}:${rows[0].salt}:${code}`);
      const ticket = hex(crypto.getRandomValues(new Uint8Array(32)));
      const verifiedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const result = await rpc("verify_registration_email_otp", {
        p_email_hash: emailHash,
        p_code_hash: codeHash,
        p_verified_until: verifiedUntil,
        p_ticket_hash: await hmac(`${emailHash}:ticket:${ticket}`),
      });
      if (result !== "verified") {
        const error = result === "locked" ? "Too many attempts. Request a new code." : result === "expired" ? "The code expired. Request a new one." : result === "already_verified" ? "Request a new code to continue registration." : "That code is incorrect.";
        return response(result === "locked" ? 429 : 400, { error });
      }
      return response(200, { ok: true, ticket });
    }

    if (body.action === "complete") {
      const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) return response(401, { error: "Authentication required." });
      const ticket = String(body.ticket || "");
      if (!/^[a-f0-9]{64}$/.test(ticket)) {
        console.error("OTP completion rejected: malformed ticket", { length: ticket.length });
        return response(403, { error: "Verify your email with a new code before registering." });
      }
      const claims = await verifyFirebaseToken(token);
      if (claims.email.toLowerCase() !== email) {
        console.error("OTP completion rejected: Firebase email mismatch.");
        return response(403, { error: "Verified email does not match this account." });
      }
      const canClaim = await rpc("claim_registration_email_otp", {
        p_email_hash: emailHash,
        p_uid: claims.sub,
        p_ticket_hash: await hmac(`${emailHash}:ticket:${ticket}`),
      });
      if (!canClaim) {
        console.error("OTP completion rejected: database ticket claim returned false.");
        return response(403, { error: "Verify your email with a new code before registering." });
      }
      console.log("OTP completion ticket claim succeeded.");
      try {
        await firebaseAdminUpdateEmailVerified(claims.sub);
      } catch (error) {
        console.error("OTP verified, but Firebase emailVerified sync failed:", error instanceof Error ? error.message : error);
      }
      await rpc("consume_registration_email_otp", { p_email_hash: emailHash, p_uid: claims.sub });
      return response(200, { ok: true });
    }
    return response(400, { error: "Unknown email verification action." });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error("Registration email OTP failed at", stage, detail);
    return response(500, { error: ["update_technician_qualifications", "service_catalog", "relevant_technicians", "eligible_technicians", "create_service_request", "accept_service_request", "start_farmer_profile_verification", "complete_farmer_profile_verification", "upload_registration_documents", "get_identity_preview"].includes(stage) ? detail : "Email verification is temporarily unavailable." });
  }
});

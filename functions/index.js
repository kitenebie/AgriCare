/**
 * Cloud Function — FCM Push Queue Processor
 *
 * Listens to new documents in "pushQueue" collection.
 * When admin approves/rejects a user, the app writes to pushQueue.
 * This function picks it up and sends the actual FCM notification.
 */

const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret, defineString } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getMessaging } = require("firebase-admin/messaging");
const { FieldValue, Timestamp, getFirestore } = require("firebase-admin/firestore");

initializeApp();

const resendApiKey = defineSecret("RESEND_API_KEY");
const emailFrom = defineString("EMAIL_FROM");
const emailOtpSecret = defineSecret("REGISTRATION_OTP_SECRET");
const faceMatchApiKey = defineSecret("FACE_MATCH_API_KEY");
const supabaseUrl = defineString("SUPABASE_URL", { default: process.env.EXPO_PUBLIC_SUPABASE_URL || "" });
const crypto = require("node:crypto");
const serviceCatalog = require("./shared/technicianServiceCatalog.json");
const { normalizeAnimalTypeId, qualificationKey, validateQualifications, eligibleTechnicians, canAcceptServiceRequest } = require("./shared/technicianServiceMatching");
const { toPublicProfile } = require("./shared/publicProfile");
const { normalizeFarmerProfileUpdate, hashFarmerProfileUpdate, parseLiveFaceImage } = require("./shared/farmerProfileUpdate");

const otpCollection = "registrationEmailOtps";
const otpHash = (email, salt, code) =>
  crypto.createHmac("sha256", emailOtpSecret.value()).update(`${email}:${salt}:${code}`).digest("hex");
const emailHash = (email) => crypto.createHash("sha256").update(email).digest("hex");
const otpProof = (hash, expiresAt) =>
  crypto.createHmac("sha256", emailOtpSecret.value()).update(`${hash}:${expiresAt}`).digest("hex");
const validEmail = (email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const setOtpCors = (res) => res.set({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
});
const isEqualHash = (actual, expected) => {
  const a = Buffer.from(String(actual || ""));
  const b = Buffer.from(String(expected || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const authenticatedUser = async (req) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new Error("Authentication required.");
  return getAuth().verifyIdToken(token, true);
};

const farmerIdImageUrl = (value) => {
  let url;
  let origin;
  try { url = new URL(value); origin = new URL(supabaseUrl.value()).origin; }
  catch { throw Object.assign(new Error("Your original registration ID is unavailable."), { statusCode: 422 }); }
  if (url.protocol !== "https:" || url.origin !== origin || !url.pathname.startsWith("/storage/v1/object/public/farmers_proof/") || url.username || url.password || url.search || url.hash) {
    throw Object.assign(new Error("Your original registration ID is unavailable."), { statusCode: 422 });
  }
  return url;
};

const profileUpdateChallengeRef = (db, uid) => db.collection("users").doc(uid);
const challengeTokenHash = token => crypto.createHash("sha256").update(token).digest("hex");
const requestError = (message, statusCode = 422) => Object.assign(new Error(message), { statusCode });

exports.startFarmerProfileVerification = onRequest({ cors: true }, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const decoded = await authenticatedUser(req);
    const patch = normalizeFarmerProfileUpdate(req.body?.profile);
    const db = getFirestore();
    const userRef = profileUpdateChallengeRef(db, decoded.uid);
    const userSnapshot = await userRef.get();
    const user = userSnapshot.data();
    if (!userSnapshot.exists || user?.role !== "farmer" || user.status !== "active") throw requestError("Only an active farmer can update this profile.", 403);
    farmerIdImageUrl(user.idImageUrl);
    const challengeToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = Timestamp.fromMillis(Date.now() + 5 * 60 * 1000);
    await userRef.update({ profileUpdateChallenge: {
      tokenHash: challengeTokenHash(challengeToken),
      profileHash: hashFarmerProfileUpdate(patch),
      expiresAt,
      attempts: 0,
    } });
    return res.status(200).json({ challengeToken, expiresAt: expiresAt.toMillis() });
  } catch (error) {
    return res.status(error.statusCode || (error.code?.startsWith("auth/") || error.message === "Authentication required." ? 401 : 500))
      .json({ error: error.message || "Could not start identity verification." });
  }
});

exports.completeFarmerProfileVerification = onRequest({ cors: true, secrets: [faceMatchApiKey] }, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  let userRef;
  let lockId;
  try {
    const decoded = await authenticatedUser(req);
    const patch = normalizeFarmerProfileUpdate(req.body?.profile);
    const face = parseLiveFaceImage(req.body?.faceImage);
    const token = req.body?.challengeToken;
    if (typeof token !== "string" || token.length < 32 || token.length > 128) throw requestError("Start a new identity verification and try again.");
    const db = getFirestore();
    userRef = profileUpdateChallengeRef(db, decoded.uid);
    lockId = crypto.randomUUID();
    const profileHash = hashFarmerProfileUpdate(patch);
    const claim = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(userRef);
      const user = snapshot.data();
      const challenge = user?.profileUpdateChallenge;
      if (!snapshot.exists || user?.role !== "farmer" || user.status !== "active") throw requestError("Only an active farmer can update this profile.", 403);
      if (!challenge || challenge.tokenHash !== challengeTokenHash(token) || challenge.profileHash !== profileHash) throw requestError("Verification expired or does not match these profile changes. Start again.");
      const expiresAt = challenge.expiresAt?.toMillis?.() || 0;
      if (expiresAt <= Date.now()) throw requestError("Verification expired. Start again.");
      if ((Number(challenge.attempts) || 0) >= 3) throw requestError("Too many attempts. Start a new verification.", 429);
      if ((challenge.lockUntil?.toMillis?.() || 0) > Date.now()) throw requestError("Verification is already in progress.", 409);
      farmerIdImageUrl(user.idImageUrl);
      transaction.update(userRef, {
        "profileUpdateChallenge.attempts": (Number(challenge.attempts) || 0) + 1,
        "profileUpdateChallenge.lockId": lockId,
        "profileUpdateChallenge.lockUntil": Timestamp.fromMillis(Date.now() + 2 * 60 * 1000),
      });
      return { originalIdUrl: user.idImageUrl };
    });

    const idResponse = await fetch(farmerIdImageUrl(claim.originalIdUrl), { redirect: "error" });
    if (!idResponse.ok) throw requestError("Your original registration ID could not be loaded. Contact support.", 422);
    const idContentType = idResponse.headers.get("content-type")?.split(";")[0] || "";
    const allowedIdTypes = ["image/jpeg", "image/png", "image/webp"];
    const idBytes = Buffer.from(await idResponse.arrayBuffer());
    if (!allowedIdTypes.includes(idContentType) || !idBytes.length || idBytes.length > 8 * 1024 * 1024) throw requestError("Your original registration ID could not be loaded. Contact support.", 422);

    const form = new FormData();
    form.append("reference_image", new Blob([idBytes], { type: idContentType }), "registration-id.jpg");
    form.append("compare_image", new Blob([face.bytes], { type: face.mimeType }), "live-face.jpg");
    const matchResponse = await fetch("https://meet.earms.site/api/v1/match", {
      method: "POST",
      headers: { Accept: "*/*", "X-API-Key": faceMatchApiKey.value() },
      body: form,
    });
    const matchResult = await matchResponse.json().catch(() => ({}));
    if (!matchResponse.ok || matchResult.match !== true) {
      const detail = typeof matchResult.detail === "string" ? matchResult.detail : "Your live face did not match the original registration ID.";
      throw requestError(detail, matchResponse.status >= 500 ? 503 : 422);
    }

    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(userRef);
      const user = snapshot.data();
      const challenge = user?.profileUpdateChallenge;
      if (!snapshot.exists || user?.role !== "farmer" || user.status !== "active" ||
          challenge?.tokenHash !== challengeTokenHash(token) || challenge?.profileHash !== profileHash || challenge?.lockId !== lockId ||
          (challenge.expiresAt?.toMillis?.() || 0) <= Date.now() || user.idImageUrl !== claim.originalIdUrl) {
        throw requestError("Verification expired or the source ID changed. Start again.");
      }
      transaction.update(userRef, { ...patch, profileUpdatedAt: FieldValue.serverTimestamp(), profileUpdateChallenge: FieldValue.delete() });
    });
    await getAuth().updateUser(decoded.uid, { displayName: patch.displayName }).catch(() => {});
    return res.status(200).json({ verified: true, message: "Identity verified and profile updated." });
  } catch (error) {
    if (userRef && lockId) {
      await getFirestore().runTransaction(async transaction => {
        const snapshot = await transaction.get(userRef);
        if (snapshot.data()?.profileUpdateChallenge?.lockId === lockId) {
          transaction.update(userRef, {
            "profileUpdateChallenge.lockId": FieldValue.delete(),
            "profileUpdateChallenge.lockUntil": FieldValue.delete(),
          });
        }
      }).catch(() => {});
    }
    console.error("[Farmer Profile Verification] Request failed", error.statusCode || error.code || "unknown");
    return res.status(error.statusCode || (error.code?.startsWith("auth/") || error.message === "Authentication required." ? 401 : 503))
      .json({ error: error.message || "Identity verification could not be completed." });
  }
});

const seedServiceCatalog = async () => {
  const db = getFirestore();
  const versionRef = db.collection("serviceCatalogMeta").doc("current");
  const version = await versionRef.get();
  if (version.data()?.version === 1) return;
  const batch = db.batch();
  const collections = [
    ["animalTypes", serviceCatalog.animalTypes],
    ["animalBreeds", serviceCatalog.breeds],
    ["serviceTypes", serviceCatalog.serviceTypes],
    ["specializations", serviceCatalog.specializations],
    ["subSpecializations", serviceCatalog.subSpecializations],
  ];
  for (const [collectionName, items] of collections) {
    for (const item of items) batch.set(db.collection(collectionName).doc(item.id), { ...item, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  batch.set(versionRef, { version: 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();
};

const timeMinutes = (value) => {
  const match = typeof value === "string" && value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 12 || Number(match[2]) > 59) return null;
  return ((Number(match[1]) % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(match[2]);
};
const timeInRange = (time, start, end) => {
  const minutes = timeMinutes(time);
  const startMinutes = timeMinutes(start);
  const endMinutes = timeMinutes(end);
  return minutes !== null && startMinutes !== null && endMinutes !== null && startMinutes !== endMinutes && (startMinutes < endMinutes ? minutes >= startMinutes && minutes < endMinutes : minutes >= startMinutes || minutes < endMinutes);
};
const timeConflict = (date, time, appointment) => {
  const requested = timeMinutes(time);
  const existing = timeMinutes(appointment.time);
  if (requested === null || existing === null || !appointment.date) return true;
  const requestedStart = new Date(`${date}T00:00:00Z`).getTime() + requested * 60000;
  const existingStart = new Date(`${appointment.date}T00:00:00Z`).getTime() + existing * 60000;
  return requestedStart < existingStart + 3600000 && existingStart < requestedStart + 3600000;
};
const isAppointmentActive = (appointment) => appointment.status === "confirmed" || appointment.status === "upcoming" ||
  (appointment.status === "pending" && (appointment.responseDeadlineAt?.toMillis?.() ?? Infinity) > Date.now());
const scheduledAt = (technician, date, time) => {
  const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
  const previousDate = new Date(`${date}T12:00:00Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const previousDateKey = previousDate.toISOString().slice(0, 10);
  const hasSlot = technician.availabilitySlots?.some(slot => {
    const dateMatches = slot.date ? slot.date === date : slot.dayOfWeek === dayOfWeek;
    const previousDateMatches = slot.date ? slot.date === previousDateKey : slot.dayOfWeek === (dayOfWeek + 6) % 7;
    const start = timeMinutes(slot.startTime);
    const end = timeMinutes(slot.endTime);
    const requested = timeMinutes(time);
    const continuesOvernight = start !== null && end !== null && requested !== null && start > end && requested < end;
    return (dateMatches && (slot.startTime && slot.endTime
      ? timeInRange(time, slot.startTime, slot.endTime)
      : typeof slot.time === "string" && slot.time.trim().toUpperCase() === time.trim().toUpperCase())) ||
      (previousDateMatches && continuesOvernight);
  });
  const ranges = Array.isArray(technician.alwaysAvailable) ? technician.alwaysAvailable : technician.alwaysAvailable ? [technician.alwaysAvailable] : [];
  return !!hasSlot || (technician.alwaysAvailableEnabled !== false && ranges.some(range => timeInRange(time, range.startTime, range.endTime)));
};

exports.getServiceCatalog = onRequest({ cors: true }, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    await authenticatedUser(req);
    await seedServiceCatalog();
    const categories = await getFirestore().collection("livestockCategories").get();
    const additionalBreeds = [];
    for (const category of categories.docs) {
      const data = category.data();
      const animalTypeId = normalizeAnimalTypeId(data.name) || normalizeAnimalTypeId(data.type);
      if (!animalTypeId || !["goat", "horse"].includes(animalTypeId) || !Array.isArray(data.breeds)) continue;
      for (const breedName of data.breeds) {
        if (typeof breedName !== "string" || !breedName.trim()) continue;
        const slug = breedName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        additionalBreeds.push({ id: `approved-${category.id}-${slug}`, sourceCategoryId: category.id, animalTypeId, name: breedName.trim() });
      }
    }
    return res.status(200).json({ ...serviceCatalog, additionalBreeds });
  } catch (error) {
    console.error("Service catalog request failed:", error.message);
    return res.status(error.code?.startsWith("auth/") || error.message === "Authentication required." ? 401 : 500).json({ error: error.message || "Could not load service options." });
  }
});

exports.migrateLegacyUserProfile = onRequest({ cors: true }, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const decoded = await authenticatedUser(req);
    const db = getFirestore();
    const targetRef = db.collection("users").doc(decoded.uid);
    if ((await targetRef.get()).exists) return res.status(200).json({ found: true });
    if (typeof decoded.email === "string") {
      const legacy = await db.collection("users").where("email", "==", decoded.email).limit(1).get();
      if (!legacy.empty) {
        await targetRef.set({ ...legacy.docs[0].data(), uid: decoded.uid, updatedAt: FieldValue.serverTimestamp() });
        return res.status(200).json({ found: true });
      }
    }
    return res.status(200).json({ found: false });
  } catch (error) {
    console.error("Legacy profile migration failed:", error.message);
    return res.status(error.code?.startsWith("auth/") || error.message === "Authentication required." ? 401 : 500)
      .json({ error: error.message || "Could not migrate account profile." });
  }
});

exports.syncPublicProfile = onDocumentWritten("users/{userId}", async (event) => {
  const db = getFirestore();
  const profileRef = db.collection("publicProfiles").doc(event.params.userId);
  const profile = toPublicProfile(event.params.userId, event.data?.after?.data());
  if (!profile) return profileRef.delete();
  return profileRef.set(profile);
});

exports.sendPushNotification = onRequest({ cors: true }, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const sender = await authenticatedUser(req);
    const { targetUserId, payload } = req.body || {};
    const type = payload?.data?.type;
    const title = typeof payload?.title === "string" ? payload.title.trim().slice(0, 120) : "";
    const body = typeof payload?.body === "string" ? payload.body.trim().slice(0, 500) : "";
    if (typeof targetUserId !== "string" || !targetUserId || !title || !body || !["new_chat_message", "forum_reply", "forum_react"].includes(type)) {
      return res.status(422).json({ error: "Invalid push notification." });
    }
    if (targetUserId === sender.uid) return res.status(403).json({ error: "Cannot notify yourself." });

    const db = getFirestore();
    if (type === "new_chat_message") {
      if (payload.data.chatId !== [sender.uid, targetUserId].sort().join("_")) {
        return res.status(403).json({ error: "You are not a participant in this chat." });
      }
    } else {
      const postId = payload.data.postId;
      if (typeof postId !== "string" || !postId) return res.status(422).json({ error: "Invalid forum post." });
      const post = await db.collection("communityForum").doc(postId).get();
      if (!post.exists || post.data()?.authorId !== targetUserId) {
        return res.status(403).json({ error: "You cannot notify this forum user." });
      }
    }

    const target = await db.collection("users").doc(targetUserId).get();
    if (!target.exists || target.data()?.status !== "active") return res.status(404).json({ error: "Recipient not found." });
    const token = target.data()?.fcmToken;
    if (typeof token !== "string" || !token) return res.status(200).json({ sent: false });
    const data = Object.fromEntries(Object.entries(payload.data || {})
      .filter(([key, value]) => key !== "type" && typeof value === "string")
      .map(([key, value]) => [key, value.slice(0, 500)]));
    try {
      await getMessaging().send({ token, notification: { title, body }, data: { ...data, type }, android: { priority: "high" } });
    } catch (error) {
      if (["messaging/registration-token-not-registered", "messaging/invalid-argument"].includes(error.code)) {
        await target.ref.update({ fcmToken: FieldValue.delete() });
        return res.status(200).json({ sent: false });
      }
      throw error;
    }
    return res.status(200).json({ sent: true });
  } catch (error) {
    console.error("Push notification request failed:", error.message);
    return res.status(error.code?.startsWith("auth/") || error.message === "Authentication required." ? 401 : 500)
      .json({ error: error.message || "Could not send push notification." });
  }
});

exports.submitTechnicianRating = onRequest({ cors: true }, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const farmer = await authenticatedUser(req);
    const { rateRequestId, rating } = req.body || {};
    if (typeof rateRequestId !== "string" || !rateRequestId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(422).json({ error: "Choose a rating from 1 to 5." });
    }
    const db = getFirestore();
    const rateRequestRef = db.collection("rateRequests").doc(rateRequestId);
    const reviewRef = db.collection("reviews").doc();
    const notificationRef = db.collection("notifications").doc();
    const result = await db.runTransaction(async transaction => {
      const requestSnapshot = await transaction.get(rateRequestRef);
      if (!requestSnapshot.exists) throw new Error("Rating request not found.");
      const request = requestSnapshot.data();
      if (request.farmerId !== farmer.uid || request.status !== "pending") throw new Error("This rating request is no longer available.");
      const technicianRef = db.collection("users").doc(request.technicianId);
      const farmerRef = db.collection("users").doc(farmer.uid);
      const [technicianSnapshot, farmerSnapshot] = await Promise.all([
        transaction.get(technicianRef), transaction.get(farmerRef),
      ]);
      const technician = technicianSnapshot.data();
      const farmerProfile = farmerSnapshot.data();
      if (!technicianSnapshot.exists || technician?.role !== "technician") throw new Error("Technician not found.");
      const oldCount = Number(technician.reviewCount) || 0;
      const newCount = oldCount + 1;
      const newRating = Math.round((((Number(technician.rating) || 0) * oldCount + rating) / newCount) * 10) / 10;
      const farmerName = farmerProfile?.displayName || farmer.name || "Farmer";
      const technicianName = technician.displayName || "Technician";
      const now = FieldValue.serverTimestamp();
      transaction.update(rateRequestRef, { status: "completed", rating, ratedAt: now });
      transaction.update(technicianRef, { rating: newRating, reviewCount: newCount });
      transaction.create(reviewRef, {
        technicianId: request.technicianId, technicianName, farmerId: farmer.uid, farmerName,
        rating, animalName: request.animalName || "", serviceType: request.serviceType || "",
        rateRequestId, createdAt: now,
      });
      transaction.create(notificationRef, {
        userId: request.technicianId, type: "rating_received",
        title: `New Rating: ${"⭐".repeat(rating)}`,
        body: `${farmerName} rated you ${rating}/5 stars${request.animalName ? ` for ${request.animalName}` : ""}! ${rating >= 4 ? "Great job! 🎉" : "Keep improving! 💪"}`,
        read: false, data: { farmerId: farmer.uid, chatId: request.chatId || "", rating, reviewId: reviewRef.id }, createdAt: now,
      });
      return { reviewId: reviewRef.id, newRating, newCount, farmerName, technicianName, request };
    });
    return res.status(200).json({ reviewId: result.reviewId, newRating: result.newRating, newCount: result.newCount,
      farmerName: result.farmerName, technicianName: result.technicianName, animalName: result.request.animalName || "",
      serviceType: result.request.serviceType || "", chatId: result.request.chatId || "" });
  } catch (error) {
    console.error("Technician rating submission failed:", error.message);
    const status = error.code?.startsWith("auth/") || error.message === "Authentication required." ? 401 :
      ["Rating request not found.", "This rating request is no longer available.", "Technician not found."].includes(error.message) ? 403 : 500;
    return res.status(status).json({ error: error.message || "Could not submit rating." });
  }
});

exports.updateTechnicianQualifications = onRequest({ cors: true }, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const decoded = await authenticatedUser(req);
    const db = getFirestore();
    const userRef = db.collection("users").doc(decoded.uid);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists || userSnapshot.data()?.role !== "technician" || !["pending", "active"].includes(userSnapshot.data()?.status)) {
      return res.status(403).json({ error: "Only an active or pending technician can update qualifications." });
    }
    const qualifications = validateQualifications(req.body?.specializationIds, req.body?.subSpecializationIds);
    if (!qualifications.valid) return res.status(400).json({ error: qualifications.error });
    await userRef.update({
      specializationIds: qualifications.specializationIds,
      subSpecializationIds: qualifications.subSpecializationIds,
      qualificationKeys: qualifications.qualificationKeys,
      qualificationVerified: true,
      qualificationCatalogVersion: 1,
      expertise: qualifications.expertise,
      specialization: qualifications.specialization,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return res.status(200).json({ ok: true, qualificationKeys: qualifications.qualificationKeys });
  } catch (error) {
    console.error("Technician qualification update failed:", error.message);
    return res.status(error.code?.startsWith("auth/") || error.message === "Authentication required." ? 401 : 500).json({ error: error.message || "Could not save qualifications." });
  }
});

exports.getEligibleTechnicians = onRequest({ cors: true }, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    await authenticatedUser(req);
    const animalTypeId = normalizeAnimalTypeId(req.body?.animalTypeId);
    const serviceTypeId = String(req.body?.serviceTypeId || "");
    if (!animalTypeId || !serviceCatalog.subSpecializations.some(item => item.animalTypeId === animalTypeId && item.serviceTypeId === serviceTypeId)) {
      return res.status(400).json({ error: "That animal and service combination is not supported." });
    }
    const candidates = await getFirestore().collection("users")
      .where("role", "==", "technician")
      .where("status", "==", "active")
      .where("qualificationKeys", "array-contains", qualificationKey(animalTypeId, serviceTypeId))
      .get();
    const date = req.body?.date;
    const time = req.body?.time;
    let appointments = [];
    if (date || time) {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || timeMinutes(time) === null) return res.status(400).json({ error: "A valid date and time are required." });
      const appointmentsSnapshot = await getFirestore().collection("appointments").where("date", "==", date).get();
      appointments = appointmentsSnapshot.docs.map(doc => doc.data());
    }
    const technicians = candidates.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(technician => technician.qualificationVerified === true && technician.available !== false)
      .filter(technician => !date || (scheduledAt(technician, date, time) && !appointments.some(appointment =>
        appointment.technicianId === technician.id && isAppointmentActive(appointment) && timeConflict(date, time, appointment))))
      .map(({ id, displayName, photoURL, rating, availabilitySlots, alwaysAvailable, alwaysAvailableEnabled, qualificationKeys, qualificationVerified, specialization }) => ({
        id, displayName: displayName || "Technician", photoURL: photoURL || "", rating: rating || 0,
        qualificationKeys: qualificationKeys || [], qualificationVerified: qualificationVerified === true, specialization: specialization || "",
        availabilitySlots: availabilitySlots || [], alwaysAvailable: alwaysAvailable || [], alwaysAvailableEnabled: alwaysAvailableEnabled !== false,
      }));
    return res.status(200).json({ technicians });
  } catch (error) {
    console.error("Eligible technician lookup failed:", error.message);
    return res.status(error.code?.startsWith("auth/") || error.message === "Authentication required." ? 401 : 500).json({ error: error.message || "Could not load qualified technicians." });
  }
});

exports.acceptServiceRequest = onRequest({ cors: true }, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const decoded = await authenticatedUser(req);
    const appointmentId = req.body?.appointmentId;
    if (typeof appointmentId !== "string" || !appointmentId.trim()) return res.status(422).json({ error: "A valid request ID is required." });
    const db = getFirestore();
    const appointmentRef = db.collection("appointments").doc(appointmentId);
    const technicianRef = db.collection("users").doc(decoded.uid);
    const claim = await db.runTransaction(async transaction => {
      const [appointmentSnapshot, technicianSnapshot] = await Promise.all([
        transaction.get(appointmentRef), transaction.get(technicianRef),
      ]);
      if (!appointmentSnapshot.exists) throw new Error("This request no longer exists.");
      const appointment = appointmentSnapshot.data();
      const technician = technicianSnapshot.data();
      if (!technicianSnapshot.exists || technician?.role !== "technician" || technician.status !== "active") throw new Error("Only an active technician can accept a request.");
      if (appointment.status === "confirmed" && appointment.technicianId === decoded.uid) return { alreadyAccepted: true, previousTechnicianId: decoded.uid, existingCalendarEventId: appointment.calendarEventId || null };
      if (appointment.status !== "pending") throw new Error("This request is no longer pending.");
      if (appointment.declinedByTechnicianIds?.includes(decoded.uid)) throw new Error("You already declined this request.");
      const previousTechnicianId = appointment.technicianId || "";
      const deadline = appointment.responseDeadlineAt?.toMillis?.();
      const expired = typeof deadline === "number" && deadline <= Date.now();
      if (previousTechnicianId === decoded.uid && expired && appointment.requestMode !== "direct") throw new Error("The response window expired. The request is being shared with other qualified technicians.");
      if (previousTechnicianId && previousTechnicianId !== decoded.uid && !expired) throw new Error("This request is reserved for another technician.");
      if (appointment.animalTypeId && appointment.serviceTypeId) {
        if (!canAcceptServiceRequest(appointment, decoded.uid, technician)) {
          throw new Error("You are not qualified or eligible to accept this service request.");
        }
      } else if (previousTechnicianId !== decoded.uid) {
        throw new Error("Legacy requests can only be accepted by their previously assigned technician.");
      }
      if (technician.available === false || !scheduledAt(technician, appointment.date, appointment.time)) throw new Error("You are not available for this request's scheduled time.");

      const assignedSnapshot = await transaction.get(db.collection("appointments").where("technicianId", "==", decoded.uid));
      const assigned = assignedSnapshot.docs.filter(doc => doc.id !== appointmentId).map(doc => doc.data());
      if (assigned.some(existing => isAppointmentActive(existing) && timeConflict(appointment.date, appointment.time, existing))) {
        throw new Error("Complete your current service before accepting another request.");
      }
      const maxRequestsPerDay = technician.maxRequestsPerDay;
      const hasDailyLimit = Number.isInteger(maxRequestsPerDay) && maxRequestsPerDay > 0;
      if (hasDailyLimit && !appointment.date) throw new Error("This request has no scheduled date, so its daily limit cannot be checked.");
      if (appointment.date) {
        const dailyCountRef = technicianRef.collection("dailyRequestCounts").doc(appointment.date);
        const dailyCountSnapshot = await transaction.get(dailyCountRef);
        const acceptedForDay = assigned.filter(existing => existing.date === appointment.date && ["confirmed", "upcoming", "completed"].includes(existing.status)).length;
        const storedCount = dailyCountSnapshot.data()?.acceptedCount;
        const currentCount = Number.isInteger(storedCount) && storedCount >= 0 ? storedCount : acceptedForDay;
        if (hasDailyLimit && currentCount >= maxRequestsPerDay) throw new Error(`You reached your limit of ${maxRequestsPerDay} accepted requests for ${appointment.date}.`);
        transaction.set(dailyCountRef, { acceptedCount: currentCount + 1, updatedAt: FieldValue.serverTimestamp() });
      }
      transaction.update(appointmentRef, { status: "confirmed", technicianId: decoded.uid, technicianName: technician.displayName || "Technician", responseDeadlineAt: FieldValue.delete() });
      transaction.set(technicianRef, { activeAppointmentId: appointmentId, activeAppointmentIds: FieldValue.arrayUnion(appointmentId) }, { merge: true });
      return { alreadyAccepted: false, previousTechnicianId, existingCalendarEventId: null };
    });
    return res.status(200).json(claim);
  } catch (error) {
    console.error("Service request acceptance failed:", error.message);
    return res.status(error.code?.startsWith("auth/") || error.message === "Authentication required." ? 401 : 422).json({ error: error.message || "Could not accept the service request." });
  }
});

exports.createServiceRequest = onRequest({ cors: true }, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const decoded = await authenticatedUser(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const db = getFirestore();
    const farmerSnapshot = await db.collection("users").doc(decoded.uid).get();
    const farmer = farmerSnapshot.data();
    if (!farmerSnapshot.exists || farmer?.role !== "farmer" || !["active", "pending"].includes(farmer?.status)) {
      return res.status(403).json({ error: "Only an active farmer can submit a service request." });
    }

    const animalTypeId = normalizeAnimalTypeId(body.animalTypeId);
    const serviceTypeId = String(body.serviceTypeId || "");
    const animalRecordId = typeof body.animalRecordId === "string" ? body.animalRecordId.trim() : "";
    const breedId = typeof body.animalBreedId === "string" ? body.animalBreedId : "";
    const quantity = Number(body.animalQuantity);
    const { date, time, description, technicianId = "" } = body;
    if (typeof technicianId !== "string") return res.status(422).json({ error: "Invalid technician selection." });
    const supportedService = serviceCatalog.subSpecializations.some(item => item.animalTypeId === animalTypeId && item.serviceTypeId === serviceTypeId);
    if (!supportedService || !serviceCatalog.serviceTypes.some(item => item.id === serviceTypeId)) {
      return res.status(422).json({ error: "That animal and service combination is not supported." });
    }
    if (!animalRecordId) return res.status(422).json({ error: "Select one of your registered animals." });
    const animalSnapshot = await db.collection("animals").doc(animalRecordId).get();
    const animalRecord = animalSnapshot.data();
    if (!animalSnapshot.exists || animalRecord?.ownerId !== decoded.uid) return res.status(422).json({ error: "That animal record does not belong to your account." });
    if (normalizeAnimalTypeId(animalRecord.type || animalRecord.name) !== animalTypeId) return res.status(422).json({ error: "The selected animal record does not match the chosen animal type." });
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) return res.status(422).json({ error: "Enter a valid animal quantity." });
    const recordCount = Number(animalRecord.count || 1);
    if (Number.isSafeInteger(recordCount) && recordCount > 0 && quantity > recordCount) return res.status(422).json({ error: "Quantity cannot exceed the selected animal record." });
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(timeMinutes(time)) || typeof description !== "string" || description.length > 5000) {
      return res.status(422).json({ error: "Enter a valid date, time, and request description." });
    }
    if (!Number.isFinite(body.appointmentLatitude) || body.appointmentLatitude < -90 || body.appointmentLatitude > 90 ||
        !Number.isFinite(body.appointmentLongitude) || body.appointmentLongitude < -180 || body.appointmentLongitude > 180 ||
        (body.appointmentLocationAccuracy !== null && (!Number.isFinite(body.appointmentLocationAccuracy) || body.appointmentLocationAccuracy > 50))) {
      return res.status(422).json({ error: "A valid service location is required." });
    }
    const [year, month, day] = date.split("-").map(Number);
    if (new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== date || Date.UTC(year, month - 1, day) + timeMinutes(time) * 60000 - 8 * 3600000 <= Date.now()) {
      return res.status(422).json({ error: "Choose a future date and time." });
    }

    const approvedBreedsSnapshot = await db.collection("livestockCategories").get();
    const approvedBreeds = [];
    for (const category of approvedBreedsSnapshot.docs) {
      const data = category.data();
      const typeId = normalizeAnimalTypeId(data.name) || normalizeAnimalTypeId(data.type);
      if (typeId !== animalTypeId || !["goat", "horse"].includes(typeId) || !Array.isArray(data.breeds)) continue;
      for (const name of data.breeds) {
        if (typeof name !== "string" || !name.trim()) continue;
        const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        approvedBreeds.push({ id: `approved-${category.id}-${slug}`, name: name.trim() });
      }
    }
    const staticBreeds = serviceCatalog.breeds.filter(item => item.animalTypeId === animalTypeId);
    const validBreed = staticBreeds.some(item => item.id === breedId) || approvedBreeds.some(item => item.id === breedId);
    const availableBreeds = [...staticBreeds, ...approvedBreeds];
    const selectedBreed = availableBreeds.find(item => item.id === breedId);
    const recordBreed = typeof animalRecord.breed === "string" ? animalRecord.breed.trim() : "";
    const recordBreedOption = availableBreeds.find(item => item.name.trim().toLowerCase() === recordBreed.toLowerCase());
    if ((staticBreeds.length || approvedBreeds.length) && (!recordBreedOption || recordBreedOption.id !== breedId)) {
      return res.status(422).json({ error: "Update this animal with an approved breed before requesting service." });
    }
    if ((staticBreeds.length || approvedBreeds.length) && !validBreed) return res.status(422).json({ error: "Select a valid breed for the chosen animal type." });
    if (!breedId && (staticBreeds.length || approvedBreeds.length)) return res.status(422).json({ error: "Select an animal breed." });

    const matchingSnapshot = await db.collection("users")
      .where("role", "==", "technician")
      .where("status", "==", "active")
      .where("qualificationKeys", "array-contains", qualificationKey(animalTypeId, serviceTypeId))
      .get();
    const candidates = eligibleTechnicians(matchingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })), animalTypeId, serviceTypeId)
      .filter(technician => technician.qualificationVerified === true && scheduledAt(technician, date, time));
    const appointmentsSnapshot = await db.collection("appointments").where("date", "==", date).get();
    const dayAppointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const available = candidates.filter(technician => !dayAppointments.some(appointment =>
      appointment.technicianId === technician.id && isAppointmentActive(appointment) && timeConflict(date, time, appointment)));
    const selectedTechnicianId = typeof technicianId === "string" ? technicianId : "";
    const recipients = selectedTechnicianId ? available.filter(technician => technician.id === selectedTechnicianId) : available;
    if (!recipients.length) return res.status(422).json({ error: selectedTechnicianId
      ? "The selected technician is not qualified or available for this animal, service, and time."
      : "No active, qualified technician is available for this animal, service, and time." });

    const selectedTechnician = selectedTechnicianId ? recipients[0] : null;
    const appointmentRef = db.collection("appointments").doc();
    const timestamp = FieldValue.serverTimestamp();
    const appointmentData = {
      serviceTypeId,
      serviceType: serviceCatalog.serviceTypes.find(item => item.id === serviceTypeId).name,
      animalTypeId,
      animalType: serviceCatalog.animalTypes.find(item => item.id === animalTypeId).name,
      animalName: animalRecord.name || serviceCatalog.animalTypes.find(item => item.id === animalTypeId).name,
      animalRecordId,
      animalBreedId: breedId,
      animalBreed: selectedBreed?.name || recordBreed,
      animalQuantity: quantity,
      farmerId: decoded.uid,
      farmerName: farmer.displayName || farmer.name || "Farmer",
      technicianId: selectedTechnician?.id || "",
      technicianName: selectedTechnician?.displayName || "Unassigned",
      eligibleTechnicianIds: recipients.map(technician => technician.id),
      requestMode: selectedTechnician ? "direct" : "general",
      declinedByTechnicianIds: [],
      date,
      time,
      status: "pending",
      description: description.trim(),
      location: typeof body.location === "string" ? body.location.slice(0, 500) : "",
      appointmentLatitude: body.appointmentLatitude,
      appointmentLongitude: body.appointmentLongitude,
      appointmentLocationAccuracy: body.appointmentLocationAccuracy,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await appointmentRef.set(appointmentData);

    let notificationsQueued = true;
    try {
      for (let i = 0; i < recipients.length; i += 450) {
        const batch = db.batch();
        for (const technician of recipients.slice(i, i + 450)) {
          const notificationRef = db.collection("notifications").doc(`service-request-${appointmentRef.id}-${technician.id}`);
          batch.set(notificationRef, {
            userId: technician.id,
            type: "service_request",
            title: "New Service Request",
            body: `${appointmentData.serviceType} requested for ${appointmentData.animalType} on ${date} at ${time}.`,
            read: false,
            data: { appointmentId: appointmentRef.id },
            createdAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
        await batch.commit();
      }
    } catch (error) {
      notificationsQueued = false;
      console.error("Service request notifications failed:", error.message);
    }
    return res.status(201).json({ appointmentId: appointmentRef.id, eligibleTechnicianCount: recipients.length, notificationsQueued });
  } catch (error) {
    console.error("Service request creation failed:", error.message);
    return res.status(error.code?.startsWith("auth/") || error.message === "Authentication required." ? 401 : 500).json({ error: error.message || "Could not submit the service request." });
  }
});

const otpEndpoint = (handler) => onRequest({
  secrets: [emailOtpSecret, resendApiKey],
  cors: true,
}, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    return await handler(req, res);
  } catch (error) {
    console.error("Registration email OTP failed:", error.message);
    return res.status(500).json({ error: "Email verification is temporarily unavailable." });
  }
});

exports.requestRegistrationEmailOtp = otpEndpoint(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });

  const now = Date.now();
  const db = getFirestore();
  const hash = emailHash(email);
  const otpRef = db.collection(otpCollection).doc(hash);
  const ip = String(req.ip || "unknown");
  const ipRef = db.collection("registrationOtpRateLimits").doc(emailHash(ip));
  const limit = await db.runTransaction(async (tx) => {
    const [otpSnapshot, ipSnapshot] = await Promise.all([tx.get(otpRef), tx.get(ipRef)]);
    const current = otpSnapshot.data() || {};
    const ipCurrent = ipSnapshot.data() || {};
    const hour = 60 * 60 * 1000;
    const emailWindow = current.windowStartedAt?.toMillis() || 0;
    const ipWindow = ipCurrent.windowStartedAt?.toMillis() || 0;

    if (current.sentAt && current.sentAt.toMillis() > now - 60_000) {
      return { retryAfter: 60 };
    }
    if (emailWindow > now - hour && (current.sendCount || 0) >= 5) {
      return { retryAfter: Math.ceil((emailWindow + hour - now) / 1000) };
    }
    if (ipWindow > now - hour && (ipCurrent.requestCount || 0) >= 20) {
      return { retryAfter: Math.ceil((ipWindow + hour - now) / 1000) };
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const code = String(crypto.randomInt(100000, 1000000));
    tx.set(otpRef, {
      codeHash: otpHash(email, salt, code),
      salt,
      attempts: 0,
      sentAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + 10 * 60 * 1000),
      windowStartedAt: emailWindow > now - hour ? current.windowStartedAt : Timestamp.fromMillis(now),
      sendCount: emailWindow > now - hour ? (current.sendCount || 0) + 1 : 1,
      verifiedUntil: null,
      proof: null,
    });
    tx.set(ipRef, {
      windowStartedAt: ipWindow > now - hour ? ipCurrent.windowStartedAt : Timestamp.fromMillis(now),
      requestCount: ipWindow > now - hour ? (ipCurrent.requestCount || 0) + 1 : 1,
      expiresAt: Timestamp.fromMillis(now + hour),
    });
    return { code };
  });

  if (limit.retryAfter) {
    return res.status(429).json({ error: `Please wait ${limit.retryAfter} seconds before requesting another code.` });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey.value()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `registration-otp-${hash}-${now}`,
    },
    body: JSON.stringify({
      from: emailFrom.value(),
      to: [email],
      subject: "AgriCare email verification code",
      text: `Your AgriCare verification code is ${limit.code}. It expires in 10 minutes.`,
      html: `<p>Your AgriCare verification code is:</p><h2>${limit.code}</h2><p>It expires in 10 minutes.</p>`,
    }),
  });
  if (!response.ok) {
    await otpRef.delete();
    throw new Error(`Resend failed (${response.status})`);
  }
  return res.status(200).json({ ok: true });
});

exports.verifyRegistrationEmailOtp = otpEndpoint(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const code = String(req.body?.code || "");
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Enter the 6-digit code sent to your email." });
  }

  const hash = emailHash(email);
  const ref = getFirestore().collection(otpCollection).doc(hash);
  const result = await getFirestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const data = snapshot.data();
    const now = Date.now();
    if (!data || !data.expiresAt || data.expiresAt.toMillis() <= now) return "expired";

    if (data.verifiedUntil?.toMillis() > now && isEqualHash(data.proof, otpProof(hash, data.verifiedUntil.toMillis()))) {
      return "verified";
    }
    if ((data.attempts || 0) >= 5) return "locked";
    if (!isEqualHash(data.codeHash, otpHash(email, data.salt, code))) {
      tx.update(ref, { attempts: (data.attempts || 0) + 1 });
      return "invalid";
    }

    const verifiedUntil = now + 10 * 60 * 1000;
    tx.update(ref, {
      codeHash: FieldValue.delete(),
      salt: FieldValue.delete(),
      attempts: 0,
      verifiedUntil: Timestamp.fromMillis(verifiedUntil),
      expiresAt: Timestamp.fromMillis(verifiedUntil),
      proof: otpProof(hash, verifiedUntil),
    });
    return "verified";
  });

  if (result !== "verified") {
    const error = result === "locked" ? "Too many attempts. Request a new code." :
      result === "expired" ? "The code expired. Request a new one." : "That code is incorrect.";
    return res.status(result === "locked" ? 429 : 400).json({ error });
  }
  return res.status(200).json({ ok: true });
});

exports.completeRegistrationEmailVerification = onRequest({
  secrets: [emailOtpSecret],
  cors: true,
}, async (req, res) => {
  setOtpCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: "Authentication required." });
    const decoded = await getAuth().verifyIdToken(token, true);
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!validEmail(email) || decoded.email?.toLowerCase() !== email) {
      return res.status(403).json({ error: "Verified email does not match this account." });
    }

    const hash = emailHash(email);
    const ref = getFirestore().collection(otpCollection).doc(hash);
    const canClaim = await getFirestore().runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const data = snapshot.data();
      const verifiedUntil = data?.verifiedUntil?.toMillis();
      if (!verifiedUntil || verifiedUntil <= Date.now() || !isEqualHash(data.proof, otpProof(hash, verifiedUntil))) return false;
      if (data.claimedBy && data.claimedBy !== decoded.uid) return false;
      tx.update(ref, { claimedBy: decoded.uid });
      return true;
    });
    if (!canClaim) return res.status(403).json({ error: "Verify your email with a new code before registering." });

    await getAuth().updateUser(decoded.uid, { emailVerified: true });
    await ref.update({
      verifiedUntil: FieldValue.delete(),
      proof: FieldValue.delete(),
      claimedBy: FieldValue.delete(),
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Email verification completion failed:", error.message);
    return res.status(401).json({ error: "Email verification could not be completed." });
  }
});

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[char]);

exports.sendNotificationEmail = onDocumentCreated({
  document: "notifications/{notificationId}",
  secrets: [resendApiKey],
  retry: true,
}, async (event) => {
  const notification = event.data?.data();
  if (!notification || typeof notification.userId !== "string") return;

  const user = await getFirestore().collection("users").doc(notification.userId).get();
  const email = user.data()?.email;
  if (typeof email !== "string" || !email.trim()) return;

  const title = String(notification.title || "AgriCare Notification");
  const body = String(notification.body || "");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey.value()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `notification-${event.id}`,
    },
    body: JSON.stringify({
      from: emailFrom.value(),
      to: [email.trim()],
      subject: title,
      html: `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>`,
      text: body,
    }),
  });

  if (!response.ok) throw new Error(`Resend email failed (${response.status})`);
  console.log(`Notification email sent: ${event.params.notificationId}`);
});

exports.sendNotificationPush = onDocumentCreated({
  document: "notifications/{notificationId}",
  retry: true,
}, async (event) => {
  const notification = event.data?.data();
  if (!notification || typeof notification.userId !== "string") return;

  const user = await getFirestore().collection("users").doc(notification.userId).get();
  const token = user.data()?.fcmToken;
  if (typeof token !== "string" || !token) return;

  const data = Object.fromEntries(
    Object.entries({ type: notification.type, ...notification.data })
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, typeof value === "string" ? value : String(value)])
  );
  try {
    await getMessaging().send({
      token,
      notification: {
        title: String(notification.title || "AgriCare Notification"),
        body: String(notification.body || "You have a new notification."),
      },
      data,
      android: { priority: "high" },
    });
  } catch (error) {
    if (["messaging/registration-token-not-registered", "messaging/invalid-argument"].includes(error.code)) {
      await user.ref.update({ fcmToken: FieldValue.delete() });
      return;
    }
    throw error;
  }
  console.log(`Notification push sent: ${event.params.notificationId}`);
});

exports.deleteRejectedUserAuth = onDocumentUpdated({
  document: "users/{userId}",
  retry: true,
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (before?.status === "rejected" || after?.status !== "rejected") return;

  try {
    await getAuth().deleteUser(event.params.userId);
    console.log(`Deleted Firebase Auth account for rejected user ${event.params.userId}`);
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
  }
});

exports.cleanupRegistrationOtpData = onSchedule("every 24 hours", async () => {
  const db = getFirestore();
  for (const collection of [otpCollection, "registrationOtpRateLimits"]) {
    let expired;
    do {
      expired = await db.collection(collection)
        .where("expiresAt", "<=", Timestamp.now())
        .limit(500)
        .get();
      if (!expired.empty) {
        const batch = db.batch();
        expired.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    } while (expired.size === 500);
  }
});

exports.processPushQueue = onDocumentCreated("pushQueue/{docId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const { fcmTokens, notification, data: messageData, targetUserId } = data;

  if (!fcmTokens || fcmTokens.length === 0) {
    console.warn(`No FCM tokens for user ${targetUserId}`);
    await snapshot.ref.update({ status: "failed", error: "No FCM tokens" });
    return;
  }

  const message = {
    notification: {
      title: notification?.title || "AgriCare",
      body: notification?.body || "",
    },
    data: messageData || {},
    android: {
      priority: "high",
      notification: {
        channelId: "default",
        sound: "default",
        priority: "high",
      },
    },
  };

  try {
    // Send to each token
    const results = await Promise.allSettled(
      fcmTokens.map((token) =>
        getMessaging().send({ ...message, token })
      )
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.filter((r) => r.status === "rejected").length;

    // Remove invalid tokens from user doc
    const failedTokens = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const error = result.reason?.code;
        if (
          error === "messaging/invalid-registration-token" ||
          error === "messaging/registration-token-not-registered"
        ) {
          failedTokens.push(fcmTokens[index]);
        }
      }
    });

    // Clean up invalid tokens from user's doc
    if (failedTokens.length > 0 && targetUserId) {
      const db = getFirestore();
      const { FieldValue } = require("firebase-admin/firestore");
      await db.collection("users").doc(targetUserId).update({
        fcmTokens: FieldValue.arrayRemove(...failedTokens),
      });
    }

    // Mark as sent
    await snapshot.ref.update({
      status: "sent",
      sentAt: new Date(),
      successCount,
      failedCount,
    });

    console.log(
      `Push sent to ${targetUserId}: ${successCount} success, ${failedCount} failed`
    );
  } catch (error) {
    console.error("Push send error:", error);
    await snapshot.ref.update({
      status: "failed",
      error: error.message,
      attempts: (data.attempts || 0) + 1,
    });
  }
});

exports.publishExpiredAppointmentRequests = onSchedule("every 1 minutes", async () => {
  const db = getFirestore();
  const now = Timestamp.now();
  const expiredRequests = await db.collection("appointments")
    .where("responseDeadlineAt", "<=", now)
    .get();

  for (const request of expiredRequests.docs) {
    const initial = request.data();
    const animalTypeId = initial.animalTypeId;
    const serviceTypeId = String(initial.serviceTypeId || "");
    let recipients = [];
    if (animalTypeId && serviceCatalog.subSpecializations.some(item => item.animalTypeId === animalTypeId && item.serviceTypeId === serviceTypeId)) {
      const [techniciansSnapshot, dayAppointments] = await Promise.all([
        db.collection("users").where("role", "==", "technician").where("status", "==", "active")
          .where("qualificationKeys", "array-contains", qualificationKey(animalTypeId, serviceTypeId)).get(),
        initial.date ? db.collection("appointments").where("date", "==", initial.date).get() : Promise.resolve(null),
      ]);
      const appointments = dayAppointments?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
      recipients = eligibleTechnicians(techniciansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })), animalTypeId, serviceTypeId)
        .filter(technician => technician.qualificationVerified === true && scheduledAt(technician, initial.date, initial.time))
        .filter(technician => !appointments.some(appointment => appointment.technicianId === technician.id &&
          isAppointmentActive(appointment) && timeConflict(initial.date, initial.time, appointment)));
    }

    const published = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(request.ref);
      const appointment = snapshot.data();
      if (!snapshot.exists || appointment?.status !== "pending" || !appointment.technicianId ||
          !appointment.responseDeadlineAt || appointment.responseDeadlineAt.toMillis() > Date.now() ||
          appointment.animalTypeId !== initial.animalTypeId || appointment.serviceTypeId !== initial.serviceTypeId ||
          appointment.date !== initial.date || appointment.time !== initial.time) return false;

      transaction.update(request.ref, {
        technicianId: "",
        technicianName: "Unassigned",
        eligibleTechnicianIds: recipients.map(technician => technician.id),
        requestMode: "general",
        responseDeadlineAt: FieldValue.delete(),
        publishedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!published) continue;

    try {
      for (let index = 0; index < recipients.length; index += 450) {
        const batch = db.batch();
        for (const technician of recipients.slice(index, index + 450)) {
          const notificationRef = db.collection("notifications").doc(`service-request-${request.id}-${technician.id}`);
          batch.set(notificationRef, {
            userId: technician.id,
            type: "service_request",
            title: "New Service Request",
            body: `${initial.serviceType || "Service"} requested for ${initial.animalType || "animal"} on ${initial.date} at ${initial.time}.`,
            read: false,
            data: { appointmentId: request.id },
            createdAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
        await batch.commit();
      }
    } catch (error) {
      console.error(`Republished request notification failed for ${request.id}:`, error.message);
    }
  }
});

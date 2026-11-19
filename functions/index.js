/**
 * Cloud Function — FCM Push Queue Processor
 *
 * Listens to new documents in "pushQueue" collection.
 * When admin approves/rejects a user, the app writes to pushQueue.
 * This function picks it up and sends the actual FCM notification.
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
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
const crypto = require("node:crypto");

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
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(request.ref);
      const appointment = snapshot.data();
      if (!snapshot.exists || appointment?.status !== "pending" || !appointment.technicianId ||
          !appointment.responseDeadlineAt || appointment.responseDeadlineAt.toMillis() > Date.now()) return;

      transaction.update(request.ref, {
        technicianId: "",
        technicianName: "Unassigned",
        responseDeadlineAt: FieldValue.delete(),
        publishedAt: FieldValue.serverTimestamp(),
      });
    });
  }
});

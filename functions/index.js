/**
 * Cloud Function — FCM Push Queue Processor
 *
 * Listens to new documents in "pushQueue" collection.
 * When admin approves/rejects a user, the app writes to pushQueue.
 * This function picks it up and sends the actual FCM notification.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

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

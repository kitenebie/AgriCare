/**
 * Supabase Edge Function — Send FCM Push Notification
 *
 * Called from the app when admin approves/rejects a user.
 * Sends the actual FCM notification to the user's device via FCM v1 API.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { encode as base64url } from "https://deno.land/std@0.177.0/encoding/base64url.ts";

const FCM_PROJECT_ID = "agecare-ca137";
const FCM_URL = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getAccessToken(): Promise<string> {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}";
  // Handle escaped newlines from env secret
  const serviceAccount = JSON.parse(raw.replace(/\\\\n/g, "\\n"));

  if (!serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error("Invalid service account: missing private_key or client_email");
  }

  const now = Math.floor(Date.now() / 1000);

  // Create JWT header and payload
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = base64url(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
      },
    });
  }

  try {
    const { fcmTokens, title, body, data, sound } = await req.json();

    if (!fcmTokens || fcmTokens.length === 0) {
      return new Response(JSON.stringify({ error: "No FCM tokens provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const accessToken = await getAccessToken();
    
    // Determine notification sound and channel
    const notifSound = sound || "notification";
    const channelId = notifSound === "new_chat" ? "chat_messages" : "default";

    // Send to each token
    const results = await Promise.allSettled(
      fcmTokens.map(async (token: string) => {
        const res = await fetch(FCM_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: title || "AgriCare", body: body || "" },
              data: data || {},
              android: {
                priority: "high",
                notification: {
                  channel_id: channelId,
                  sound: notifSound,
                },
              },
            },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`FCM error: ${res.status} - ${errText}`);
        }
        return await res.json();
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.filter((r) => r.status === "rejected").length;
    const errors = results
      .filter((r) => r.status === "rejected")
      .map((r: any) => r.reason?.message);

    return new Response(
      JSON.stringify({ success: true, successCount, failedCount, errors }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (error: any) {
    console.error("Edge function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});

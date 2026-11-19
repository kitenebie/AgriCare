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

const firebaseAdminUpdateEmailVerified = async (uid: string) => {
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
  const update = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  if (!update.ok) throw new Error("Could not mark the Firebase email as verified.");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: jsonHeaders });
  if (req.method !== "POST") return response(405, { error: "Method not allowed." });

  let stage = "parse_request";
  try {
    const body = await req.json();
    stage = ["request", "verify", "complete"].includes(body.action) ? body.action : "unknown_action";
    console.log("Registration email OTP action:", stage);
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
      await firebaseAdminUpdateEmailVerified(claims.sub);
      await rpc("consume_registration_email_otp", { p_email_hash: emailHash, p_uid: claims.sub });
      return response(200, { ok: true });
    }
    return response(400, { error: "Unknown email verification action." });
  } catch (error) {
    console.error("Registration email OTP failed at", stage, error instanceof Error ? error.message : "unknown error");
    return response(500, { error: "Email verification is temporarily unavailable." });
  }
});

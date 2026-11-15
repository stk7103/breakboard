/**
 * Signed admin session cookie, built on Web Crypto so it works in both
 * `proxy.ts` and server code.
 *
 * Token format: base64url(email) "." expiresAtSeconds "." base64url(HMAC-SHA256)
 *
 * The HMAC key is derived from the demo admin credentials plus the Supabase
 * service role key, so no extra env var is needed. Changing the admin password
 * (or the service key) invalidates every existing session.
 */

export const SESSION_COOKIE = "bb_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type AdminSession = { email: string; expiresAt: number };

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function sessionSecret(): string | null {
  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!email || !password) return null; // login disabled until configured
  return `breakboard-session:v1|${email}|${password}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function createSessionToken(email: string): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error("Admin login is not configured (DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD).");

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${toBase64Url(encoder.encode(email))}.${expiresAt}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns the session if the token is authentic and unexpired, else null. Never throws. */
export async function verifySessionToken(token: string | undefined | null): Promise<AdminSession | null> {
  if (!token) return null;
  const secret = sessionSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [emailPart, expPart, sigPart] = parts;

  const expiresAt = Number(expPart);
  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromBase64Url(sigPart),
      encoder.encode(`${emailPart}.${expPart}`),
    );
    if (!valid) return null;
    const email = new TextDecoder().decode(fromBase64Url(emailPart));
    // Only the configured admin may hold a session.
    if (email !== process.env.DEMO_ADMIN_EMAIL) return null;
    return { email, expiresAt };
  } catch {
    return null;
  }
}

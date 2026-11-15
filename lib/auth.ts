import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SESSION_COOKIE, verifySessionToken, type AdminSession } from "@/lib/session";

/**
 * Server-side auth helpers (Data Access Layer). `proxy.ts` redirects
 * unauthenticated page loads, but every Server Component, Server Action and
 * Route Handler that touches admin data must still call `requireAdmin()`:
 * Server Actions are POSTs that a matcher change could silently stop covering.
 */

export async function getAdmin(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  // Session expiry compares against the current time, so this must run per
  // request, never during a prerender (Cache Components would flag Date.now()).
  await connection();
  return verifySessionToken(token);
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdmin();
  if (!session) redirect("/login");
  return session;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Constant-time comparison against DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD. */
export function checkAdminCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.DEMO_ADMIN_EMAIL;
  const expectedPassword = process.env.DEMO_ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;

  const emailOk = timingSafeEqual(digest(email.trim().toLowerCase()), digest(expectedEmail.trim().toLowerCase()));
  const passwordOk = timingSafeEqual(digest(password), digest(expectedPassword));
  return emailOk && passwordOk;
}

export function isAdminLoginConfigured(): boolean {
  return Boolean(process.env.DEMO_ADMIN_EMAIL && process.env.DEMO_ADMIN_PASSWORD);
}

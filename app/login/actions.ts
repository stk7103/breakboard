"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkAdminCredentials, isAdminLoginConfigured } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "@/lib/session";

export type LoginState = { error?: string; email?: string };

/** Only allow redirects back into the dashboard (no open redirects). */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/dashboard") && !next.startsWith("//") ? next : "/dashboard";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!isAdminLoginConfigured()) {
    return { error: "Admin login isn't configured. Set DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD in .env.local.", email };
  }
  if (!email || !password) {
    return { error: "Enter your email and password.", email };
  }
  if (!checkAdminCredentials(email, password)) {
    return { error: "Incorrect email or password.", email };
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(process.env.DEMO_ADMIN_EMAIL!), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

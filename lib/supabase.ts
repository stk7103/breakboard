import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client authenticated with the service role key.
 *
 * The service role key bypasses Row Level Security, so this module must only
 * ever be imported from server code (route handlers, server actions, server
 * components, the MCP route). Never import it from a "use client" file.
 *
 * The client is created lazily on first use, so importing this module never
 * throws (e.g. during `next build` or MCP tool discovery without env vars).
 * A missing env var surfaces as a clear error at the first query instead.
 */

if (typeof window !== "undefined") {
  throw new Error("lib/supabase.ts is server-only and must not be bundled for the browser.");
}

let client: SupabaseClient | undefined;

/** True when both Supabase env vars are set (lets pages show a setup hint instead of crashing). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.local.example to .env.local and fill it in.");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example to .env.local and fill it in.");
  }

  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // No browser session on the server: don't persist or auto-refresh tokens.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** The shared server client; `supabase.from(...)` creates it on first use. */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const real = getSupabase();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

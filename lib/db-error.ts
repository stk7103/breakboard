/**
 * Turns raw Supabase / PostgREST / network errors into messages that say what
 * to fix. Used for every database failure in the dashboard, MCP tools and
 * tester portal. (In production builds Next.js hides Server Component error
 * messages from the browser; they still appear in the server logs and in
 * Server Action / MCP results.)
 */

type SupabaseLikeError = { message?: string; code?: string; details?: string | null; hint?: string | null };

export function describeDbError(error: SupabaseLikeError | null | undefined): string {
  const message = error?.message ?? "Unknown database error";
  const code = error?.code ?? "";
  const extra = `${error?.details ?? ""} ${error?.hint ?? ""}`;

  // PGRST205: table missing from PostgREST's schema cache (schema.sql not run in this project).
  if (code === "PGRST205" || code === "42P01" || /schema cache|does not exist/i.test(message)) {
    return `the BreakBoard tables don't exist in this Supabase project yet. Run supabase/schema.sql (and optionally supabase/seed.sql) in the Supabase SQL editor. [${code || "no code"}: ${message}]`;
  }

  // supabase-js wraps network/TLS failures as "TypeError: fetch failed".
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|certificate|UNABLE_TO_VERIFY/i.test(`${message} ${extra}`)) {
    return (
      "couldn't reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your connection. " +
      "If antivirus HTTPS scanning is on (e.g. AVG/Avast Web Shield), start the dev server with NODE_USE_SYSTEM_CA=1. " +
      `[${message}]`
    );
  }

  // Wrong or anon key: RLS hides/blocks everything, or PostgREST rejects the JWT.
  if (code === "PGRST301" || code === "42501" || /invalid api key|jwt|permission denied|row-level security/i.test(message)) {
    return `Supabase rejected the request. Check that SUPABASE_SERVICE_ROLE_KEY is the secret / service_role key (not the anon or publishable key). [${code || "no code"}: ${message}]`;
  }

  return code ? `${message} [${code}]` : message;
}

/** `throw dbError("Failed to load runs", error)` -> Error with an actionable message. */
export function dbError(context: string, error: SupabaseLikeError | null | undefined): Error {
  return new Error(`${context}: ${describeDbError(error)}`);
}

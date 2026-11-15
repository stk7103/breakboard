import { Card } from "@/components/ui";

/** Shown instead of data when Supabase env vars are missing. */
export function SetupNotice() {
  return (
    <Card className="border-amber-200 bg-amber-50/60 p-6">
      <h2 className="font-semibold text-amber-900">Connect Supabase to start</h2>
      <p className="mt-1 text-sm text-amber-800">
        The dashboard is signed in, but there is no database configured yet.
      </p>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-amber-900">
        <li>
          Copy <code className="rounded bg-white/70 px-1 font-mono text-xs">.env.local.example</code> to{" "}
          <code className="rounded bg-white/70 px-1 font-mono text-xs">.env.local</code> and fill in{" "}
          <code className="rounded bg-white/70 px-1 font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-white/70 px-1 font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>.
        </li>
        <li>
          Run <code className="rounded bg-white/70 px-1 font-mono text-xs">supabase/schema.sql</code> (and optionally{" "}
          <code className="rounded bg-white/70 px-1 font-mono text-xs">supabase/seed.sql</code>) in the Supabase SQL
          editor.
        </li>
        <li>Restart the dev server.</li>
      </ol>
    </Card>
  );
}

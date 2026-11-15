"use client";

import { Card, buttonStyles } from "@/components/ui";

/** Next 16 error boundary: `retry()` re-fetches and re-renders the segment. */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  const err = error as (Error & { digest?: string }) | undefined;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Card className="border-red-200 p-6">
        <h2 className="font-semibold text-red-700">Couldn&apos;t load this page</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {err?.message || "An unexpected error occurred while talking to the database."}
        </p>
        {err?.digest && <p className="mt-1 font-mono text-xs text-zinc-400">Ref: {err.digest}</p>}
        <button type="button" onClick={() => retry()} className={`${buttonStyles("secondary", "sm")} mt-4`}>
          Try again
        </button>
      </Card>
    </div>
  );
}

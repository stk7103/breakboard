"use client";

import Link from "next/link";
import { Card, buttonStyles } from "@/components/ui";

/**
 * Public error boundary for the tester portal. Testers see a friendly message,
 * never internal details; the actionable cause is in the server log (and in the
 * Next.js dev overlay during development).
 */
export default function BoardError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = (error as { digest?: string } | undefined)?.digest;
  return (
    <Card className="mx-auto max-w-lg px-6 py-12 text-center">
      <h1 className="text-lg font-semibold">This board can&apos;t load right now</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Something went wrong on our side. Please try again in a moment.
      </p>
      {digest && <p className="mt-2 font-mono text-xs text-zinc-400">Ref: {digest}</p>}
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" onClick={() => retry()} className={buttonStyles("primary", "sm")}>
          Try again
        </button>
        <Link href="/" className={buttonStyles("secondary", "sm")}>
          Go to BreakBoard
        </Link>
      </div>
    </Card>
  );
}

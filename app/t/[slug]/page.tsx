import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, Logo, RunStatusBadge, cn } from "@/components/ui";
import { POINTS, computeLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";
import { getPublicBoard, type PublicRun } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";
import { TesterScenarioBoard } from "./scenario-cards";

export const metadata: Metadata = { title: "Break-Test Board" };

/** Public, no-login tester portal. proxy.ts does not match /t/**. */
export default function TesterPortalPage({ params }: PageProps<"/t/[slug]">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="BreakBoard home">
            <Logo />
          </Link>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
            Public tester portal
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Suspense fallback={<BoardSkeleton />}>
          <Board params={params} />
        </Suspense>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <p className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-zinc-500 sm:px-6">
          Please don&apos;t share real personal data. Emails, phone numbers, UPI IDs and ID numbers in reports are masked
          automatically.
        </p>
      </footer>
    </div>
  );
}

async function Board({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection(); // always fresh: submissions and leaderboard change constantly

  if (!isSupabaseConfigured()) {
    return <Message title="This board isn't available right now" body="Please try again later." />;
  }

  const board = await getPublicBoard(slug);
  if (!board) notFound();
  const { run, scenarios } = board;

  if (run.status === "draft") {
    return (
      <Message
        title={`${run.bot_name} isn't open for testing yet`}
        body="The team is still preparing the scenarios. Check back soon, or ask whoever shared this link."
      />
    );
  }

  const closed = run.status === "closed";
  const broken = scenarios.filter((s) => s.status === "submitted" || s.status === "confirmed_bug").length;
  const confirmed = scenarios.filter((s) => s.status === "confirmed_bug").length;
  const leaderboard = computeLeaderboard(scenarios);

  return (
    <>
      {closed && (
        <div role="status" className="mb-6 rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
          <span className="font-semibold text-zinc-900">Testing is closed.</span> This board no longer accepts new
          breaks. Results below are final.
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{run.bot_name}</h1>
            <RunStatusBadge status={run.status} />
          </div>
          {run.description && <p className="mt-2 max-w-2xl text-zinc-600">{run.description}</p>}
          <TargetBox run={run} closed={closed} />
        </div>

        <Card className="min-w-0 p-5">
          <p className="text-sm font-medium text-zinc-500">Progress</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
            {broken} / {scenarios.length}
            <span className="ml-2 text-base font-medium text-zinc-500">Scenarios Broken</span>
          </p>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={scenarios.length}
            aria-valuenow={broken}
            aria-label="Scenarios broken"
          >
            <div
              className="h-full rounded-full bg-indigo-600"
              style={{ width: `${scenarios.length ? (broken / scenarios.length) * 100 : 0}%` }}
            />
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Open" value={scenarios.filter((s) => s.status === "open").length} />
            <Stat label="Submitted" value={broken - confirmed} />
            <Stat label="Confirmed" value={confirmed} accent />
          </dl>
        </Card>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="min-w-0 lg:sticky lg:top-6 lg:col-start-3 lg:row-start-1 lg:self-start">
          <Leaderboard entries={leaderboard} />
        </aside>
        <div className="min-w-0 lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <TesterScenarioBoard slug={run.slug} scenarios={scenarios} closed={closed} />
        </div>
      </div>
    </>
  );
}

function TargetBox({ run, closed }: { run: PublicRun; closed: boolean }) {
  const target = run.bot_target.trim();
  const isUrl = /^https?:\/\//i.test(target);
  const isPhone = !isUrl && /^\+?[\d\s().-]{7,}$/.test(target);

  return (
    <div className="mt-6 rounded-xl border-2 border-indigo-200 bg-indigo-50/60 p-5">
      <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">How to Test / Target Bot</p>
      <p className="mt-2 font-mono text-base break-all text-zinc-900">{target}</p>
      {isUrl && (
        <a
          href={target}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
        >
          Open the bot ↗
        </a>
      )}
      {isPhone && (
        <a
          href={`tel:${target.replace(/[^\d+]/g, "")}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
        >
          Call the bot
        </a>
      )}
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
        <li>Pick an <span className="font-medium">Open to Break</span> scenario below.</li>
        <li>Follow its mission against the bot above and try to make it fail the guardrail.</li>
        <li>
          {closed ? "Submissions are closed for this board." : "When it slips, hit Submit a Break and paste exactly what happened."}
        </li>
      </ol>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-zinc-50 py-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={cn("mt-0.5 text-base font-semibold tabular-nums", accent ? "text-red-600" : "text-zinc-900")}>
        {value}
      </dd>
    </div>
  );
}

const MEDALS = ["bg-amber-400 text-amber-950", "bg-zinc-300 text-zinc-800", "bg-orange-300 text-orange-950"];

function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const top = entries.slice(0, 10);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-zinc-100 bg-zinc-900 px-5 py-4 text-white">
        <h2 className="font-semibold">Live Bug-Hunter Leaderboard</h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          {POINTS.confirmed_bug} pts per confirmed bug · {POINTS.submitted} pts per submitted break
        </p>
      </div>
      {top.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-500">No breaks yet. Be the first on the board!</p>
      ) : (
        <ol className="divide-y divide-zinc-100">
          {top.map((e) => (
            <li key={e.name.toLowerCase()} className="flex items-center gap-3 px-5 py-3">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                  MEDALS[e.rank - 1] ?? "bg-zinc-100 text-zinc-600",
                )}
              >
                {e.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{e.name}</p>
                <p className="text-xs text-zinc-500">
                  {e.confirmed} confirmed · {e.submitted} pending
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">{e.points} pts</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <Card className="mx-auto max-w-lg px-6 py-12 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500">{body}</p>
    </Card>
  );
}

function BoardSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading board">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-56 rounded-xl bg-zinc-200/60 lg:col-span-2" />
        <div className="h-40 rounded-xl bg-zinc-200/60" />
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="h-48 rounded-xl bg-zinc-200/60" />
          <div className="h-48 rounded-xl bg-zinc-200/60" />
        </div>
        <div className="h-64 rounded-xl bg-zinc-200/60" />
      </div>
    </div>
  );
}

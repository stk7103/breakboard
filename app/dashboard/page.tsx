import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, RunStatusBadge, buttonStyles, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listRunsWithCounts, type RunSummary } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewRunDialog } from "./new-run-dialog";
import { SetupNotice } from "./setup-notice";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Break-Test Runs</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Every board your team has published, created by Claude over MCP or by hand.
          </p>
        </div>
        <NewRunDialog />
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  await requireAdmin();
  if (!isSupabaseConfigured()) {
    return (
      <div className="mt-8">
        <SetupNotice />
      </div>
    );
  }

  const { runs, totals } = await listRunsWithCounts();

  const kpis = [
    { label: "Total Break-Test Runs", value: runs.length, hint: `${runs.filter((r) => r.status === "live").length} live`, accent: "bg-indigo-500" },
    { label: "Open Scenarios", value: totals.open, hint: "Waiting for testers", accent: "bg-zinc-400" },
    { label: "Submitted Bugs Pending Review", value: totals.submitted, hint: "Needs PM triage", accent: "bg-amber-500" },
    { label: "Confirmed Bugs", value: totals.confirmed_bug, hint: "Verified failures", accent: "bg-red-500" },
  ];

  return (
    <>
      <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="relative overflow-hidden p-5">
            <span className={cn("absolute inset-y-0 left-0 w-1", kpi.accent)} aria-hidden="true" />
            <dt className="text-sm font-medium text-zinc-500">{kpi.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{kpi.value}</dd>
            <dd className="mt-1 text-xs text-zinc-400">{kpi.hint}</dd>
          </Card>
        ))}
      </dl>

      <Card className="mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold">All runs</h2>
          <span className="text-xs text-zinc-500">{runs.length} total</span>
        </div>
        {runs.length === 0 ? <EmptyState /> : <RunsTable runs={runs} />}
      </Card>
    </>
  );
}

function RunsTable({ runs }: { runs: RunSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-zinc-50 text-xs font-medium tracking-wide text-zinc-500 uppercase">
          <tr>
            <th className="px-5 py-2.5 font-medium">Run</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Scenarios</th>
            <th className="px-3 py-2.5 font-medium">Created</th>
            <th className="px-5 py-2.5 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-zinc-50/60">
              <td className="max-w-xs px-5 py-3.5">
                <Link href={`/dashboard/${run.id}`} className="font-medium text-zinc-900 hover:text-indigo-600">
                  {run.bot_name}
                </Link>
                <p className="truncate text-xs text-zinc-500" title={run.bot_target}>
                  {run.bot_target}
                </p>
              </td>
              <td className="px-3 py-3.5">
                <RunStatusBadge status={run.status} />
              </td>
              <td className="px-3 py-3.5">
                <ScenarioMix counts={run.counts} />
              </td>
              <td className="px-3 py-3.5 whitespace-nowrap text-zinc-500">{formatDate(run.created_at)}</td>
              <td className="px-5 py-3.5">
                <div className="flex justify-end gap-2">
                  <Link href={`/dashboard/${run.id}`} className={buttonStyles("secondary", "sm")}>
                    Edit / Review
                  </Link>
                  <Link
                    href={`/t/${run.slug}`}
                    target="_blank"
                    rel="noopener"
                    className={buttonStyles("ghost", "sm")}
                    title={`/t/${run.slug}`}
                  >
                    Tester view ↗
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScenarioMix({ counts }: { counts: RunSummary["counts"] }) {
  if (counts.total === 0) return <span className="text-xs text-zinc-400">No scenarios</span>;
  const parts = [
    { n: counts.open, label: "open", cls: "text-zinc-600" },
    { n: counts.submitted, label: "pending", cls: "text-amber-700" },
    { n: counts.confirmed_bug, label: "bugs", cls: "text-red-700" },
  ];
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-900 tabular-nums">{counts.total} total</span>
      <span className="flex gap-2 text-xs tabular-nums">
        {parts.map((p) => (
          <span key={p.label} className={p.n ? p.cls : "text-zinc-300"}>
            {p.n} {p.label}
          </span>
        ))}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-medium text-zinc-900">No break-test runs yet</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
        Ask Claude to call <code className="rounded bg-zinc-100 px-1 font-mono text-xs">create_break_board</code> via
        the MCP server at <code className="rounded bg-zinc-100 px-1 font-mono text-xs">/api/mcp</code>, or create one
        here with <span className="font-medium text-zinc-700">+ New Break-Test Run</span>.
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-8 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-[116px] rounded-xl bg-zinc-200/60" />
        ))}
      </div>
      <div className="mt-8 h-72 rounded-xl bg-zinc-200/60" />
    </div>
  );
}

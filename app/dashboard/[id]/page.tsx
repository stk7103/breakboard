import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RunStatusBadge, buttonStyles } from "@/components/ui";
import { getAppUrl } from "@/lib/app-url";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getRunWithScenarios } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";
import { uuidSchema } from "@/lib/validation";
import { SetupNotice } from "../setup-notice";
import { CopyLinkButton } from "./copy-link-button";
import { RunDetailsForm } from "./run-details-form";
import { ScenarioBoard } from "./scenario-board";

export const metadata: Metadata = { title: "Run editor" };

export default function RunPage({ params }: PageProps<"/dashboard/[id]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/dashboard" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
        ← All runs
      </Link>
      <Suspense fallback={<RunSkeleton />}>
        <RunEditor params={params} />
      </Suspense>
    </div>
  );
}

async function RunEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  if (!isSupabaseConfigured()) {
    return (
      <div className="mt-6">
        <SetupNotice />
      </div>
    );
  }
  if (!uuidSchema.safeParse(id).success) notFound();

  const data = await getRunWithScenarios(id);
  if (!data) notFound();
  const { run, scenarios } = data;

  const testerUrl = `${await getAppUrl()}/t/${run.slug}`;
  const confirmed = scenarios.filter((s) => s.status === "confirmed_bug").length;

  return (
    <>
      <header className="mt-4 flex flex-col gap-4 border-b border-zinc-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{run.bot_name}</h1>
            <RunStatusBadge status={run.status} />
          </div>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-500">
            <span className="font-mono text-xs leading-5">/t/{run.slug}</span>
            <span aria-hidden="true">·</span>
            <span>Created {formatDate(run.created_at)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyLinkButton url={testerUrl} />
          <Link href={`/t/${run.slug}`} target="_blank" rel="noopener" className={buttonStyles("secondary", "sm")}>
            Open tester view ↗
          </Link>
          <a href={`/dashboard/${run.id}/export`} download className={buttonStyles("secondary", "sm")}>
            Export Confirmed Bugs (JSON)
            <span className="rounded-full bg-red-50 px-1.5 text-xs text-red-700 tabular-nums">{confirmed}</span>
          </a>
        </div>
      </header>

      {/* grid-cols-1 = minmax(0,1fr): stops wide children (tab row) stretching the column on phones */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <RunDetailsForm run={run} />
        </aside>
        <div className="min-w-0 lg:col-span-2">
          <ScenarioBoard runId={run.id} scenarios={scenarios} />
        </div>
      </div>
    </>
  );
}

function RunSkeleton() {
  return (
    <div className="mt-4 animate-pulse" aria-busy="true" aria-label="Loading run">
      <div className="h-16 rounded-xl bg-zinc-200/60" />
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="h-96 rounded-xl bg-zinc-200/60" />
        <div className="space-y-3 lg:col-span-2">
          <div className="h-10 rounded-lg bg-zinc-200/60" />
          <div className="h-44 rounded-xl bg-zinc-200/60" />
          <div className="h-44 rounded-xl bg-zinc-200/60" />
        </div>
      </div>
    </div>
  );
}

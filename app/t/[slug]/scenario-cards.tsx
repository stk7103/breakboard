"use client";

import { useActionState, useRef, useState } from "react";
import { submitFailure, type SubmitState } from "./actions";
import { submitWithoutReset } from "@/components/form";
import {
  Card,
  ScenarioStatusBadge,
  SeverityBadge,
  buttonStyles,
  cn,
  inputStyles,
  labelStyles,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { POINTS } from "@/lib/leaderboard";
import type { PublicScenario } from "@/lib/runs";

type Filter = "all" | "open" | "submitted" | "confirmed_bug";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open to Break" },
  { value: "submitted", label: "Submitted" },
  { value: "confirmed_bug", label: "Confirmed Bugs" },
];

const NAME_KEY = "breakboard:tester-name";

function readSavedName(): string {
  try {
    return typeof window === "undefined" ? "" : (window.localStorage.getItem(NAME_KEY) ?? "");
  } catch {
    return "";
  }
}

function saveName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // Storage unavailable (private mode etc.): remembering the name is optional.
  }
}

export function TesterScenarioBoard({
  slug,
  scenarios,
  closed,
}: {
  slug: string;
  scenarios: PublicScenario[];
  closed: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const counts: Record<Filter, number> = { all: scenarios.length, open: 0, submitted: 0, confirmed_bug: 0 };
  for (const s of scenarios) if (s.status !== "dismissed") counts[s.status] += 1;

  const visible = filter === "all" ? scenarios : scenarios.filter((s) => s.status === filter);

  function showToast(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }

  return (
    <section aria-labelledby="scenarios-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="scenarios-heading" className="text-lg font-semibold tracking-tight">
          Scenarios
        </h2>
        <div role="tablist" aria-label="Filter scenarios" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors",
                  active
                    ? "bg-zinc-900 text-white ring-zinc-900"
                    : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-900",
                )}
              >
                {f.label}
                <span className={cn("text-xs tabular-nums", active ? "text-zinc-300" : "text-zinc-400")}>
                  {counts[f.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {visible.length === 0 ? (
          <Card className="px-6 py-12 text-center text-sm text-zinc-500">
            {filter === "open"
              ? "Every scenario has been broken or reviewed. Nice hunting!"
              : "Nothing here yet."}
          </Card>
        ) : (
          visible.map((s) => (
            <ScenarioCard
              key={s.id}
              slug={slug}
              scenario={s}
              closed={closed}
              onSubmitted={() => showToast(`Break submitted: +${POINTS.submitted} pts. It's now under review.`)}
            />
          ))
        )}
      </div>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-30 mx-auto max-w-md rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-2xl"
        >
          ✓ {toast}
        </div>
      )}
    </section>
  );
}

function ScenarioCard({
  slug,
  scenario,
  closed,
  onSubmitted,
}: {
  slug: string;
  scenario: PublicScenario;
  closed: boolean;
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const canBreak = scenario.status === "open" && !closed;
  const hasSubmission = Boolean(scenario.tester_name || scenario.failing_input || scenario.actual_output);

  return (
    <Card className={cn("p-5", scenario.status === "confirmed_bug" && "border-red-200")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">{scenario.category}</span>
        <SeverityBadge severity={scenario.severity} />
        {scenario.status === "open" ? (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-300 ring-inset">
            Open to Break
          </span>
        ) : (
          <ScenarioStatusBadge status={scenario.status} />
        )}
      </div>
      <h3 className="mt-2 font-semibold text-zinc-900">{scenario.title}</h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Your mission</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-zinc-800">{scenario.instructions}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">The bot should</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-zinc-800">{scenario.expected_guardrail}</p>
        </div>
      </div>

      {hasSubmission && scenario.status !== "open" && (
        <div
          className={cn(
            "mt-4 rounded-lg border p-4",
            scenario.status === "confirmed_bug" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50",
          )}
        >
          <p className="text-xs font-medium text-zinc-800">
            Broken by {scenario.tester_name ?? "a tester"}
            {scenario.submitted_at && (
              <span className="font-normal text-zinc-500"> · {formatDateTime(scenario.submitted_at)}</span>
            )}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Tester said</p>
              <p className="mt-1 font-mono text-[13px] whitespace-pre-wrap text-zinc-800">{scenario.failing_input || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Bot replied</p>
              <p className="mt-1 font-mono text-[13px] whitespace-pre-wrap text-zinc-800">{scenario.actual_output || "—"}</p>
            </div>
          </div>
        </div>
      )}

      {canBreak &&
        (open ? (
          <BreakForm
            slug={slug}
            scenarioId={scenario.id}
            onCancel={() => setOpen(false)}
            onSubmitted={() => {
              setOpen(false);
              onSubmitted();
            }}
          />
        ) : (
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => setOpen(true)} className={buttonStyles("primary", "sm")}>
              Submit a Break
            </button>
          </div>
        ))}
    </Card>
  );
}

function BreakForm({
  slug,
  scenarioId,
  onCancel,
  onSubmitted,
}: {
  slug: string;
  scenarioId: string;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  // Mounted only after a click, so reading localStorage here can't cause a hydration mismatch.
  const [savedName] = useState(readSavedName);
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(async (prev, formData) => {
    const result = await submitFailure(prev, formData);
    if (result.ok) {
      saveName(String(formData.get("tester_name") ?? "").trim());
      onSubmitted();
    }
    return result;
  }, {});
  const id = (name: string) => `${scenarioId}-${name}`;

  return (
    <form onSubmit={submitWithoutReset(formAction)} className="mt-4 space-y-4 border-t border-zinc-100 pt-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="scenario_id" value={scenarioId} />
      {/* Honeypot for bots: hidden from people and assistive tech. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div>
        <label htmlFor={id("name")} className={labelStyles}>
          Your name
        </label>
        <input
          id={id("name")}
          name="tester_name"
          required
          maxLength={80}
          defaultValue={savedName}
          placeholder="Shown on the leaderboard"
          className={inputStyles}
        />
      </div>
      <div>
        <label htmlFor={id("input")} className={labelStyles}>
          What you said to the bot (failing input)
        </label>
        <textarea
          id={id("input")}
          name="failing_input"
          required
          rows={3}
          maxLength={8000}
          placeholder="Paste the exact message or describe what you said on the call"
          className={cn(inputStyles, "font-mono")}
        />
      </div>
      <div>
        <label htmlFor={id("output")} className={labelStyles}>
          What the bot replied (actual output)
        </label>
        <textarea
          id={id("output")}
          name="actual_output"
          required
          rows={3}
          maxLength={8000}
          placeholder="Paste the bot's reply or transcribe what it said"
          className={cn(inputStyles, "font-mono")}
        />
      </div>

      <p className="text-xs text-zinc-500">
        Emails, phone numbers, UPI IDs and 12-digit ID numbers are masked automatically before your report is saved.
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
        <div className="flex gap-2 sm:justify-end">
          <button type="button" onClick={onCancel} className={buttonStyles("secondary", "sm")}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={buttonStyles("primary", "sm")}>
            {pending ? "Submitting…" : "Submit break"}
          </button>
        </div>
      </div>
    </form>
  );
}

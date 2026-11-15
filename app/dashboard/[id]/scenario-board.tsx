"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addScenario,
  deleteScenario,
  setScenarioStatus,
  updateScenario,
  type ActionState,
} from "../actions";
import {
  Card,
  ScenarioStatusBadge,
  SeverityBadge,
  buttonStyles,
  cn,
  inputStyles,
  labelStyles,
} from "@/components/ui";
import { submitWithoutReset } from "@/components/form";
import { formatDateTime } from "@/lib/format";
import {
  SCENARIO_STATUSES,
  SCENARIO_STATUS_LABELS,
  SEVERITIES,
  type Scenario,
  type ScenarioStatus,
} from "@/lib/types";

type Filter = "all" | ScenarioStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...SCENARIO_STATUSES.map((s) => ({ value: s, label: SCENARIO_STATUS_LABELS[s] })),
];

export function ScenarioBoard({ runId, scenarios }: { runId: string; scenarios: Scenario[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);

  const counts: Record<Filter, number> = { all: scenarios.length, open: 0, submitted: 0, confirmed_bug: 0, dismissed: 0 };
  for (const s of scenarios) counts[s.status] += 1;

  const visible = filter === "all" ? scenarios : scenarios.filter((s) => s.status === filter);

  return (
    <section aria-labelledby="scenarios-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="scenarios-heading" className="text-sm font-semibold">
          Scenarios
        </h2>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className={buttonStyles("secondary", "sm")}>
            + Add Scenario
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Filter scenarios by status" className="mt-3 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-zinc-200">
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
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "border-indigo-600 text-indigo-700" : "border-transparent text-zinc-500 hover:text-zinc-800",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  active ? "bg-indigo-50 text-indigo-700" : "bg-zinc-100 text-zinc-500",
                )}
              >
                {counts[f.value]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {adding && <AddScenarioForm runId={runId} onDone={() => setAdding(false)} />}

        {visible.length === 0 ? (
          <Card className="px-6 py-12 text-center text-sm text-zinc-500">
            {scenarios.length === 0
              ? "No scenarios yet. Add one, or let Claude create them with create_break_board."
              : `No ${filter === "all" ? "" : SCENARIO_STATUS_LABELS[filter as ScenarioStatus].toLowerCase() + " "}scenarios.`}
          </Card>
        ) : (
          visible.map((s) => <ScenarioCard key={s.id} scenario={s} number={scenarios.indexOf(s) + 1} />)
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function ScenarioFields({ scenario, triage, idPrefix }: { scenario?: Scenario; triage: boolean; idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <div className="sm:col-span-6">
        <label htmlFor={id("title")} className={labelStyles}>
          Title
        </label>
        <input id={id("title")} name="title" required defaultValue={scenario?.title} className={inputStyles} />
      </div>
      <div className={triage ? "sm:col-span-2" : "sm:col-span-4"}>
        <label htmlFor={id("category")} className={labelStyles}>
          Category
        </label>
        <input
          id={id("category")}
          name="category"
          required
          defaultValue={scenario?.category}
          placeholder="e.g. Prompt injection"
          className={inputStyles}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={id("severity")} className={labelStyles}>
          Severity
        </label>
        <select id={id("severity")} name="severity" defaultValue={scenario?.severity ?? "High"} className={inputStyles}>
          {SEVERITIES.map((sev) => (
            <option key={sev} value={sev}>
              {sev}
            </option>
          ))}
        </select>
      </div>
      {triage && (
        <div className="sm:col-span-2">
          <label htmlFor={id("status")} className={labelStyles}>
            Status
          </label>
          <select id={id("status")} name="status" defaultValue={scenario?.status ?? "open"} className={inputStyles}>
            {SCENARIO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SCENARIO_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="sm:col-span-3">
        <label htmlFor={id("instructions")} className={labelStyles}>
          Instructions
        </label>
        <textarea
          id={id("instructions")}
          name="instructions"
          required
          rows={4}
          defaultValue={scenario?.instructions}
          placeholder="What the tester should try"
          className={inputStyles}
        />
      </div>
      <div className="sm:col-span-3">
        <label htmlFor={id("guardrail")} className={labelStyles}>
          Expected guardrail
        </label>
        <textarea
          id={id("guardrail")}
          name="expected_guardrail"
          required
          rows={4}
          defaultValue={scenario?.expected_guardrail}
          placeholder="What the bot should do instead"
          className={inputStyles}
        />
      </div>
      {triage && (
        <div className="sm:col-span-6">
          <label htmlFor={id("pm-notes")} className={labelStyles}>
            PM notes <span className="font-normal text-zinc-400">(internal)</span>
          </label>
          <textarea
            id={id("pm-notes")}
            name="pm_notes"
            rows={2}
            defaultValue={scenario?.pm_notes ?? ""}
            placeholder="Triage notes, repro details, linked ticket…"
            className={inputStyles}
          />
        </div>
      )}
    </div>
  );
}

function AddScenarioForm({ runId, onDone }: { runId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await addScenario(prev, formData);
    if (result.ok) onDone();
    return result;
  }, {});

  return (
    <Card className="border-indigo-200 p-5 ring-1 ring-indigo-100">
      <h3 className="mb-4 text-sm font-semibold">New scenario</h3>
      <form onSubmit={submitWithoutReset(formAction)}>
        <input type="hidden" name="run_id" value={runId} />
        <ScenarioFields triage={false} idPrefix="new-scenario" />
        <FormFooter error={state.error} pending={pending} submitLabel="Add scenario" onCancel={onDone} />
      </form>
    </Card>
  );
}

function FormFooter({
  error,
  pending,
  submitLabel,
  onCancel,
}: {
  error?: string;
  pending: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p role="alert" className="text-sm text-red-600">
        {error}
      </p>
      <div className="flex gap-2 sm:justify-end">
        <button type="button" onClick={onCancel} className={buttonStyles("secondary", "sm")}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className={buttonStyles("primary", "sm")}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function ScenarioCard({ scenario, number }: { scenario: Scenario; number: number }) {
  const [editing, setEditing] = useState(false);
  const [busy, startTransition] = useTransition();
  const [quickError, setQuickError] = useState<string>();

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await updateScenario(prev, formData);
    if (result.ok) setEditing(false);
    return result;
  }, {});

  function runQuick(action: () => Promise<ActionState>) {
    setQuickError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.error) setQuickError(result.error);
    });
  }

  function onDelete() {
    if (!window.confirm(`Delete scenario "${scenario.title}"? This can't be undone.`)) return;
    runQuick(() => deleteScenario(scenario.id));
  }

  if (editing) {
    return (
      <Card className="border-indigo-200 p-5 ring-1 ring-indigo-100">
        <h3 className="mb-4 text-sm font-semibold">
          Editing scenario <span className="text-zinc-400">#{number}</span>
        </h3>
        <form onSubmit={submitWithoutReset(formAction)}>
          <input type="hidden" name="id" value={scenario.id} />
          <ScenarioFields scenario={scenario} triage idPrefix={`edit-${scenario.id}`} />
          <FormFooter error={state.error} pending={pending} submitLabel="Save scenario" onCancel={() => setEditing(false)} />
        </form>
      </Card>
    );
  }

  const hasSubmission = Boolean(scenario.tester_name || scenario.failing_input || scenario.actual_output);

  return (
    <Card className={cn("p-5 transition-opacity", busy && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-zinc-400 tabular-nums">#{number}</span>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">{scenario.category}</span>
            <SeverityBadge severity={scenario.severity} />
            <ScenarioStatusBadge status={scenario.status} />
          </div>
          <h3 className="mt-2 font-semibold text-zinc-900">{scenario.title}</h3>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={() => setEditing(true)} disabled={busy} className={buttonStyles("secondary", "sm")}>
            Edit
          </button>
          <button type="button" onClick={onDelete} disabled={busy} className={buttonStyles("danger", "sm")}>
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Instructions">{scenario.instructions}</Field>
        <Field label="Expected guardrail">{scenario.expected_guardrail}</Field>
      </div>

      {hasSubmission && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-xs font-medium text-amber-900">
            Tester submission
            {scenario.tester_name && <> by {scenario.tester_name}</>}
            {scenario.submitted_at && <span className="font-normal text-amber-700"> · {formatDateTime(scenario.submitted_at)}</span>}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Failing input" mono>
              {scenario.failing_input || "—"}
            </Field>
            <Field label="Actual bot output" mono>
              {scenario.actual_output || "—"}
            </Field>
          </div>
        </div>
      )}

      {scenario.pm_notes && (
        <div className="mt-4 rounded-lg bg-zinc-50 p-3">
          <Field label="PM notes">{scenario.pm_notes}</Field>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
        <p role="alert" className="text-sm text-red-600">
          {quickError}
        </p>
        <div className="flex gap-2">
          {scenario.status === "submitted" && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => runQuick(() => setScenarioStatus(scenario.id, "dismissed"))}
                className={buttonStyles("secondary", "sm")}
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runQuick(() => setScenarioStatus(scenario.id, "confirmed_bug"))}
                className={cn(buttonStyles("primary", "sm"), "bg-red-600 hover:bg-red-500")}
              >
                Confirm bug
              </button>
            </>
          )}
          {(scenario.status === "confirmed_bug" || scenario.status === "dismissed") && (
            <button
              type="button"
              disabled={busy}
              onClick={() => runQuick(() => setScenarioStatus(scenario.id, hasSubmission ? "submitted" : "open"))}
              className={buttonStyles("ghost", "sm")}
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function Field({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className={cn("mt-1 text-sm whitespace-pre-wrap text-zinc-800", mono && "font-mono text-[13px]")}>{children}</p>
    </div>
  );
}

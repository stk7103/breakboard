"use client";

import { useActionState, useRef, useState } from "react";
import { createRun, type ActionState } from "./actions";
import { submitWithoutReset } from "@/components/form";
import { buttonStyles, cn, inputStyles, labelStyles } from "@/components/ui";
import { RUN_STATUSES, RUN_STATUS_LABELS, SEVERITIES, type Severity } from "@/lib/types";

type DraftScenario = {
  key: string;
  category: string;
  title: string;
  instructions: string;
  expected_guardrail: string;
  severity: Severity;
};

function newDraft(key: string): DraftScenario {
  return {
    key,
    category: "",
    title: "",
    instructions: "",
    expected_guardrail: "",
    severity: "High",
  };
}

function isBlank(s: DraftScenario): boolean {
  return !s.category.trim() && !s.title.trim() && !s.instructions.trim() && !s.expected_guardrail.trim();
}

/** "+ New Break-Test Run" button and modal: create a run and its initial scenarios without Claude. */
export function NewRunDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Deterministic row keys (a random key would break prerendering).
  const [nextKey, setNextKey] = useState(1);
  const [scenarios, setScenarios] = useState<DraftScenario[]>(() => [newDraft("row-0")]);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createRun, {});

  const payload = JSON.stringify(
    scenarios
      .filter((s) => !isBlank(s))
      .map((s) => ({
        category: s.category,
        title: s.title,
        instructions: s.instructions,
        expected_guardrail: s.expected_guardrail,
        severity: s.severity,
      })),
  );

  function update(key: string, patch: Partial<DraftScenario>) {
    setScenarios((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={buttonStyles("primary")}>
        <span aria-hidden="true" className="text-base leading-none">+</span> New Break-Test Run
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="new-run-title"
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl bg-white p-0 shadow-2xl"
      >
        <form onSubmit={submitWithoutReset(formAction)} className="flex max-h-[90vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
            <div>
              <h2 id="new-run-title" className="text-lg font-semibold">
                New Break-Test Run
              </h2>
              <p className="text-sm text-zinc-500">Set up the bot under test and its first scenarios.</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className={buttonStyles("ghost", "sm")}
            >
              ✕
            </button>
          </div>

          <div className="space-y-6 overflow-y-auto px-6 py-5">
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="sr-only">Run details</legend>
              <div>
                <label htmlFor="nr-bot-name" className={labelStyles}>
                  Bot name
                </label>
                <input id="nr-bot-name" name="bot_name" required placeholder="Acme Support Bot" className={inputStyles} />
              </div>
              <div>
                <label htmlFor="nr-status" className={labelStyles}>
                  Status
                </label>
                <select id="nr-status" name="status" defaultValue="draft" className={inputStyles}>
                  {RUN_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {RUN_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="nr-bot-target" className={labelStyles}>
                  Bot target
                </label>
                <input
                  id="nr-bot-target"
                  name="bot_target"
                  required
                  placeholder="Staging URL, phone number, or bot identifier"
                  className={inputStyles}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="nr-description" className={labelStyles}>
                  Description <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <textarea
                  id="nr-description"
                  name="description"
                  rows={2}
                  placeholder="What should testers know about this bot?"
                  className={inputStyles}
                />
              </div>
            </fieldset>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">Initial scenarios</h3>
                <span className="text-xs text-zinc-500">Blank rows are skipped</span>
              </div>
              <ol className="space-y-3">
                {scenarios.map((s, i) => (
                  <li key={s.key} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-500">Scenario {i + 1}</span>
                      {scenarios.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setScenarios((rows) => rows.filter((r) => r.key !== s.key))}
                          className="text-xs font-medium text-zinc-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-6">
                      <input
                        aria-label={`Scenario ${i + 1} title`}
                        placeholder="Title"
                        value={s.title}
                        onChange={(e) => update(s.key, { title: e.target.value })}
                        className={cn(inputStyles, "sm:col-span-6")}
                      />
                      <input
                        aria-label={`Scenario ${i + 1} category`}
                        placeholder="Category (e.g. Prompt injection)"
                        value={s.category}
                        onChange={(e) => update(s.key, { category: e.target.value })}
                        className={cn(inputStyles, "sm:col-span-4")}
                      />
                      <select
                        aria-label={`Scenario ${i + 1} severity`}
                        value={s.severity}
                        onChange={(e) => update(s.key, { severity: e.target.value as Severity })}
                        className={cn(inputStyles, "sm:col-span-2")}
                      >
                        {SEVERITIES.map((sev) => (
                          <option key={sev} value={sev}>
                            {sev}
                          </option>
                        ))}
                      </select>
                      <textarea
                        aria-label={`Scenario ${i + 1} instructions`}
                        placeholder="Instructions for the tester"
                        rows={2}
                        value={s.instructions}
                        onChange={(e) => update(s.key, { instructions: e.target.value })}
                        className={cn(inputStyles, "sm:col-span-3")}
                      />
                      <textarea
                        aria-label={`Scenario ${i + 1} expected guardrail`}
                        placeholder="Expected guardrail (what the bot should do)"
                        rows={2}
                        value={s.expected_guardrail}
                        onChange={(e) => update(s.key, { expected_guardrail: e.target.value })}
                        className={cn(inputStyles, "sm:col-span-3")}
                      />
                    </div>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => {
                  setScenarios((rows) => [...rows, newDraft(`row-${nextKey}`)]);
                  setNextKey((n) => n + 1);
                }}
                className={cn(buttonStyles("secondary", "sm"), "mt-3")}
              >
                + Add scenario
              </button>
            </div>
          </div>

          <input type="hidden" name="scenarios" value={payload} />

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p role="alert" className="text-sm text-red-600">
              {state.error}
            </p>
            <div className="flex gap-2 sm:justify-end">
              <button type="button" onClick={() => dialogRef.current?.close()} className={buttonStyles("secondary")}>
                Cancel
              </button>
              <button type="submit" disabled={pending} className={buttonStyles("primary")}>
                {pending ? "Creating…" : "Create run"}
              </button>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}

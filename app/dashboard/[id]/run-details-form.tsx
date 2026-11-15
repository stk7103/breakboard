"use client";

import { useActionState } from "react";
import { updateRun, type ActionState } from "../actions";
import { submitWithoutReset } from "@/components/form";
import { Card, buttonStyles, inputStyles, labelStyles } from "@/components/ui";
import { RUN_STATUSES, RUN_STATUS_LABELS, type RunStatus, type TestRun } from "@/lib/types";

const STATUS_HELP: Record<RunStatus, string> = {
  draft: "Being prepared. Review scenarios before sharing.",
  live: "Testers can open the public link and submit failures.",
  closed: "Testing has ended. Submissions are closed.",
};

export function RunDetailsForm({ run }: { run: TestRun }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateRun, {});

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Run details</h2>
      {/* Re-mount on save so fields show the stored values. */}
      <form key={run.updated_at} onSubmit={submitWithoutReset(formAction)} className="mt-4 space-y-4">
        <input type="hidden" name="id" value={run.id} />

        <div>
          <label htmlFor="run-bot-name" className={labelStyles}>
            Bot name
          </label>
          <input id="run-bot-name" name="bot_name" required defaultValue={run.bot_name} className={inputStyles} />
        </div>

        <div>
          <label htmlFor="run-bot-target" className={labelStyles}>
            Bot target
          </label>
          <input
            id="run-bot-target"
            name="bot_target"
            required
            defaultValue={run.bot_target}
            placeholder="Staging URL, phone number, or bot identifier"
            className={inputStyles}
          />
        </div>

        <div>
          <label htmlFor="run-description" className={labelStyles}>
            Description
          </label>
          <textarea
            id="run-description"
            name="description"
            rows={4}
            defaultValue={run.description ?? ""}
            placeholder="Context for testers"
            className={inputStyles}
          />
        </div>

        <fieldset>
          <legend className={labelStyles}>Status</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1">
            {RUN_STATUSES.map((s) => (
              <label key={s} className="cursor-pointer">
                <input type="radio" name="status" value={s} defaultChecked={run.status === s} className="peer sr-only" />
                <span className="block rounded-md px-2 py-1.5 text-center text-sm font-medium text-zinc-500 transition peer-checked:bg-white peer-checked:text-zinc-900 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-indigo-600">
                  {RUN_STATUS_LABELS[s]}
                </span>
              </label>
            ))}
          </div>
          <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
            {RUN_STATUSES.map((s) => (
              <li key={s}>
                <span className="font-medium text-zinc-700">{RUN_STATUS_LABELS[s]}:</span> {STATUS_HELP[s]}
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p role="status" className={state.error ? "text-sm text-red-600" : "text-sm text-emerald-600"}>
            {state.error ?? (state.ok ? "Saved" : "")}
          </p>
          <button type="submit" disabled={pending} className={buttonStyles("primary", "sm")}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Card>
  );
}

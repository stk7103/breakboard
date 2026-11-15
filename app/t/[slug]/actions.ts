"use server";

import { refresh } from "next/cache";
import { redactText } from "@/lib/redact";
import { supabase } from "@/lib/supabase";
import { firstIssue, testerSubmissionSchema } from "@/lib/validation";

/**
 * Public (unauthenticated) Server Action: a tester reports how the bot failed
 * one scenario. Everything the tester typed is PII-scrubbed before storage.
 *
 * Guards: the run must be Live, the scenario must belong to it, and it must
 * still be `open`. The status check is part of the UPDATE's WHERE clause, so
 * two testers racing on the same scenario can't overwrite each other.
 */

export type SubmitState = { ok?: boolean; error?: string; at?: number };

export async function submitFailure(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  // Honeypot: real users never see or fill this field.
  if (formData.get("website")) return { ok: true, at: Date.now() };

  const parsed = testerSubmissionSchema.safeParse({
    slug: formData.get("slug"),
    scenario_id: formData.get("scenario_id"),
    tester_name: formData.get("tester_name") ?? undefined,
    failing_input: formData.get("failing_input") ?? undefined,
    actual_output: formData.get("actual_output") ?? undefined,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const input = parsed.data;

  try {
    const { data: run, error: runError } = await supabase
      .from("test_runs")
      .select("id, status")
      .eq("slug", input.slug)
      .maybeSingle();
    if (runError) throw runError;
    if (!run) return { error: "This board no longer exists." };
    if (run.status === "closed") return { error: "Testing has ended for this board." };
    if (run.status !== "live") return { error: "This board isn't open for testing yet." };

    const { data: updated, error } = await supabase
      .from("scenarios")
      .update({
        tester_name: redactText(input.tester_name),
        failing_input: redactText(input.failing_input),
        actual_output: redactText(input.actual_output),
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", input.scenario_id)
      .eq("run_id", run.id)
      .eq("status", "open")
      .select("id");
    if (error) throw error;
    if (!updated || updated.length === 0) {
      return { error: "Another tester already reported this scenario. Please pick a different open one." };
    }
  } catch {
    return { error: "Couldn't send your report. Please try again." };
  }

  refresh();
  return { ok: true, at: Date.now() };
}

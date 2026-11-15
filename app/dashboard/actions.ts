"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createRunWithScenarios, redactScenario } from "@/lib/runs";
import { supabase } from "@/lib/supabase";
import { SCENARIO_STATUSES, type ScenarioStatus } from "@/lib/types";
import {
  firstIssue,
  runFieldsSchema,
  scenarioEditSchema,
  scenarioFieldsSchema,
  uuidSchema,
} from "@/lib/validation";

/**
 * Dashboard Server Actions. Every action re-checks the admin session itself:
 * proxy.ts guards page loads, but actions must never rely on it alone.
 */

export type ActionState = { ok?: boolean; error?: string; at?: number };

const MAX_SCENARIOS_PER_RUN = 200;

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}

function formValues(formData: FormData, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = formData.get(key);
    out[key] = value === null ? undefined : value;
  }
  return out;
}

const RUN_KEYS = ["bot_name", "bot_target", "description", "status"] as const;
const SCENARIO_KEYS = ["category", "title", "instructions", "expected_guardrail", "severity"] as const;
const SCENARIO_EDIT_KEYS = [...SCENARIO_KEYS, "status", "pm_notes"] as const;

export async function createRun(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const fields = runFieldsSchema.safeParse({ status: "draft", ...formValues(formData, RUN_KEYS) });
  if (!fields.success) return { error: firstIssue(fields.error) };

  let rawScenarios: unknown;
  try {
    rawScenarios = JSON.parse(String(formData.get("scenarios") ?? "[]"));
  } catch {
    return { error: "Scenarios could not be read. Please try again." };
  }
  const scenarios = z.array(scenarioFieldsSchema).max(MAX_SCENARIOS_PER_RUN).safeParse(rawScenarios);
  if (!scenarios.success) {
    const issue = scenarios.error.issues[0];
    const row = typeof issue?.path[0] === "number" ? `Scenario ${issue.path[0] + 1}: ` : "";
    return { error: row + (issue?.message ?? "Invalid scenario.") };
  }

  let runId: string;
  try {
    const run = await createRunWithScenarios({ ...fields.data, scenarios: scenarios.data });
    runId = run.id;
  } catch (err) {
    return { error: message(err) };
  }
  redirect(`/dashboard/${runId}`);
}

export async function updateRun(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Unknown run." };
  const fields = runFieldsSchema.safeParse(formValues(formData, RUN_KEYS));
  if (!fields.success) return { error: firstIssue(fields.error) };

  try {
    const { error } = await supabase.from("test_runs").update(fields.data).eq("id", id.data);
    if (error) throw new Error(`Failed to save run: ${error.message}`);
  } catch (err) {
    return { error: message(err) };
  }
  refresh();
  return { ok: true, at: Date.now() };
}

export async function addScenario(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const runId = uuidSchema.safeParse(formData.get("run_id"));
  if (!runId.success) return { error: "Unknown run." };
  const fields = scenarioFieldsSchema.safeParse(formValues(formData, SCENARIO_KEYS));
  if (!fields.success) return { error: firstIssue(fields.error) };

  try {
    const { data: last, error: lastError } = await supabase
      .from("scenarios")
      .select("position")
      .eq("run_id", runId.data)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw new Error(`Failed to add scenario: ${lastError.message}`);

    const { error } = await supabase.from("scenarios").insert({
      ...redactScenario(fields.data),
      run_id: runId.data,
      position: (last?.position ?? -1) + 1,
    });
    if (error) throw new Error(`Failed to add scenario: ${error.message}`);
  } catch (err) {
    return { error: message(err) };
  }
  refresh();
  return { ok: true, at: Date.now() };
}

export async function updateScenario(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Unknown scenario." };
  const fields = scenarioEditSchema.safeParse(formValues(formData, SCENARIO_EDIT_KEYS));
  if (!fields.success) return { error: firstIssue(fields.error) };

  try {
    const { error } = await supabase.from("scenarios").update(redactScenario(fields.data)).eq("id", id.data);
    if (error) throw new Error(`Failed to save scenario: ${error.message}`);
  } catch (err) {
    return { error: message(err) };
  }
  refresh();
  return { ok: true, at: Date.now() };
}

export async function setScenarioStatus(scenarioId: string, status: ScenarioStatus): Promise<ActionState> {
  await requireAdmin();

  const id = uuidSchema.safeParse(scenarioId);
  const next = z.enum(SCENARIO_STATUSES).safeParse(status);
  if (!id.success || !next.success) return { error: "Invalid status change." };

  try {
    const { error } = await supabase.from("scenarios").update({ status: next.data }).eq("id", id.data);
    if (error) throw new Error(`Failed to update status: ${error.message}`);
  } catch (err) {
    return { error: message(err) };
  }
  refresh();
  return { ok: true, at: Date.now() };
}

export async function deleteScenario(scenarioId: string): Promise<ActionState> {
  await requireAdmin();

  const id = uuidSchema.safeParse(scenarioId);
  if (!id.success) return { error: "Unknown scenario." };

  try {
    const { error } = await supabase.from("scenarios").delete().eq("id", id.data);
    if (error) throw new Error(`Failed to delete scenario: ${error.message}`);
  } catch (err) {
    return { error: message(err) };
  }
  refresh();
  return { ok: true, at: Date.now() };
}

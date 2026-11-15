import { dbError } from "@/lib/db-error";
import { redactText } from "@/lib/redact";
import { supabase } from "@/lib/supabase";
import type { RunStatus, Scenario, ScenarioCounts, Severity, TestRun } from "@/lib/types";
import { emptyCounts } from "@/lib/types";

/**
 * Server-only data access for test runs and scenarios. Shared by the MCP
 * route and the dashboard. Callers are responsible for authorization
 * (dashboard code calls `requireAdmin()` first).
 */

const SLUG_SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const MAX_SLUG_ATTEMPTS = 5;
const UNIQUE_VIOLATION = "23505";

export const RUN_COLUMNS = "id, slug, bot_name, bot_target, description, status, created_at, updated_at";
// One string literal (not concatenated) so supabase-js can infer row types from it.
export const SCENARIO_COLUMNS =
  "id, run_id, position, category, title, instructions, expected_guardrail, severity, status, tester_name, failing_input, actual_output, pm_notes, submitted_at, created_at, updated_at";

export function slugifyName(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base || "bot";
}

function randomSuffix(length = 4): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => SLUG_SUFFIX_ALPHABET[b % SLUG_SUFFIX_ALPHABET.length]).join("");
}

export type NewScenario = {
  category: string;
  title: string;
  instructions: string;
  expected_guardrail: string;
  severity: Severity;
};

/** Scenario text is PII-scrubbed before it is stored. */
export function redactScenario<T extends Partial<NewScenario> & { pm_notes?: string | null }>(s: T): T {
  const out = { ...s };
  for (const key of ["category", "title", "instructions", "expected_guardrail", "pm_notes"] as const) {
    const value = out[key];
    if (typeof value === "string") (out as Record<string, unknown>)[key] = redactText(value);
  }
  return out;
}

/**
 * Inserts a run with a fresh `<bot-name>-<4 chars>` slug (retrying on
 * collision), then its scenarios. If the scenario insert fails the run is
 * deleted so no half-created board is left behind.
 */
export async function createRunWithScenarios(input: {
  bot_name: string;
  bot_target: string;
  description: string | null;
  status?: RunStatus;
  scenarios: NewScenario[];
}): Promise<{ id: string; slug: string }> {
  const base = slugifyName(input.bot_name);

  let run: { id: string; slug: string } | null = null;
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS && !run; attempt++) {
    const { data, error } = await supabase
      .from("test_runs")
      .insert({
        slug: `${base}-${randomSuffix()}`,
        bot_name: input.bot_name,
        bot_target: input.bot_target,
        description: input.description,
        status: input.status ?? "draft",
      })
      .select("id, slug")
      .single();
    if (!error) run = data;
    else if (error.code !== UNIQUE_VIOLATION) throw dbError("Failed to create test run", error);
  }
  if (!run) throw new Error("Could not generate a unique slug; please retry.");

  if (input.scenarios.length > 0) {
    const rows = input.scenarios.map((s, i) => ({
      ...redactScenario({
        category: s.category,
        title: s.title,
        instructions: s.instructions,
        expected_guardrail: s.expected_guardrail,
      }),
      run_id: run.id,
      position: i,
      severity: s.severity,
    }));
    const { error } = await supabase.from("scenarios").insert(rows);
    if (error) {
      await supabase.from("test_runs").delete().eq("id", run.id);
      throw dbError("Failed to create scenarios", error);
    }
  }

  return run;
}

export type RunSummary = TestRun & { counts: ScenarioCounts };

/** All runs (newest first) with per-run scenario counts, plus global totals. */
export async function listRunsWithCounts(): Promise<{ runs: RunSummary[]; totals: ScenarioCounts }> {
  const [runsRes, scenariosRes] = await Promise.all([
    supabase.from("test_runs").select(RUN_COLUMNS).order("created_at", { ascending: false }),
    supabase.from("scenarios").select("run_id, status"),
  ]);
  if (runsRes.error) throw dbError("Failed to load runs", runsRes.error);
  if (scenariosRes.error) throw dbError("Failed to load scenarios", scenariosRes.error);

  const totals = emptyCounts();
  const byRun = new Map<string, ScenarioCounts>();
  for (const s of (scenariosRes.data ?? []) as Pick<Scenario, "run_id" | "status">[]) {
    const counts = byRun.get(s.run_id) ?? emptyCounts();
    counts[s.status] += 1;
    counts.total += 1;
    byRun.set(s.run_id, counts);
    totals[s.status] += 1;
    totals.total += 1;
  }

  const runs = ((runsRes.data ?? []) as TestRun[]).map((run) => ({
    ...run,
    counts: byRun.get(run.id) ?? emptyCounts(),
  }));
  return { runs, totals };
}

/** What the public tester page may see. PM notes never leave the server. */
export type PublicRun = Pick<TestRun, "id" | "slug" | "bot_name" | "bot_target" | "description" | "status">;
export type PublicScenario = Pick<
  Scenario,
  | "id"
  | "position"
  | "category"
  | "title"
  | "instructions"
  | "expected_guardrail"
  | "severity"
  | "status"
  | "tester_name"
  | "failing_input"
  | "actual_output"
  | "submitted_at"
>;

export async function getPublicBoard(
  slug: string,
): Promise<{ run: PublicRun; scenarios: PublicScenario[] } | null> {
  const { data: run, error } = await supabase
    .from("test_runs")
    .select("id, slug, bot_name, bot_target, description, status")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw dbError("Failed to load board", error);
  if (!run) return null;

  // Draft boards are still being reviewed by a PM: don't expose their scenarios.
  if (run.status === "draft") return { run: run as PublicRun, scenarios: [] };

  const { data: scenarios, error: scenariosError } = await supabase
    .from("scenarios")
    .select(
      "id, position, category, title, instructions, expected_guardrail, severity, status, tester_name, failing_input, actual_output, submitted_at",
    )
    .eq("run_id", run.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (scenariosError) throw dbError("Failed to load scenarios", scenariosError);

  return { run: run as PublicRun, scenarios: (scenarios ?? []) as PublicScenario[] };
}

export async function getRunWithScenarios(id: string): Promise<{ run: TestRun; scenarios: Scenario[] } | null> {
  const { data: run, error } = await supabase.from("test_runs").select(RUN_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw dbError("Failed to load run", error);
  if (!run) return null;

  const { data: scenarios, error: scenariosError } = await supabase
    .from("scenarios")
    .select(SCENARIO_COLUMNS)
    .eq("run_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (scenariosError) throw dbError("Failed to load scenarios", scenariosError);

  return { run: run as TestRun, scenarios: (scenarios ?? []) as Scenario[] };
}

/** Shared domain types and enums. Safe to import from client components. */

export const RUN_STATUSES = ["draft", "live", "closed"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const SCENARIO_STATUSES = ["open", "submitted", "confirmed_bug", "dismissed"] as const;
export type ScenarioStatus = (typeof SCENARIO_STATUSES)[number];

export const SEVERITIES = ["Blocker", "High", "Medium"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SCENARIO_STATUS_LABELS: Record<ScenarioStatus, string> = {
  open: "Open",
  submitted: "Submitted",
  confirmed_bug: "Confirmed Bug",
  dismissed: "Dismissed",
};

export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  draft: "Draft",
  live: "Live",
  closed: "Closed",
};

/** Slug of the seeded sample board (supabase/seed.sql). */
export const SAMPLE_BOARD_SLUG = "sample-support-bot";

export type TestRun = {
  id: string;
  slug: string;
  bot_name: string;
  bot_target: string;
  description: string | null;
  status: RunStatus;
  created_at: string;
  updated_at: string;
};

export type Scenario = {
  id: string;
  run_id: string;
  position: number;
  category: string;
  title: string;
  instructions: string;
  expected_guardrail: string;
  severity: Severity;
  status: ScenarioStatus;
  tester_name: string | null;
  failing_input: string | null;
  actual_output: string | null;
  pm_notes: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ScenarioCounts = Record<ScenarioStatus, number> & { total: number };

export function emptyCounts(): ScenarioCounts {
  return { open: 0, submitted: 0, confirmed_bug: 0, dismissed: 0, total: 0 };
}

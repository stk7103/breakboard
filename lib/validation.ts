import { z } from "zod";
import { RUN_STATUSES, SCENARIO_STATUSES, SEVERITIES } from "@/lib/types";

/** Shared zod schemas for dashboard forms. Safe to import from client components. */

const text = (label: string, max: number) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be at most ${max} characters.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const runFieldsSchema = z.object({
  bot_name: text("Bot name", 120),
  bot_target: text("Bot target", 500),
  description: optionalText(4000),
  status: z.enum(RUN_STATUSES),
});

export const scenarioFieldsSchema = z.object({
  category: text("Category", 80),
  title: text("Title", 200),
  instructions: text("Instructions", 4000),
  expected_guardrail: text("Expected guardrail", 2000),
  severity: z.enum(SEVERITIES).default("High"),
});

export const scenarioEditSchema = scenarioFieldsSchema.extend({
  status: z.enum(SCENARIO_STATUSES),
  pm_notes: optionalText(4000),
});

export const uuidSchema = z.uuid();

/** Public tester report for one scenario (/t/[slug]). */
export const testerSubmissionSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  scenario_id: uuidSchema,
  tester_name: text("Your name", 80),
  failing_input: text("What you said to the bot", 8000),
  actual_output: text("What the bot replied", 8000),
});

export type ScenarioInput = z.input<typeof scenarioFieldsSchema>;

/** First validation message, for a compact inline error. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message ?? "Invalid input.";
}

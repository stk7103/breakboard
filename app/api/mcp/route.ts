/**
 * BreakBoard remote MCP server (stateless Streamable HTTP).
 *
 * No AI runs here: these tools only read/write Supabase. All reasoning happens
 * in the user's own Claude client, which calls these tools over MCP.
 *
 * Connect a client to: ${NEXT_PUBLIC_APP_URL}/api/mcp
 */
import { createMcpHandler, getPublicOrigin } from "mcp-handler";
import { z } from "zod";
import { RUN_COLUMNS, SCENARIO_COLUMNS, createRunWithScenarios } from "@/lib/runs";
import { supabase } from "@/lib/supabase";

// No `runtime`/`dynamic` segment exports: this app has `cacheComponents` on,
// which rejects them. Route handlers default to the Node runtime, and these
// request-driven handlers are never prerendered.

type TextResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function text(body: string): TextResult {
  return { content: [{ type: "text", text: body }] };
}

function errorResult(body: string): TextResult {
  return { content: [{ type: "text", text: body }], isError: true };
}

/** Public base URL for links: env first, then the request's public origin. */
function appUrl(req?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (req) return getPublicOrigin(req);
  return "http://localhost:3000";
}

async function findRunBySlug(slug: string) {
  const { data, error } = await supabase
    .from("test_runs")
    .select(RUN_COLUMNS)
    .eq("slug", slug.trim())
    .maybeSingle();
  if (error) throw new Error(`Failed to load test run: ${error.message}`);
  return data;
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const scenarioInput = z.object({
  category: z.string(),
  title: z.string(),
  instructions: z.string(),
  expected_guardrail: z.string(),
  severity: z.enum(["Blocker", "High", "Medium"]).default("High"),
});

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "create_break_board",
      {
        title: "Create Break Board",
        description:
          "Create a BreakBoard test run for a bot with a list of adversarial test scenarios. " +
          "Returns the admin edit URL and the public tester link to share with human testers.",
        inputSchema: z.object({
          bot_name: z.string(),
          bot_target: z.string().describe("Staging URL, phone number, or bot identifier"),
          description: z.string().optional(),
          scenarios: z.array(scenarioInput),
        }),
      },
      async ({ bot_name, bot_target, description, scenarios }, ctx) => {
        try {
          // Slug generation, PII redaction of scenario text, and rollback on
          // failure all live in lib/runs.ts (shared with the dashboard form).
          const run = await createRunWithScenarios({
            bot_name,
            bot_target,
            description: description ?? null,
            status: "draft",
            scenarios,
          });

          const url = appUrl(ctx.http?.req);
          return text(
            [
              `Created BreakBoard "${bot_name}" with ${scenarios.length} scenario(s). Status: draft.`,
              ``,
              `Admin Edit URL: ${url}/dashboard/${run.id}`,
              `Public Tester Link: ${url}/t/${run.slug}`,
              `Slug: ${run.slug}`,
              ``,
              `Next: a PM reviews and edits the scenarios at the Admin Edit URL and sets the run to Live, ` +
                `then shares the Public Tester Link. Use list_submissions or get_confirmed_bugs with slug "${run.slug}" to review results.`,
            ].join("\n"),
          );
        } catch (err) {
          return errorResult(describeError(err));
        }
      },
    );

    server.registerTool(
      "list_submissions",
      {
        title: "List Submissions",
        description:
          "List every scenario in a BreakBoard run with its status (open, submitted, confirmed_bug, dismissed), " +
          "tester name, failing input, and actual bot output.",
        inputSchema: z.object({ slug: z.string() }),
        annotations: { readOnlyHint: true },
      },
      async ({ slug }) => {
        try {
          const run = await findRunBySlug(slug);
          if (!run) return errorResult(`No BreakBoard run found with slug "${slug}".`);

          const { data, error } = await supabase
            .from("scenarios")
            .select(SCENARIO_COLUMNS)
            .eq("run_id", run.id)
            .order("position", { ascending: true });
          if (error) throw new Error(`Failed to load scenarios: ${error.message}`);

          const scenarios = data ?? [];
          const counts = { open: 0, submitted: 0, confirmed_bug: 0, dismissed: 0 } as Record<string, number>;
          for (const s of scenarios) counts[s.status] = (counts[s.status] ?? 0) + 1;

          return text(
            [
              `BreakBoard "${run.bot_name}" (${run.slug}) — target: ${run.bot_target}`,
              `${scenarios.length} scenario(s): ${counts.open} open, ${counts.submitted} submitted, ` +
                `${counts.confirmed_bug} confirmed_bug, ${counts.dismissed} dismissed.`,
              ``,
              JSON.stringify({ run, scenarios }, null, 2),
            ].join("\n"),
          );
        } catch (err) {
          return errorResult(describeError(err));
        }
      },
    );

    server.registerTool(
      "get_confirmed_bugs",
      {
        title: "Get Confirmed Bugs",
        description:
          "Get all scenarios in a BreakBoard run whose status is confirmed_bug, with the tester's failing input " +
          "and the bot's actual output, so the failures can be analyzed and prompt/guardrail fixes suggested.",
        inputSchema: z.object({ slug: z.string() }),
        annotations: { readOnlyHint: true },
      },
      async ({ slug }) => {
        try {
          const run = await findRunBySlug(slug);
          if (!run) return errorResult(`No BreakBoard run found with slug "${slug}".`);

          const { data, error } = await supabase
            .from("scenarios")
            .select(SCENARIO_COLUMNS)
            .eq("run_id", run.id)
            .eq("status", "confirmed_bug")
            .order("position", { ascending: true });
          if (error) throw new Error(`Failed to load confirmed bugs: ${error.message}`);

          const bugs = data ?? [];
          if (bugs.length === 0) {
            return text(`BreakBoard "${run.bot_name}" (${run.slug}) has no confirmed bugs yet.`);
          }

          return text(
            [
              `BreakBoard "${run.bot_name}" (${run.slug}) — ${bugs.length} confirmed bug(s).`,
              `Each entry has the expected_guardrail, the tester's failing_input, and the bot's actual_output.`,
              ``,
              JSON.stringify({ run, confirmed_bugs: bugs }, null, 2),
            ].join("\n"),
          );
        } catch (err) {
          return errorResult(describeError(err));
        }
      },
    );
  },
  {
    serverInfo: { name: "breakboard", version: "0.1.0" },
    instructions:
      "BreakBoard turns adversarial test scenarios into a shareable board for human testers. " +
      "Use create_break_board to publish scenarios, list_submissions to review progress, and " +
      "get_confirmed_bugs to analyze verified failures and propose prompt or guardrail fixes.",
  },
);

export { handler as GET, handler as POST, handler as DELETE };

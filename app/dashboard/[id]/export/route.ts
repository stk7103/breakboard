import { getAdmin } from "@/lib/auth";
import { getRunWithScenarios } from "@/lib/runs";
import { uuidSchema } from "@/lib/validation";

/** GET /dashboard/[id]/export: confirmed bugs for one run as a JSON download. */
export async function GET(_request: Request, ctx: RouteContext<"/dashboard/[id]/export">) {
  // proxy.ts already guards /dashboard/**, but route handlers re-check.
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!uuidSchema.safeParse(id).success) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  const data = await getRunWithScenarios(id);
  if (!data) return Response.json({ error: "Run not found" }, { status: 404 });
  const { run, scenarios } = data;

  const confirmedBugs = scenarios
    .filter((s) => s.status === "confirmed_bug")
    .map((s) => ({
      id: s.id,
      category: s.category,
      title: s.title,
      severity: s.severity,
      instructions: s.instructions,
      expected_guardrail: s.expected_guardrail,
      tester_name: s.tester_name,
      failing_input: s.failing_input,
      actual_output: s.actual_output,
      pm_notes: s.pm_notes,
      submitted_at: s.submitted_at,
    }));

  const body = {
    exported_at: new Date().toISOString(),
    run: {
      id: run.id,
      slug: run.slug,
      bot_name: run.bot_name,
      bot_target: run.bot_target,
      description: run.description,
      status: run.status,
    },
    confirmed_bug_count: confirmedBugs.length,
    confirmed_bugs: confirmedBugs,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="breakboard-${run.slug}-confirmed-bugs.json"`,
      "Cache-Control": "no-store",
    },
  });
}

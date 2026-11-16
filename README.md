# BreakBoard

**Crowd-test your AI & voice agents with real humans. Zero AI API overhead.**

BreakBoard is a shared board between product managers and human testers. Claude (in your own Claude client) drafts adversarial test scenarios over MCP, a PM reviews and publishes them, testers try to break the bot and log exactly what happened, and the PM triages the results into confirmed bugs.

There is **no AI inside this app**: no LLM SDKs, no AI API keys, no chat widgets. All reasoning happens in the user's own Claude client through the MCP server at `/api/mcp`.

## Features

- **Remote MCP server** (`/api/mcp`, stateless Streamable HTTP) with three tools:
  - `create_break_board`: create a run + scenarios, returns the admin edit URL and public tester link
  - `list_submissions`: every scenario with status, tester, failing input and bot output
  - `get_confirmed_bugs`: verified failures for Claude to analyze and propose prompt/guardrail fixes
- **Admin dashboard** (`/dashboard`, cookie login): KPI cards, all runs, a "+ New Break-Test Run" modal, a run editor with Draft/Live/Closed status, inline scenario editing, one-click triage (Confirm bug / Dismiss / Reopen) and a JSON export of confirmed bugs
- **Public tester portal** (`/t/[slug]`, no login): target bot instructions, progress, filterable scenario cards, a "Submit a Break" form and a live Bug-Hunter leaderboard (100 pts per confirmed bug, 25 per submission)
- **PII redaction**: emails, 10+ digit phone numbers, UPI IDs and 12-digit ID numbers are masked (`lib/redact.ts`, pure regex) before anything is saved

## Tech stack

Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4, Supabase (`@supabase/supabase-js`), `mcp-handler` + `@modelcontextprotocol/server`, `zod`.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and fill in your Supabase project URL and **service role** key. The `DEMO_ADMIN_*` values are the dashboard login.

3. In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql), then optionally [`supabase/seed.sql`](supabase/seed.sql) for the sample board at `/t/sample-support-bot`.

4. Start the dev server and open http://localhost:3000:

   ```bash
   npm run dev
   ```

## Connect Claude via MCP

Point any Streamable-HTTP MCP client at `http://localhost:3000/api/mcp` (or your deployed URL). For stdio-only clients:

```json
{
  "breakboard": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp"]
  }
}
```

Then ask Claude to create a break board for your bot, and later to fetch the confirmed bugs and suggest fixes.

## Project structure

```
app/
  api/mcp/route.ts          MCP server (create_break_board, list_submissions, get_confirmed_bugs)
  dashboard/                Admin dashboard, run editor, triage, JSON export
  login/                    Cookie login (Server Action)
  t/[slug]/                 Public tester portal + leaderboard
lib/
  redact.ts                 Deterministic PII scrubber
  runs.ts                   Data access shared by MCP + dashboard
  session.ts, auth.ts       Signed session cookie, admin checks
  supabase.ts               Server-side Supabase client (service role)
proxy.ts                    Redirects unauthenticated /dashboard requests to /login
supabase/schema.sql         Tables, constraints, RLS
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `couldn't reach Supabase` / `TypeError: fetch failed` locally, while the Supabase dashboard works in the browser | Antivirus HTTPS scanning (e.g. AVG/Avast Web Shield) or a corporate proxy re-signs TLS traffic with its own root certificate, which Node.js doesn't trust by default | Handled automatically: `instrumentation.ts` adds the OS certificate store at server start (Node 22.19+ / 24.5+). Restart the dev server after pulling. On older Node, start it with `NODE_USE_SYSTEM_CA=1` |
| `the BreakBoard tables don't exist in this Supabase project yet` (`PGRST205`) | `supabase/schema.sql` hasn't been run in this project | Run `supabase/schema.sql` (then `supabase/seed.sql`) in the Supabase SQL editor. If the editor offers **Run and enable RLS**, choose **Run without RLS**: the script enables RLS itself |
| `Supabase rejected the request` | The anon / publishable key was used | Set `SUPABASE_SERVICE_ROLE_KEY` to the secret (`sb_secret_...`) or legacy `service_role` key |
| `npm.ps1 cannot be loaded because running scripts is disabled` (Windows) | PowerShell execution policy | Use `npm.cmd run dev` instead of `npm run dev` |

## Security notes

- The Supabase service role key is only used on the server; RLS is enabled with no policies, so the public anon key can't read anything.
- `proxy.ts` guards `/dashboard`, and every Server Action and route handler re-checks the session.
- The `DEMO_ADMIN_*` credentials in `.env.local.example` are demo values. Change them for any real deployment.
- The public submit action has no rate limiting yet. Add one (e.g. a firewall rule) before sharing tester links widely.

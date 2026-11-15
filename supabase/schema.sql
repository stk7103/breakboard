-- BreakBoard schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: every statement is idempotent, and the "add column if not
-- exists" lines upgrade a database created from an earlier version.
-- All access goes through the server with the service role key, so RLS is
-- enabled with no policies: anon/authenticated clients get nothing.

create extension if not exists pgcrypto;

create table if not exists public.test_runs (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  bot_name    text not null,
  bot_target  text not null,           -- staging URL, phone number, or bot identifier
  description text,
  status      text not null default 'draft'
              check (status in ('draft', 'live', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.scenarios (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid not null references public.test_runs(id) on delete cascade,
  position           integer not null default 0,
  category           text not null,
  title              text not null,
  instructions       text not null,
  expected_guardrail text not null,
  severity           text not null default 'High'
                     check (severity in ('Blocker', 'High', 'Medium')),
  status             text not null default 'open'
                     check (status in ('open', 'submitted', 'confirmed_bug', 'dismissed')),
  tester_name        text,
  failing_input      text,             -- redacted with lib/redact.ts before insert
  actual_output      text,             -- redacted with lib/redact.ts before insert
  pm_notes           text,             -- PM triage notes, edited in the dashboard
  submitted_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Upgrades for databases created before these columns existed.
alter table public.test_runs add column if not exists status text not null default 'draft'
  check (status in ('draft', 'live', 'closed'));
alter table public.test_runs add column if not exists updated_at timestamptz not null default now();
alter table public.scenarios add column if not exists pm_notes text;

create index if not exists test_runs_created_at_idx      on public.test_runs (created_at desc);
create index if not exists scenarios_run_id_position_idx on public.scenarios (run_id, position);
create index if not exists scenarios_run_id_status_idx   on public.scenarios (run_id, status);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scenarios_set_updated_at on public.scenarios;
create trigger scenarios_set_updated_at
  before update on public.scenarios
  for each row execute function public.set_updated_at();

drop trigger if exists test_runs_set_updated_at on public.test_runs;
create trigger test_runs_set_updated_at
  before update on public.test_runs
  for each row execute function public.set_updated_at();

alter table public.test_runs enable row level security;
alter table public.scenarios enable row level security;

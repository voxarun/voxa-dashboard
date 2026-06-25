-- ============================================================================
-- call_logs — realtime VAPI call tracking
-- Run this once in Supabase → SQL Editor.
-- n8n inserts/updates rows here on every VAPI call event; the dashboard
-- subscribes via Supabase Realtime for instant updates (same pattern as orders).
-- ============================================================================

create table if not exists public.call_logs (
  id              uuid primary key default gen_random_uuid(),
  vapi_call_id    text unique not null,          -- VAPI's call id (dedupe key for upsert)
  assistant_id    text,                           -- which Voxa assistant handled it
  type            text,                           -- inboundPhoneCall | outboundPhoneCall | webCall
  status          text,                           -- queued | ringing | in-progress | forwarding | ended
  ended_reason    text,                           -- customer-ended-call | silence-timed-out | ...
  customer_number text,                           -- raw caller number (dashboard masks it)
  started_at      timestamptz,
  ended_at        timestamptz,
  duration_sec    integer,                        -- optional; dashboard can also derive from timestamps
  cost            numeric(10,4),
  summary         text,
  recording_url   text,
  created_at      timestamptz not null default now()
);

-- Fast "recent calls" ordering
create index if not exists call_logs_started_at_idx on public.call_logs (started_at desc);
create index if not exists call_logs_assistant_idx  on public.call_logs (assistant_id);

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Lets the dashboard receive INSERT/UPDATE events over the websocket.
alter publication supabase_realtime add table public.call_logs;

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Dashboard (anon key) needs SELECT; n8n writes with the service_role key,
-- which bypasses RLS. So we only expose read here.
alter table public.call_logs enable row level security;

drop policy if exists "call_logs_read" on public.call_logs;
create policy "call_logs_read" on public.call_logs
  for select using (true);

-- NOTE: when you add multi-tenancy later, add a client_id column here too and
-- tighten this policy — same as the orders table TODO.

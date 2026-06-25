# n8n setup — realtime VAPI call logging

Goal: every VAPI call event lands in the Supabase `call_logs` table the instant it
happens, so the dashboard updates in realtime (no polling).

## Prerequisites
1. Run `supabase/call_logs.sql` in Supabase → SQL Editor (creates the table + Realtime).
2. Have your Supabase **service_role** key ready (Supabase → Project Settings → API).
   n8n must use the **service_role** key (not anon) so it can insert/update.

---

## The prompt to build the n8n flow

> Build an n8n workflow that logs VAPI calls into Supabase in realtime.
>
> **1. Trigger — Webhook node**
> - Method: POST
> - Copy the production webhook URL it generates.
> - In the VAPI dashboard, open the assistant → **Advanced → Server URL**, paste this
>   webhook URL, and enable the server messages **`status-update`** and
>   **`end-of-call-report`**. (This is separate from any order webhook — if VAPI only
>   allows one Server URL, point it at this n8n webhook and branch inside n8n by
>   `message.type`, keeping the existing order logic too.)
>
> **2. Parse the payload**
> VAPI posts `{ "message": { ... } }`. The fields I need (paths may vary slightly by
> VAPI version — verify against a real payload):
> - `message.type` → either `status-update` or `end-of-call-report`
> - `message.call.id` → vapi_call_id
> - `message.call.assistantId` → assistant_id
> - `message.call.type` → type (inboundPhoneCall / webCall / outboundPhoneCall)
> - `message.call.customer.number` → customer_number
> - `message.status` (on status-update) OR `message.call.status` → status
> - `message.startedAt` or `message.call.startedAt` → started_at
> - `message.endedAt` or `message.call.endedAt` → ended_at
> - `message.endedReason` → ended_reason
> - `message.cost` or `message.call.cost` → cost
> - `message.summary` or `message.analysis.summary` → summary
> - `message.recordingUrl` or `message.artifact.recordingUrl` → recording_url
>
> **3. Upsert into Supabase — Supabase node (or HTTP Request)**
> - Operation: **Upsert** (insert or update) on table `call_logs`.
> - Conflict / match column: `vapi_call_id` (so the same call updates, not duplicates).
> - Use the **service_role** key as credentials.
> - Map the fields above. Leave `duration_sec` empty if not provided — the dashboard
>   computes it from started_at/ended_at.
>
> **Behaviour:** a `status-update` with status `in-progress` creates the row when a call
> starts (shows "on call now" live); the `end-of-call-report` updates the same row with
> ended_at, ended_reason, cost, summary, recording, and status `ended`.

---

## Quick test
After wiring it, make one test call. You should see a new row appear in the Supabase
`call_logs` table within a second or two. Tell Claude once a row shows up — then the
dashboard gets switched from 30s polling to instant Supabase Realtime.

## Optional: backfill the 15 existing calls
The table starts empty, so past calls won't be there. Claude can run a one-time
backfill that reads them from the VAPI API and inserts into `call_logs`. Just ask.

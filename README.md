# Voxa Dashboard

Multi-tenant client + internal admin dashboard for the Voxa platform.

- `dashboard.voxa.run/{slug}` — owner view for one client (KPIs, orders/bookings, chef/dispatch view, driver view)
- `dashboard.voxa.run/admin` (mapped from `admin.voxa.run`) — Voxa-internal only, invisible to any client login

## Architecture

One login system for every client, backed by Supabase Auth. `profiles.role` decides what a
logged-in user sees:

| Role | Lands on | Sees |
|---|---|---|
| `owner` | `/{slug}` | Their own client's KPIs, orders/bookings, everything |
| `chef` | `/{slug}/chef` | Active orders only — no prices, no customer contact info |
| `driver` | `/{slug}/driver` | Active deliveries — address + first name only |
| `voxa_admin` | `/admin` | Every client, platform health, no-code onboarding |

`clients` and `profiles` live in the VOXA TAKEAWAY Supabase project (the cross-vertical "home
base"). Each client's actual orders/bookings live in whichever Supabase project their
`data_project` column points to (`takeaway` or `taxi` today) — see `lib/data-projects.ts`.

## Local setup

```bash
cp .env.local.example .env.local
# fill in the two anon keys
npm install
npm run dev
```

## Known v1 limitations (see the Voxa gap-analysis doc for the full list)

- Adding a client's **business record** is no-code (Admin → Add New Client). Provisioning their
  **login** is still a manual step in Supabase Auth — deliberately not automated with a
  service-role key from this app.
- "Voice Agent Healthy" on the admin overview is derived from `call_logs` recency (a call in the
  last 30 days), not a live Vapi/Twilio/n8n status API poll.
- A brand-new vertical (salon, law firm, ...) needs its own Supabase project provisioned before
  it can go live — the onboarding form can only point a new client at the two data projects that
  already exist.

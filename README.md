# Voxa Dashboard — AI Command Centre

Multi-tenant dashboard for Voxa AI takeaway phone agent. Built with Next.js 14, Tailwind CSS, Supabase, and Recharts.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your Supabase anon key

# 3. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/dashboard`.

## Environment Variables

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Already filled in — your VOXA TAKEAWAY project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon/public key |

## Pages

| Route | View | Description |
|---|---|---|
| `/dashboard` | Owner | Command Centre — KPIs, charts, live orders, chef/driver panels |
| `/dashboard/orders` | Owner | Full order management with status filters |
| `/dashboard/chef` | Chef | Kitchen queue — active orders with prep timers |
| `/dashboard/driver` | Driver | Delivery jobs — address + first name only |

## What's Live vs Mocked

**Live from Supabase:**
- All orders data (the `orders` table)
- Real-time updates via Supabase Realtime (websocket)
- Status updates (cooking / ready / delivered) write back to DB

**Mocked (pending new tables from spec):**
- Call logs / live call feed (needs `call_logs` table)
- AI Insights are computed from order data, not an `ai_insights` table
- Agent uptime stats (needs `system_health` table)
- Prep/delivery time KPIs (needs `cooking_started_at`, `ready_at` columns)

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** (utility classes + CSS custom properties)  
- **Supabase JS** (data + real-time)
- **Recharts** (bar chart on dashboard)
- **Lucide React** (icons)
- **date-fns** (date formatting)

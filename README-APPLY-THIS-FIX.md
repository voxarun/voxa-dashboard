# Fix: Call Logs, Revenue, Analytics — real pages, not "Soon"

## What's wrong
The client dashboard sidebar (`admin.voxa.run/[slug]`) has "Analytics", "Revenue"/"Booking Mix", and "Call Logs" as nav items, but they're hardcoded `disabled: true` in `app/[slug]/layout.tsx` — rendered with a "Soon" badge. The underlying data for all three already exists live on the Command Centre overview page (KPI tiles, the 7-day chart, the Live Call Feed) — see `Voxa-Dashboard-Scoping-CallLogs-Revenue-Analytics.md` in `Voxa Post Client/01 Strategy and Roadmap/` for the full scoping writeup. This patch gives each one its own real, routed page.

## The fix
5 files, all additive except `layout.tsx` (which just points 3 existing nav items at real routes instead of `disabled: true`). Verified with `npx tsc --noEmit` — passes clean, no type errors anywhere in the repo.

- `app/[slug]/calls/page.tsx` + `components/shell/CallLogsScreen.tsx` (new) — full call history (not the 200-row cap the overview uses), Answered/Missed filter pills with real counts, phone-number search, CSV export, live via the same `call_logs` realtime subscription pattern already used elsewhere.
- `app/[slug]/revenue/page.tsx` (new) — the revenue KPI tiles that already existed on the overview, plus a genuinely new 14-day revenue trend chart and a phone-vs-online revenue split.
- `app/[slug]/analytics/page.tsx` (new) — reuses the existing `<ChartsSection>` (7-day volume chart + status donut) on its own route, plus 4 insight tiles that had no dedicated home before: conversion rate, answer rate, avg call length, hours saved.
- `app/[slug]/layout.tsx` (modified) — the 3 nav items above now have real `href`s instead of `disabled: true`.

**Not touched:** no schema changes, no new Supabase tables, no changes to `lib/dashboard-data.ts` — every page above calls functions that already existed.

## Verification done in this session
- `npx tsc --noEmit` — clean, zero errors, across the whole repo (not just the new files).
- `npx next build` — fails only on a pre-existing, unrelated issue: this sandbox can't reach `fonts.googleapis.com` for the Google Fonts (`Inter`/`JetBrains Mono`) used in `app/layout.tsx`. That's a sandbox network restriction, not something these changes caused — worth a real `next build` once this is applied somewhere with normal internet access, but it's not expected to surface anything new.
- Not tested against a live Supabase instance (no env vars / DB access from this sandbox) — the data functions themselves (`getRecentCallLogs`, `getRecentOrders`, `getClientStats`) are unchanged from what's already live and working on the Orders page and the overview, so this is low-risk, but do a real click-through on staging/preview before calling it done.

## How to ship it
No GitHub push access from this session (same constraint as the earlier pharmacy crash-fix).

1. Clone `github.com/voxarun/voxa-dashboard` (or open your existing local copy).
2. Copy the 5 files in this folder over the matching paths (same structure as here — `app/[slug]/...`, `components/shell/...`).
3. `git add -A && git commit -m "Add Call Logs, Revenue, and Analytics pages" && git push`.
4. Vercel auto-deploys on push to `main` — `admin.voxa.run` updates in ~1 min.

## After it's live
Worth a quick click-through per client slug (`/city-taxi`, `/city-bites`, `/citypharmacy`) to confirm the new pages render with real data and the sidebar badges are gone. Any follow-up polish (e.g. giving the Revenue trend the same realtime subscription the Analytics/Orders pages have) is a nice-to-have, not required for parity with what the sidebar already promises.

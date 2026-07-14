import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getDataProjectClient } from "@/lib/data-projects";
import type { Client, Profile } from "@/lib/types";

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

export async function getClientBySlug(slug: string): Promise<Client | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("clients").select("*").eq("slug", slug).single();
  return (data as Client) ?? null;
}

export async function getClientOwner(clientId: string): Promise<Profile | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("profiles").select("*").eq("client_id", clientId).eq("role", "owner").maybeSingle();
  return (data as Profile) ?? null;
}

/** Every login attached to a client (owner / chef / driver), for the admin
 *  Manage Client screen. */
export async function getClientUsers(clientId: string): Promise<Profile[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("client_id", clientId)
    .order("role", { ascending: true });
  return (data as Profile[]) ?? [];
}

export async function getAllClients(): Promise<Client[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
  return (data as Client[]) ?? [];
}

/** Recent orders (takeaway) or bookings (taxi) for one client, newest first. */
export async function getRecentOrders(client: Client, limit = 25) {
  const { client: db, ordersTable } = getDataProjectClient(client.data_project);
  if (!db) return { rows: [], error: `${client.data_project} data project is not configured` };
  const { data, error } = await db.from(ordersTable).select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) return { rows: [], error: error.message };
  return { rows: data ?? [], error: null };
}

/** Simple KPI rollup for the owner dashboard — counts + revenue estimate
 * from the same table, no extra queries needed. */
export function summarizeOrders(rows: Record<string, unknown>[], client: Client) {
  const total = rows.length;
  const isTaxi = client.data_project === "taxi";
  const revenue = isTaxi
    ? 0 // taxi bookings don't have a fixed price in the schema today
    : rows.reduce((sum, r) => sum + (parseFloat(String(r.total ?? "0")) || 0), 0);
  const newCount = rows.filter((r) => r.status === "new").length;
  const onlineCount = rows.filter((r) => r.source === "online").length;
  return { total, revenue, newCount, onlineCount };
}

/**
 * order_type / booking_type arrive dirty from the voice pipeline — the takeaway
 * table holds "collection", "collection\n\n" and "" for what should be one
 * value. Normalise before counting, otherwise "collection\n\n" is silently
 * treated as a different category (it made Collection read 7 instead of 10 and
 * showed a duplicate row in the Revenue Breakdown).
 */
export function normalizeType(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

/** YYYY-MM-DD in the client's operating timezone, for "today" figures. */
function londonDay(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

export type ClientStats = {
  totalJobs: number;
  totalCalls: number;
  newCount: number;
  onlineCount: number;
  revenue: number;
  pricedCount: number;
  avgPerJob: number;
  missedCalls: number;
  airportRuns: number;
  preBookings: number;
  accountJobs: number;
  conversionPct: number;
  /** Real time the AI spent on calls (sum of call_logs.duration_seconds), in
   *  hours — the hours the owner did NOT have to spend on the phone. This is
   *  measured, not a "a human would have taken N minutes per call" multiplier. */
  hoursSaved: number;
  todayCalls: number;
  /** Avg length of calls that actually connected (seconds). */
  avgCallSec: number;
  answerRatePct: number;
  // Takeaway-focused
  delivered: number;
  activeOrders: number;
  cooking: number;
  ready: number;
  failedOrders: number;
  deliveryOrders: number;
  collectionOrders: number;
  todayOrders: number;
  todayRevenue: number;
};

const EMPTY_STATS: ClientStats = {
  totalJobs: 0,
  totalCalls: 0,
  newCount: 0,
  onlineCount: 0,
  revenue: 0,
  pricedCount: 0,
  avgPerJob: 0,
  missedCalls: 0,
  airportRuns: 0,
  preBookings: 0,
  accountJobs: 0,
  conversionPct: 0,
  hoursSaved: 0,
  todayCalls: 0,
  avgCallSec: 0,
  answerRatePct: 0,
  delivered: 0,
  activeOrders: 0,
  cooking: 0,
  ready: 0,
  failedOrders: 0,
  deliveryOrders: 0,
  collectionOrders: 0,
  todayOrders: 0,
  todayRevenue: 0,
};

/**
 * Whole-table KPI aggregates for one client. Deliberately NOT derived from the
 * 50-row "recent" sample the tables/charts use — those under-report every total
 * (e.g. it showed 50 bookings when the client actually has 83). Every figure
 * here comes from a real column; nothing is synthesised.
 */
export async function getClientStats(client: Client): Promise<ClientStats> {
  const { client: db, ordersTable } = getDataProjectClient(client.data_project);
  if (!db) return EMPTY_STATS;

  const [jobsRes, callsRes] = await Promise.all([
    db.from(ordersTable).select("*"),
    db.from("call_logs").select("*"),
  ]);
  const rows = (jobsRes.data ?? []) as Record<string, unknown>[];
  const calls = (callsRes.data ?? []) as Record<string, unknown>[];

  const isTaxi = client.data_project === "taxi";
  const totalJobs = rows.length;
  const totalCalls = calls.length;

  // Taxi prices live in price_estimate; takeaway totals live in `total`.
  const priceField = isTaxi ? "price_estimate" : "total";
  const priced = rows.filter((r) => r[priceField] != null && !isNaN(parseFloat(String(r[priceField]))));
  const revenue = priced.reduce((s, r) => s + (parseFloat(String(r[priceField])) || 0), 0);

  // "Missed" = the AI never actually handled the call. Two ways that happens:
  // the platform reported a failure (no customer audio / transfer failed /
  // silence timeout), OR the call was over almost instantly — a 1-second call
  // where the caller hung up got no service either, even though its
  // ended_reason reads as a normal "customer-ended-call".
  // One definition, used by both the Missed Calls KPI and the Live Call Feed,
  // so the two can never disagree.
  const callDur = (r: Record<string, unknown>) => Number(r.duration_seconds) || 0;
  const isMissed = (r: Record<string, unknown>) =>
    /error|silence-timed-out|no-answer|failed/i.test(String(r.ended_reason ?? "")) || callDur(r) < 5;
  const missedCalls = calls.filter(isMissed).length;

  const connected = calls.filter((r) => callDur(r) > 0);
  const avgCallSec = connected.length
    ? Math.round(connected.reduce((s, r) => s + callDur(r), 0) / connected.length)
    : 0;
  const todayCallCount = calls.filter((r) =>
    r.created_at ? londonDay(new Date(String(r.created_at))) === londonDay(new Date()) : false
  ).length;

  const st = (r: Record<string, unknown>) => normalizeType(r.status || "new");
  const DONE = ["delivered", "completed", "collected", "done"];
  const FAILED = ["failed", "cancelled", "canceled", "error", "no_show"];

  const priceOf = (r: Record<string, unknown>) => parseFloat(String(r[priceField] ?? "")) || 0;
  const todayKey = londonDay(new Date());
  const isToday = (r: Record<string, unknown>) =>
    r.created_at ? londonDay(new Date(String(r.created_at))) === todayKey : false;
  const todayRows = rows.filter(isToday);

  return {
    totalJobs,
    totalCalls,
    newCount: rows.filter((r) => st(r) === "new").length,
    onlineCount: rows.filter((r) => r.source === "online").length,
    revenue,
    pricedCount: priced.length,
    avgPerJob: priced.length ? revenue / priced.length : 0,
    missedCalls,
    // is_airport is the dedicated flag; booking_type can also carry "airport".
    airportRuns: rows.filter((r) => r.is_airport === true || /airport/i.test(String(r.booking_type ?? ""))).length,
    preBookings: rows.filter((r) => /pre[-\s]?book|schedul|advance/i.test(String(r.booking_type ?? ""))).length,
    accountJobs: rows.filter((r) => String(r.account_name ?? "").trim() !== "").length,
    conversionPct: totalCalls ? Math.round((totalJobs / totalCalls) * 1000) / 10 : 0,
    hoursSaved: calls.reduce((s, r) => s + (Number(r.duration_seconds) || 0), 0) / 3600,
    todayCalls: todayCallCount,
    avgCallSec,
    answerRatePct: totalCalls ? Math.round(((totalCalls - missedCalls) / totalCalls) * 100) : 0,

    delivered: rows.filter((r) => DONE.includes(st(r))).length,
    failedOrders: rows.filter((r) => FAILED.includes(st(r))).length,
    activeOrders: rows.filter((r) => !DONE.includes(st(r)) && !FAILED.includes(st(r))).length,
    cooking: rows.filter((r) => st(r) === "cooking").length,
    ready: rows.filter((r) => st(r) === "ready").length,
    // Normalised, so "collection\n\n" is counted as a collection (the raw
    // comparison used elsewhere was reading 7 collections instead of 10).
    deliveryOrders: rows.filter((r) => normalizeType(r.order_type) === "delivery").length,
    collectionOrders: rows.filter((r) => normalizeType(r.order_type) === "collection").length,
    todayOrders: todayRows.length,
    todayRevenue: todayRows.reduce((s, r) => s + priceOf(r), 0),
  };
}

/** Raw recent call_logs rows for a client — used to build the real
 * calls-per-day chart on the owner dashboard. */
export async function getRecentCallLogs(client: Client, limit = 200) {
  const { client: db } = getDataProjectClient(client.data_project);
  if (!db) return { rows: [] as Record<string, unknown>[], error: `${client.data_project} data project is not configured` };
  const { data, error } = await db
    .from("call_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { rows: [] as Record<string, unknown>[], error: error.message };
  return { rows: (data ?? []) as Record<string, unknown>[], error: null };
}

/** Call volume + last-call recency from call_logs — used both on the
 * owner dashboard and as the admin health signal for this client. */
export async function getCallHealth(client: Client) {
  const { client: db } = getDataProjectClient(client.data_project);
  if (!db) return { totalCalls: 0, lastCallAt: null as string | null, avgDurationSec: 0, healthy: false };
  const { data, error } = await db
    .from("call_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return { totalCalls: 0, lastCallAt: null as string | null, avgDurationSec: 0, healthy: false };

  const totalCalls = data.length;
  const lastCallAt = data[0]?.created_at ?? data[0]?.started_at ?? null;
  const durations = data.map((c) => Number(c.duration_seconds ?? 0)).filter((n) => n > 0);
  const avgDurationSec = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // "Healthy" = at least one call logged in the last 30 days. This is a
  // real signal derived from live data, not a synthetic uptime check —
  // see the gap-analysis doc for what a deeper Vapi/Twilio/n8n status
  // integration would add on top of this.
  const healthy = lastCallAt ? Date.now() - new Date(lastCallAt as string).getTime() < 30 * 24 * 60 * 60 * 1000 : false;

  return { totalCalls, lastCallAt, avgDurationSec, healthy };
}

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

export async function getAllClients(): Promise<Client[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
  return (data as Client[]) ?? [];
}

/** Recent orders (takeaway) or bookings (taxi) for one client, newest first. */
export async function getRecentOrders(client: Client, limit = 25) {
  const { client: db, ordersTable } = getDataProjectClient(client.data_project);
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

/** Raw recent call_logs rows for a client — used to build the real
 * calls-per-day chart on the owner dashboard. */
export async function getRecentCallLogs(client: Client, limit = 200) {
  const { client: db } = getDataProjectClient(client.data_project);
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

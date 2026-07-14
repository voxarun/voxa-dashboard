import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Each vertical's operational data (orders vs bookings, call_logs) lives
 * in its OWN Supabase project — a real architectural constraint from how
 * this system grew (takeaway and taxi were provisioned as separate
 * Supabase projects before a shared dashboard existed). Rather than
 * migrating that today, this module lets the dashboard talk to whichever
 * project a given client's `data_project` field points to.
 *
 * Long-term this is worth consolidating into one project — see the
 * gap-analysis doc — but this keeps the dashboard fully multi-tenant in
 * the meantime without touching either vertical's live data pipeline.
 *
 * Credential strategy (server-side only, this file never runs in the
 * browser): if a SUPABASE_*_SERVICE_ROLE_KEY is configured for a given
 * project, use it — this is the secure path, since it lets the two
 * Supabase projects require the anon role to prove nothing, closing the
 * public-anon-key read/write exposure the anon-key path has. If the
 * service-role key isn't set yet, this falls back to the exact anon-key
 * behavior that shipped before, so nothing breaks while the key is being
 * added. See the infrastructure doc, Section 6.4 / 9.1.
 */
const PROJECTS = {
  takeaway: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ordersTable: "orders" as const,
  },
  taxi: {
    url: process.env.NEXT_PUBLIC_TAXI_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_TAXI_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_TAXI_SERVICE_ROLE_KEY,
    ordersTable: "bookings" as const,
  },
};

export function getDataProjectClient(dataProject: "takeaway" | "taxi") {
  const cfg = PROJECTS[dataProject];
  const usingServiceRole = Boolean(cfg.serviceKey);
  const key = cfg.serviceKey || cfg.anonKey;

  // If this project's env isn't configured (missing url/key), return a null
  // client instead of calling createSupabaseClient(undefined, …), which throws
  // synchronously. An uncaught throw during a Server Component render — with no
  // error boundary on the route — leaves the client-side navigation transition
  // stuck, which is exactly what made View/Manage "hang" for a data project
  // whose keys weren't set (e.g. taxi in an environment missing its vars).
  // Callers degrade to an empty/error result, so the page renders instead.
  if (!cfg.url || !key) {
    return { client: null, ordersTable: cfg.ordersTable, usingServiceRole };
  }

  const client = createSupabaseClient(
    cfg.url,
    key,
    usingServiceRole ? { auth: { autoRefreshToken: false, persistSession: false } } : undefined
  );
  return { client, ordersTable: cfg.ordersTable, usingServiceRole };
}

/**
 * Browser-safe connection info for a data project, used to open a realtime
 * subscription from a client component. Returns ONLY the public URL + anon
 * key (both already exposed via NEXT_PUBLIC_*) and the orders table name —
 * never the service-role key — so it is safe to pass into the browser.
 */
export function getDataProjectPublicConfig(dataProject: "takeaway" | "taxi") {
  const cfg = PROJECTS[dataProject];
  return { url: cfg.url, anonKey: cfg.anonKey, table: cfg.ordersTable };
}

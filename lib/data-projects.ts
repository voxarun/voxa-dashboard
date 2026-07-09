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
 */
const PROJECTS = {
  takeaway: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ordersTable: "orders" as const,
  },
  taxi: {
    url: process.env.NEXT_PUBLIC_TAXI_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_TAXI_SUPABASE_ANON_KEY!,
    ordersTable: "bookings" as const,
  },
};

export function getDataProjectClient(dataProject: "takeaway" | "taxi") {
  const cfg = PROJECTS[dataProject];
  return { client: createSupabaseClient(cfg.url, cfg.anonKey), ordersTable: cfg.ordersTable };
}

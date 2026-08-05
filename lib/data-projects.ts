import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type DataProject = "takeaway" | "taxi" | "pharmacy";

const PROJECTS: Record<DataProject, { url: string; anonKey: string; serviceKey: string | undefined; ordersTable: string }> = {
  takeaway: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ordersTable: "orders",
  },
  taxi: {
    url: process.env.NEXT_PUBLIC_TAXI_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_TAXI_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_TAXI_SERVICE_ROLE_KEY,
    ordersTable: "bookings",
  },
  pharmacy: {
    url: process.env.NEXT_PUBLIC_PHARMACY_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_PHARMACY_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_PHARMACY_SERVICE_ROLE_KEY,
    ordersTable: "pharmacy_requests",
  },
};

export function getDataProjectClient(dataProject: DataProject) {
  const cfg = PROJECTS[dataProject];

  if (!cfg) {
    return { client: null, ordersTable: "orders", usingServiceRole: false };
  }

  const usingServiceRole = Boolean(cfg.serviceKey);
  const key = cfg.serviceKey || cfg.anonKey;

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

export function getDataProjectPublicConfig(dataProject: DataProject) {
  const cfg = PROJECTS[dataProject];
  return { url: cfg.url, anonKey: cfg.anonKey, table: cfg.ordersTable };
}

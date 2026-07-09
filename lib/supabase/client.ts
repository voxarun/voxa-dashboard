import { createBrowserClient } from "@supabase/ssr";

// Auth + the cross-vertical registry (clients, profiles) all live in the
// VOXA TAKEAWAY Supabase project — it's the "home base" for the whole
// dashboard regardless of which vertical a client belongs to. Each
// vertical's operational data (orders vs bookings) is fetched separately
// server-side from whichever project that client's `data_project` points
// to (see lib/data-projects.ts).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

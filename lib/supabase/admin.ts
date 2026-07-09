import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — ONLY for admin-only server actions that
 * genuinely require it (e.g. resetting another user's password, which
 * Supabase Auth only exposes via the Admin API). This bypasses RLS
 * entirely, so:
 *   1. It is never imported by any client component ("server-only" guard
 *      above makes that a build error if attempted).
 *   2. Every call site MUST verify the caller is voxa_admin via
 *      getSessionProfile() BEFORE using this client.
 *   3. SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, so it is
 *      never bundled into browser JS.
 * This is the one deliberate, narrow exception to the "no service key"
 * rule that governs the rest of this app's data layer.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

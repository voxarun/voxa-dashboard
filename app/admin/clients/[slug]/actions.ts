"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/dashboard-data";

async function requireAdmin() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "voxa_admin") {
    throw new Error("Not authorized");
  }
  return profile;
}

export async function updateClientSettings(
  clientId: string,
  slug: string,
  settings: { plan_tier: string; online_ordering_enabled: boolean; is_open: boolean; n8n_webhook_url: string | null }
) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("clients").update(settings).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${slug}`);
  revalidatePath("/admin");
  return { ok: true, error: null };
}

export async function resetOwnerPassword(userId: string, newPassword: string) {
  await requireAdmin();
  if (newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters" };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel yet" };
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

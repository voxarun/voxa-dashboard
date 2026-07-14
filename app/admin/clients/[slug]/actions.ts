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

const MISSING_KEY =
  "SUPABASE_SERVICE_ROLE_KEY is not set. Supabase only exposes user creation / password reset through its Admin API, which requires the service-role key.";

export async function resetOwnerPassword(userId: string, newPassword: string) {
  await requireAdmin();
  if (newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters" };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: MISSING_KEY };
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

export type NewLogin = {
  email: string;
  password: string;
  fullName: string;
  role: "owner" | "chef" | "driver";
};

/**
 * Provision a login for a client — the step the README called out as still
 * manual ("Provisioning their login is still a manual step in Supabase Auth").
 *
 * Creates the Supabase Auth user AND its profiles row (which is what actually
 * decides what the user sees — middleware reads profiles.role). If the profile
 * insert fails we delete the auth user again, otherwise you'd be left with an
 * account that can sign in but has no role and gets bounced back to /login.
 */
export async function createClientLogin(clientId: string, slug: string, input: NewLogin) {
  await requireAdmin();

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address" };
  if (input.password.length < 8) return { ok: false, error: "Password must be at least 8 characters" };
  if (!["owner", "chef", "driver"].includes(input.role)) return { ok: false, error: "Invalid role" };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: MISSING_KEY };

  // One owner per client — middleware routes owners to /{slug}, so a second
  // one is ambiguous rather than useful.
  if (input.role === "owner") {
    const { data: existingOwner } = await admin
      .from("profiles")
      .select("id")
      .eq("client_id", clientId)
      .eq("role", "owner")
      .maybeSingle();
    if (existingOwner) {
      return { ok: false, error: "This client already has an owner login. Reset its password instead." };
    }
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true, // no invite email — the admin hands over the password
  });
  if (createErr || !created?.user) {
    return { ok: false, error: createErr?.message ?? "Could not create the auth user" };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    email,
    full_name: fullName || email.split("@")[0],
    client_id: clientId,
    role: input.role,
  });

  if (profileErr) {
    // Roll back, so we never leave a sign-in-able account with no profile.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Auth user created but profile failed (rolled back): ${profileErr.message}` };
  }

  revalidatePath(`/admin/clients/${slug}`);
  revalidatePath("/admin");
  return { ok: true, error: null };
}

/** Remove a client login entirely (auth user + profile). */
export async function deleteClientLogin(userId: string, slug: string) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: MISSING_KEY };

  await admin.from("profiles").delete().eq("id", userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/clients/${slug}`);
  return { ok: true, error: null };
}

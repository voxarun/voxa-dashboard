"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/dashboard-data";

export type NewClientInput = {
  name: string;
  slug: string;
  tagline: string;
  industry: string;
  dataProject: "takeaway" | "taxi";
  brandColor: string;
  planTier: "basic" | "pro" | "empire";
  ownerPhone: string;
  ownerEmail: string;
  ownerPassword: string;
};

export async function createClientRow(input: NewClientInput) {
  // Defense in depth: the insert below is already enforced by the
  // clients_admin_write RLS policy, but the owner-account creation further
  // down uses the service-role client (bypasses RLS entirely), so this
  // action needs its own explicit role check too.
  const caller = await getSessionProfile();
  if (!caller || caller.role !== "voxa_admin") {
    return { ok: false as const, error: "Not authorized" };
  }

  const supabase = await createClient();

  // RLS (clients_admin_write) only allows this insert if the caller's own
  // profile row has role = 'voxa_admin' — enforced server-side by
  // Postgres, not by anything this action claims about itself.
  const { error } = await supabase.from("clients").insert({
    name: input.name,
    slug: input.slug,
    tagline: input.tagline,
    industry: input.industry,
    data_project: input.dataProject,
    brand_color: input.brandColor,
    plan_tier: input.planTier,
    owner_phone: input.ownerPhone || null,
    online_ordering_enabled: true,
    is_open: true,
    menu_data: [],
  });

  if (error) return { ok: false as const, error: error.message };

  // Also provision the owner's login in one step, so onboarding a client
  // never requires touching Supabase or writing SQL by hand.
  if (input.ownerEmail.trim() && input.ownerPassword.trim()) {
    const admin = createAdminClient();
    if (!admin) {
      revalidatePath("/admin");
      return {
        ok: true as const,
        warning: "Client created, but SUPABASE_SERVICE_ROLE_KEY isn't configured yet so the owner login wasn't created — add it in Vercel, then create the login from this client's Manage page.",
      };
    }

    const { data: clientRow } = await supabase.from("clients").select("id").eq("slug", input.slug).single();

    const { data: created, error: userErr } = await admin.auth.admin.createUser({
      email: input.ownerEmail.trim(),
      password: input.ownerPassword,
      email_confirm: true,
    });
    if (userErr || !created?.user) {
      revalidatePath("/admin");
      return { ok: true as const, warning: `Client created, but owner login failed: ${userErr?.message ?? "unknown error"}` };
    }

    const { error: profileErr } = await admin.from("profiles").insert({
      id: created.user.id,
      email: input.ownerEmail.trim(),
      full_name: `${input.name} Owner`,
      role: "owner",
      client_id: clientRow?.id ?? null,
    });
    if (profileErr) {
      revalidatePath("/admin");
      return { ok: true as const, warning: `Client created, owner auth account made, but profile link failed: ${profileErr.message}` };
    }
  }

  revalidatePath("/admin");
  return { ok: true as const };
}

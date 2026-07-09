"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type NewClientInput = {
  name: string;
  slug: string;
  tagline: string;
  industry: string;
  dataProject: "takeaway" | "taxi";
  brandColor: string;
  planTier: "basic" | "pro" | "empire";
  ownerPhone: string;
};

export async function createClientRow(input: NewClientInput) {
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

  revalidatePath("/admin");
  return { ok: true as const };
}

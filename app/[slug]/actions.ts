"use server";

import { revalidatePath } from "next/cache";
import { getClientBySlug } from "@/lib/dashboard-data";
import { getDataProjectClient } from "@/lib/data-projects";

/**
 * Mark one order/booking as completed from the owner dashboard's Dispatch /
 * Kitchen queue. Writes to whichever data project the client points at
 * (orders vs bookings), so it works for both takeaway and taxi clients.
 */
/** Set any status on one order/booking from the expanded row in the live feed. */
export async function setOrderStatus(slug: string, id: string, status: string) {
  const client = await getClientBySlug(slug);
  if (!client) return { ok: false, error: "Client not found" };

  const { client: db, ordersTable, usingServiceRole } = getDataProjectClient(client.data_project);
  if (!db) return { ok: false, error: `${client.data_project} data project is not configured` };

  // .select() so a silent RLS rejection (no error, 0 rows changed) is reported
  // as a failure instead of a false success.
  const { data, error } = await db.from(ordersTable).update({ status }).eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: usingServiceRole
        ? "Update blocked — no matching row or RLS policy denied it"
        : `Write blocked by RLS — set the ${client.data_project} service-role key`,
    };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

export async function completeOrder(slug: string, id: string) {
  const client = await getClientBySlug(slug);
  if (!client) return { ok: false, error: "Client not found" };

  const { client: db, ordersTable, usingServiceRole } = getDataProjectClient(client.data_project);
  if (!db) return { ok: false, error: `${client.data_project} data project is not configured` };

  // .select() so we can tell whether the write actually landed. With only the
  // anon key, the project's RLS silently rejects the UPDATE (no error, but 0
  // rows changed) — treat that as a failure instead of reporting a false
  // success, and point at the real fix (a configured service-role key).
  const { data, error } = await db.from(ordersTable).update({ status: "completed" }).eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: usingServiceRole
        ? "Update blocked — no matching row or RLS policy denied it"
        : `Write blocked by RLS — set the ${client.data_project} service-role key to enable saving`,
    };
  }

  revalidatePath(`/${slug}`);
  return { ok: true };
}

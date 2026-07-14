"use server";

import { getClientBySlug } from "@/lib/dashboard-data";
import { getDataProjectClient } from "@/lib/data-projects";

export async function updateOrderStatus(slug: string, orderId: string, status: string) {
  const client = await getClientBySlug(slug);
  if (!client) return { ok: false, error: "Client not found" };

  const { client: db, ordersTable } = getDataProjectClient(client.data_project);
  if (!db) return { ok: false, error: `${client.data_project} data project is not configured` };
  const { error } = await db.from(ordersTable).update({ status }).eq("id", orderId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

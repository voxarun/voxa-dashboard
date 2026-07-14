import { notFound } from "next/navigation";
import { getClientBySlug, getRecentOrders } from "@/lib/dashboard-data";
import { getDataProjectPublicConfig } from "@/lib/data-projects";
import { OrdersScreen } from "@/components/shell/OrdersScreen";

/**
 * Full Orders / Bookings screen. Unlike the overview (which shows a 50-row
 * recent slice) this loads the whole book so the filter pills can show real
 * totals — "All (46)", "New (42)" etc.
 */
export default async function OrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const isTaxi = client.data_project === "taxi";
  const { rows, error } = await getRecentOrders(client, 1000);
  const rt = getDataProjectPublicConfig(client.data_project);

  if (error) {
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgba(255,68,68,0.3)", color: "var(--red)" }}>
        Couldn&apos;t load {isTaxi ? "bookings" : "orders"}: {error}
      </div>
    );
  }

  return (
    <OrdersScreen
      initialRows={rows}
      isTaxi={isTaxi}
      slug={slug}
      supabaseUrl={rt.url}
      supabaseAnonKey={rt.anonKey}
      table={rt.table}
    />
  );
}

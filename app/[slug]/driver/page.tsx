import { notFound } from "next/navigation";
import { getClientBySlug, getRecentOrders } from "@/lib/dashboard-data";
import { getDataProjectPublicConfig } from "@/lib/data-projects";
import { DeliveryScreen } from "@/components/shell/DeliveryScreen";

export default async function DeliveryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const isTaxi = client.data_project === "taxi";

  // Taxi: there is no drivers table and no driver_id on bookings, so nothing is
  // actually assigned to the signed-in driver — listing every active booking
  // would present the whole customer book as "your rides". Honest empty state
  // until driver assignment exists in the backend.
  if (isTaxi) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-xl font-extrabold">Active rides</h1>
        <p className="mb-6 text-sm" style={{ color: "var(--t2)" }}>
          Rides assigned to you.
        </p>
        <div className="rounded-2xl border p-10 text-center" style={{ borderColor: "var(--b1)", background: "var(--s1)" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🚕</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 6 }}>No rides assigned to you</div>
          <div style={{ fontSize: 12, color: "var(--t3)", maxWidth: 380, margin: "0 auto", lineHeight: 1.5 }}>
            Driver assignment isn&apos;t set up yet, so no bookings are linked to a driver. Once dispatch starts
            assigning rides, yours will appear here.
          </div>
        </div>
      </div>
    );
  }

  // Whole book, so the counters are real totals rather than a 30-row slice.
  const { rows, error } = await getRecentOrders(client, 1000);
  const rt = getDataProjectPublicConfig(client.data_project);

  if (error) {
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgba(255,68,68,0.3)", color: "var(--red)" }}>
        Couldn&apos;t load orders: {error}
      </div>
    );
  }

  return (
    <DeliveryScreen
      initialRows={rows}
      slug={slug}
      supabaseUrl={rt.url}
      supabaseAnonKey={rt.anonKey}
      table={rt.table}
    />
  );
}

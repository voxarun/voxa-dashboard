import { getClientBySlug, getRecentOrders, summarizeOrders, getCallHealth } from "@/lib/dashboard-data";
import { KpiCard } from "@/components/KpiCard";
import { OrdersTable } from "@/components/OrdersTable";
import { notFound } from "next/navigation";

export default async function ClientOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const [{ rows, error }, callHealth] = await Promise.all([getRecentOrders(client, 25), getCallHealth(client)]);
  const isTaxi = client.data_project === "taxi";
  const kpi = summarizeOrders(rows, client);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">{client.name}</h1>
          <p className="text-sm" style={{ color: "var(--t2)" }}>{client.tagline}</p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: client.is_open ? "rgba(0,230,118,0.12)" : "rgba(255,68,68,0.12)",
            color: client.is_open ? "var(--green)" : "var(--red)",
          }}
        >
          {client.is_open ? "Open" : "Closed"}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label={isTaxi ? "Bookings (recent)" : "Orders (recent)"} value={String(kpi.total)} />
        {!isTaxi && <KpiCard label="Revenue (recent)" value={`£${kpi.revenue.toFixed(2)}`} accent="var(--green)" />}
        <KpiCard label="New / Unactioned" value={String(kpi.newCount)} accent="var(--amber)" />
        <KpiCard label="From order.voxa.run" value={String(kpi.onlineCount)} accent="var(--cyan)" />
        <KpiCard
          label="Voice Agent"
          value={callHealth.healthy ? "Active" : "No recent calls"}
          sub={callHealth.totalCalls ? `${callHealth.totalCalls} calls logged` : undefined}
          accent={callHealth.healthy ? "var(--green)" : "var(--t3)"}
        />
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
        Recent {isTaxi ? "bookings" : "orders"}
      </h2>
      {error ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgba(255,68,68,0.3)", color: "var(--red)" }}>
          Couldn&apos;t load {isTaxi ? "bookings" : "orders"}: {error}
        </div>
      ) : (
        <OrdersTable rows={rows} isTaxi={isTaxi} />
      )}
    </div>
  );
}

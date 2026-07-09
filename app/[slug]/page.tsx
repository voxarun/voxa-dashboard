import { getClientBySlug, getRecentOrders, summarizeOrders, getCallHealth } from "@/lib/dashboard-data";
import { Hero } from "@/components/shell/Hero";
import { KpiGrid, type KpiTile } from "@/components/shell/KpiGrid";
import { DataTable } from "@/components/shell/DataTable";
import { BottomGrid } from "@/components/shell/BottomGrid";
import { FleetSection } from "@/components/shell/FleetSection";
import { notFound } from "next/navigation";

export default async function ClientOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const [{ rows, error }, callHealth] = await Promise.all([getRecentOrders(client, 50), getCallHealth(client)]);
  const isTaxi = client.data_project === "taxi";
  const kpi = summarizeOrders(rows, client);

  const tickerItems = rows.slice(0, 10).map((r) => {
    const name = String(r.customer_name ?? "").trim() || "Customer";
    const route = isTaxi
      ? [r.pickup_address, r.destination_address].filter(Boolean).join(" → ") || "Address not provided"
      : String(r.order_type ?? "order");
    return `• ${name} — ${route}`;
  });

  const tiles: KpiTile[] = [
    { icon: "📋", tone: "ka", label: isTaxi ? "Bookings (recent)" : "Orders (recent)", value: String(kpi.total) },
    ...(!isTaxi ? [{ icon: "💰", tone: "kg" as const, label: "Revenue (recent)", value: `£${kpi.revenue.toFixed(2)}` }] : []),
    { icon: "⚡", tone: "kb", label: "New / Unactioned", value: String(kpi.newCount) },
    { icon: "🌐", tone: "kp", label: "From order.voxa.run", value: String(kpi.onlineCount) },
    {
      icon: "🎙️",
      tone: callHealth.healthy ? "kg" : "kr",
      label: "Voice Agent",
      value: callHealth.healthy ? "Active" : "Idle",
      sub: callHealth.totalCalls ? `${callHealth.totalCalls} calls logged` : "No recent calls",
    },
  ];

  const heroImage = isTaxi
    ? "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600&q=80"
    : "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80";

  return (
    <div>
      <Hero
        eyebrow={`${client.name} · Command Centre`}
        headline={isTaxi ? "Bradford's smartest" : `${client.name.split(" ")[0]}'s smartest`}
        headlineEm={isTaxi ? "dispatcher." : "kitchen."}
        statusLabel="Voxa AI"
        statusValue={client.is_open ? "Live · Open" : "Live · Closed"}
        tickerItems={tickerItems}
        backgroundImage={heroImage}
      />

      <KpiGrid tiles={tiles} />

      {isTaxi && <FleetSection cityLabel={client.name} />}

      <div style={{ marginBottom: 20 }}>
        {error ? (
          <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgba(255,68,68,0.3)", color: "var(--red)" }}>
            Couldn&apos;t load {isTaxi ? "bookings" : "orders"}: {error}
          </div>
        ) : (
          <DataTable rows={rows} isTaxi={isTaxi} />
        )}
      </div>

      <div id="dispatch">
        <BottomGrid rows={rows} isTaxi={isTaxi} kpi={kpi} callHealth={callHealth} />
      </div>
    </div>
  );
}

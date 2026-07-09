import { getClientBySlug, getRecentOrders, getRecentCallLogs, summarizeOrders, getCallHealth } from "@/lib/dashboard-data";
import { Hero } from "@/components/shell/Hero";
import { NeonRainScene } from "@/components/shell/NeonRainScene";
import { DispatchRadarScene } from "@/components/shell/DispatchRadarScene";
import { KpiGrid, type KpiTile } from "@/components/shell/KpiGrid";
import { VoxaBrain } from "@/components/shell/VoxaBrain";
import { ChartsSection } from "@/components/shell/ChartsSection";
import { DataTable } from "@/components/shell/DataTable";
import { BottomGrid } from "@/components/shell/BottomGrid";
import { FleetSection } from "@/components/shell/FleetSection";
import { notFound } from "next/navigation";

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.round(diffH / 24)}d ago`;
}

export default async function ClientOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const [{ rows, error }, { rows: callRows }, callHealth] = await Promise.all([
    getRecentOrders(client, 50),
    getRecentCallLogs(client, 100),
    getCallHealth(client),
  ]);
  const isTaxi = client.data_project === "taxi";
  const kpi = summarizeOrders(rows, client);

  const tickerItems = rows.slice(0, 10).map((r) => {
    const name = String(r.customer_name ?? "").trim() || "Customer";
    const route = isTaxi
      ? [r.pickup_address, r.destination_address].filter(Boolean).join(" → ") || "Address not provided"
      : String(r.order_type ?? "order");
    return `• ${name} — ${route}`;
  });

  // Real per-client activity feed for the Voxa Brain running panel —
  // same source of truth as the orders table, just newest-first + capped.
  const activity = [...rows]
    .filter((r) => r.created_at)
    .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())
    .slice(0, 6)
    .map((r) => ({
      client: client.name,
      what: `${isTaxi ? "Booking" : "Order"} ${r.status === "new" ? "received" : String(r.status ?? "updated")}`,
      how: String(r.customer_name ?? "").trim() || "customer",
      when: timeAgo(r.created_at as string | null),
      color: r.status === "new" ? "var(--amber)" : "var(--green)",
    }));

  const brainTicker = rows.slice(0, 10).map((r) => ({
    text: `${String(r.customer_name ?? "Customer").trim()} — ${
      isTaxi ? String(r.booking_type ?? "booking") : String(r.order_type ?? "order")
    }`,
    color: r.status === "new" ? "var(--amber)" : "var(--green)",
  }));

  const tiles: KpiTile[] = [
    { icon: "📋", tone: "ka", label: isTaxi ? "Bookings (recent)" : "Orders (recent)", value: String(kpi.total) },
    ...(!isTaxi ? [{ icon: "💰", tone: "kg" as const, label: "Revenue (recent)", value: `£${kpi.revenue.toFixed(2)}` }] : []),
    { icon: "⚡", tone: "kb", label: "New / Unactioned", value: String(kpi.newCount) },
    { icon: "🌐", tone: "kp", label: "From order.voxa.run", value: String(kpi.onlineCount) },
    {
      icon: "📞",
      tone: "kb",
      label: "Calls Logged",
      value: String(callHealth.totalCalls),
      sub: callHealth.avgDurationSec ? `Avg ${callHealth.avgDurationSec}s` : undefined,
    },
    {
      icon: "🎙️",
      tone: callHealth.healthy ? "kg" : "kr",
      label: "Voice Agent",
      value: callHealth.healthy ? "Active" : "Idle",
      sub: callHealth.totalCalls ? `${callHealth.totalCalls} calls logged` : "No recent calls",
    },
  ];

  return (
    <div>
      <Hero
        eyebrow={`${client.name} · Command Centre`}
        headline={isTaxi ? "Bradford's smartest" : `${client.name.split(" ")[0]}'s smartest`}
        headlineEm={isTaxi ? "dispatcher." : "kitchen."}
        statusLabel="Voxa AI"
        statusValue={client.is_open ? "Live · Open" : "Live · Closed"}
        tickerItems={tickerItems}
        scene={isTaxi ? <DispatchRadarScene /> : <NeonRainScene />}
        stats={[
          { value: String(kpi.total), label: isTaxi ? "Bookings" : "Orders", tone: "b" },
          ...(!isTaxi
            ? [{ value: `£${kpi.revenue.toFixed(0)}`, label: "Revenue", tone: "g" as const }]
            : [{ value: String(kpi.newCount), label: "New / Unactioned", tone: "g" as const }]),
          {
            value: callHealth.healthy ? "Active" : "Idle",
            label: "Voice Agent",
            tone: callHealth.healthy ? ("p" as const) : undefined,
          },
        ]}
      />

      <VoxaBrain
        activity={activity}
        tickerItems={brainTicker}
        brainLabel="Voxa AI"
        activityHeading="What Voxa just did for you"
      />

      <KpiGrid tiles={tiles} />

      {isTaxi && <FleetSection cityLabel={client.name} />}

      <ChartsSection rows={rows} callRows={callRows} isTaxi={isTaxi} />

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

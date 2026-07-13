import { getClientBySlug, getRecentOrders, getRecentCallLogs, summarizeOrders, getCallHealth } from "@/lib/dashboard-data";
import { Hero } from "@/components/shell/Hero";
import { NeonRainScene } from "@/components/shell/NeonRainSceneClient";
import { DispatchRadarScene } from "@/components/shell/DispatchRadarSceneClient";
import { KpiGrid, type KpiTile } from "@/components/shell/KpiGrid";
import { VoxaBrain } from "@/components/shell/VoxaBrain";
import { ChartsSection } from "@/components/shell/ChartsSection";
import { AgentsGrid } from "@/components/shell/AgentsGrid";
import { PlansSection } from "@/components/shell/PlansSection";
import { RealtimeDataTable } from "@/components/shell/RealtimeDataTable";
import { BottomGrid } from "@/components/shell/BottomGrid";
import { FleetSection } from "@/components/shell/FleetSection";
import { getDataProjectPublicConfig } from "@/lib/data-projects";
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
  const rt = getDataProjectPublicConfig(client.data_project);

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
        scene={isTaxi ? <DispatchRadarScene /> : <NeonRainScene />}
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
          <RealtimeDataTable
            initialRows={rows}
            isTaxi={isTaxi}
            supabaseUrl={rt.url}
            supabaseAnonKey={rt.anonKey}
            table={rt.table}
          />
        )}
      </div>

      <div id="dispatch">
        <BottomGrid rows={rows} isTaxi={isTaxi} kpi={kpi} callHealth={callHealth} />
      </div>

      <div className="feed-grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="ch">
            <div>
              <div className="ct">📞 Live Call Feed</div>
              <div className="cs">Most recent activity</div>
            </div>
            <div className="live-chip">
              <div className="pulse-dot" style={{ width: 5, height: 5 }} />
              Live
            </div>
          </div>
          {activity.length === 0 && <div style={{ fontSize: 12, color: "var(--t3)" }}>No activity yet.</div>}
          {activity.slice(0, 5).map((a, i) => (
            <div key={i} className="fi">
              <div className="fi-dot" style={{ background: a.color }} />
              <div>
                <div className="fi-evt">
                  <strong>{a.what}</strong> — {a.how}
                </div>
                <div className="fi-time">{a.when}</div>
              </div>
            </div>
          ))}
        </div>

        <AgentsGrid rows={rows} callHealthy={callHealth.healthy} isTaxi={isTaxi} />
      </div>

      <PlansSection currentTier={client.plan_tier} />
    </div>
  );
}

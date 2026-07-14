import {
  getClientBySlug,
  getRecentOrders,
  getRecentCallLogs,
  summarizeOrders,
  getCallHealth,
  getClientStats,
} from "@/lib/dashboard-data";
import { Hero } from "@/components/shell/Hero";
import { NeonRainScene } from "@/components/shell/NeonRainSceneClient";
import { DispatchRadarScene } from "@/components/shell/DispatchRadarSceneClient";
import { KpiGrid, type KpiTile } from "@/components/shell/KpiGrid";
import { ChartsSection } from "@/components/shell/ChartsSection";
// import { PlansSection } from "@/components/shell/PlansSection"; // hidden on request
import { RealtimeDataTable } from "@/components/shell/RealtimeDataTable";
import { BottomGrid } from "@/components/shell/BottomGrid";
import { FleetSection } from "@/components/shell/FleetSection";
import { RealtimeRefresh } from "@/components/shell/RealtimeRefresh";
import { CallFeed } from "@/components/shell/CallFeed";
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

  const [{ rows, error }, { rows: callRows }, callHealth, stats] = await Promise.all([
    getRecentOrders(client, 50),
    getRecentCallLogs(client, 100),
    getCallHealth(client),
    getClientStats(client),
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

  // Every tile below is computed from a real column via getClientStats() — whole
  // table, not the 50-row recent sample (which under-reported every total).
  const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}% ` : "");

  const tiles: KpiTile[] = [
    {
      icon: "📞",
      tone: "kb",
      label: "Calls Received",
      value: String(stats.totalCalls),
      sub: callHealth.avgDurationSec ? `Avg ${callHealth.avgDurationSec}s · answered by AI` : "Answered by AI",
    },
    {
      icon: "📋",
      tone: "ka",
      label: isTaxi ? "Bookings Taken" : "Total Orders",
      value: String(stats.totalJobs),
      sub: `${stats.todayOrders} today · ${stats.conversionPct}% from calls`,
    },
    {
      icon: "💰",
      tone: "kg",
      label: "Revenue Generated",
      value: `£${stats.revenue.toFixed(2)}`,
      // Most bookings have an empty price_estimate, so say what the figure
      // actually covers rather than implying it's the full book of business.
      sub: stats.pricedCount
        ? `Avg £${stats.avgPerJob.toFixed(2)} · ${stats.pricedCount} of ${stats.totalJobs} priced`
        : "No prices recorded yet",
    },
    {
      icon: "❌",
      tone: "kr",
      label: "Missed Calls",
      value: String(stats.missedCalls),
      sub: stats.totalCalls ? `${pct(stats.missedCalls, stats.totalCalls)}of calls` : undefined,
    },
    ...(isTaxi
      ? [
          {
            icon: "✈️",
            tone: "kp" as const,
            label: "Airport Runs",
            value: String(stats.airportRuns),
            sub: stats.totalJobs ? `${pct(stats.airportRuns, stats.totalJobs)}of all bookings` : undefined,
          },
          {
            icon: "📅",
            tone: "ka" as const,
            label: "Pre-Bookings",
            value: String(stats.preBookings),
            sub: stats.totalJobs ? `${pct(stats.preBookings, stats.totalJobs)}of all bookings` : undefined,
          },
          {
            icon: "🏥",
            tone: "kb" as const,
            label: "Account Jobs",
            value: String(stats.accountJobs),
            sub: "NHS · Hotels · Corporate",
          },
        ]
      : [
          {
            icon: "✅",
            tone: "kg" as const,
            label: "Delivered",
            value: String(stats.delivered),
            sub: stats.totalJobs ? `${pct(stats.delivered, stats.totalJobs)}success rate` : undefined,
          },
          {
            icon: "🔥",
            tone: "ka" as const,
            label: "Active Orders",
            value: String(stats.activeOrders),
            sub: `${stats.cooking} cooking · ${stats.ready} ready`,
          },
          {
            icon: "🚚",
            tone: "kp" as const,
            label: "Delivery Orders",
            value: String(stats.deliveryOrders),
            sub: stats.totalJobs ? `${pct(stats.deliveryOrders, stats.totalJobs)}of total` : undefined,
          },
          {
            icon: "🏪",
            tone: "kb" as const,
            label: "Collection Orders",
            value: String(stats.collectionOrders),
            sub: stats.totalJobs ? `${pct(stats.collectionOrders, stats.totalJobs)}of total` : undefined,
          },
          {
            icon: "⛔",
            tone: "kr" as const,
            label: "Failed Orders",
            value: String(stats.failedOrders),
            sub: stats.totalJobs ? `${pct(stats.failedOrders, stats.totalJobs)}fail rate` : undefined,
          },
          {
            icon: "📅",
            tone: "kg" as const,
            label: "Today's Revenue",
            value: `£${stats.todayRevenue.toFixed(2)}`,
            sub: `${stats.todayOrders} order${stats.todayOrders === 1 ? "" : "s"} today`,
          },
        ]),
    { icon: "⚡", tone: "kb", label: "New / Unactioned", value: String(stats.newCount) },
    { icon: "🌐", tone: "kp", label: "From order.voxa.run", value: String(stats.onlineCount) },
    // Hidden on request — the Voice Agent status is already conveyed by the
    // hero status pill and the Calls Received tile.
    // {
    //   icon: "🎙️",
    //   tone: callHealth.healthy ? "kg" : "kr",
    //   label: "Voice Agent",
    //   value: callHealth.healthy ? "Active" : "Idle",
    //   sub: stats.totalCalls ? `${stats.totalCalls} calls logged` : "No recent calls",
    // },
  ];

  return (
    <div>
      {/* Re-runs this server component on any orders/call_logs change, so the
          whole-table KPI tiles stay live like the tables and charts do. */}
      <RealtimeRefresh supabaseUrl={rt.url} supabaseAnonKey={rt.anonKey} table={rt.table} />

      <Hero
        eyebrow={`${client.name} · Command Centre`}
        headline={isTaxi ? "Bradford's smartest" : `${client.name.split(" ")[0]}'s smartest`}
        headlineEm={isTaxi ? "dispatcher." : "kitchen."}
        statusLabel="Voxa AI"
        statusValue={client.is_open ? "Live · Open" : "Live · Closed"}
        tickerItems={tickerItems}
        stats={[
          // Whole-table figures, so the hero can't disagree with the KPI tiles.
          { value: String(stats.totalJobs), label: isTaxi ? "Bookings" : "Orders", tone: "b" },
          { value: `£${stats.revenue.toFixed(0)}`, label: "Revenue", tone: "g" as const },
          // Measured AI talk time (sum of call_logs.duration_seconds) — the hours
          // the owner didn't spend on the phone. Not an invented multiplier.
          { value: `${stats.hoursSaved.toFixed(1)}h`, label: "Hours Saved", tone: "p" as const },
        ]}
        scene={isTaxi ? <DispatchRadarScene /> : <NeonRainScene />}
      />

      <KpiGrid tiles={tiles} />

      {isTaxi && <FleetSection cityLabel={client.name} />}

      <ChartsSection
        initialRows={rows}
        initialCallRows={callRows}
        isTaxi={isTaxi}
        nowMs={Date.now()}
        supabaseUrl={rt.url}
        supabaseAnonKey={rt.anonKey}
        ordersTable={rt.table}
      />

      <div style={{ marginBottom: 20 }}>
        {error ? (
          <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgba(255,68,68,0.3)", color: "var(--red)" }}>
            Couldn&apos;t load {isTaxi ? "bookings" : "orders"}: {error}
          </div>
        ) : (
          <RealtimeDataTable
            initialRows={rows}
            isTaxi={isTaxi}
            slug={slug}
            supabaseUrl={rt.url}
            supabaseAnonKey={rt.anonKey}
            table={rt.table}
          />
        )}
      </div>

      <div id="dispatch">
        <BottomGrid rows={rows} isTaxi={isTaxi} stats={stats} slug={slug} />
      </div>

      {/* The card that used to sit here was labelled "Live Call Feed" but listed
          ORDER activity — no call data reached the dashboard at all. This one is
          built from call_logs. It stays live via <RealtimeRefresh> above. */}
      <div style={{ marginBottom: 20 }}>
        <CallFeed
          calls={callRows}
          totalCalls={stats.totalCalls}
          todayCalls={stats.todayCalls}
          missedCalls={stats.missedCalls}
          avgCallSec={stats.avgCallSec}
          answerRatePct={stats.answerRatePct}
        />
      </div>

      {/* Hidden on request — pricing/plan tiers not shown on the client dashboard. */}
      {/* <PlansSection currentTier={client.plan_tier} /> */}
    </div>
  );
}

import { getAllClients, getRecentOrders, getCallHealth, getClientStats, summarizeOrders } from "@/lib/dashboard-data";
import { getAllServiceHealth } from "@/lib/monitoring";
import { getDataProjectPublicConfig } from "@/lib/data-projects";
import { AdminRealtimeWrapper } from "@/components/shell/AdminRealtimeWrapper";

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - d) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.round(diffH / 24)}d ago`;
}

export default async function AdminOverviewPage() {
  const clients = await getAllClients();

  const [rows, serviceHealth] = await Promise.all([
    Promise.all(
      clients.map(async (c) => {
        // getCallHealth() caps its query at 50 rows, so every client reported
        // "50 calls logged" no matter how many they actually had (real figures:
        // 240 and 97). getClientStats() aggregates the whole table.
        const [{ rows: orders }, health, stats] = await Promise.all([
          getRecentOrders(c, 100),
          getCallHealth(c),
          getClientStats(c),
        ]);
        const kpi = summarizeOrders(orders, c);
        return { client: c, kpi, health, stats, orders };
      })
    ),
    getAllServiceHealth(),
  ]);

  const totalClients = clients.length;
  const healthyCount = rows.filter((r) => r.health.healthy).length;
  const totalCalls = rows.reduce((sum, r) => sum + r.stats.totalCalls, 0);
  const liveOrdering = clients.filter((c) => c.online_ordering_enabled).length;
  const openNow = clients.filter((c) => c.is_open).length;

  // Real cross-client activity feed — newest rows across every client's
  // orders/bookings table, merged and sorted. No synthetic events.
  const activity = rows
    .flatMap((r) =>
      r.orders.map((o) => ({
        client: r.client.name,
        isTaxi: r.client.data_project === "taxi",
        created_at: o.created_at as string | null,
        customer_name: o.customer_name as string | null,
        status: o.status as string | null,
      }))
    )
    .filter((a) => a.created_at)
    .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
    .slice(0, 8)
    .map((a) => ({
      client: a.client,
      what: `${a.isTaxi ? "Booking" : "Order"} ${a.status === "new" ? "received" : a.status ?? "updated"}`,
      how: a.customer_name?.trim() || "customer",
      when: timeAgo(a.created_at),
      color: a.status === "new" ? "var(--amber)" : "var(--green)",
    }));

  const tickerItems = rows
    .flatMap((r) =>
      r.stats.totalCalls > 0 ? [{ text: `${r.client.name} — ${r.stats.totalCalls} calls logged`, color: "var(--cyan)" }] : []
    )
    .slice(0, 10);

  const healthRows = [serviceHealth.vapi, serviceHealth.twilio, serviceHealth.n8n];

  // --- Data prepared for the realtime client wrapper -----------------------
  // Orders count per data project. getRecentOrders isn't client-filtered, so
  // every client in a project shares the same recent-orders count; capture it
  // per project so a new INSERT can bump the right clients' cells live.
  const ordersByProject: Record<"takeaway" | "taxi", number> = { takeaway: 0, taxi: 0 };
  for (const r of rows) ordersByProject[r.client.data_project] = r.kpi.total;

  // How many clients belong to each project — the admin "Calls Logged" total is
  // a sum of each client's recent call count, so one new call in a project adds
  // (number of clients in that project) to the total on a refresh.
  const clientsByProject: Record<"takeaway" | "taxi", number> = { takeaway: 0, taxi: 0 };
  for (const c of clients) clientsByProject[c.data_project] += 1;

  // A representative client name per project to label a new order in the feed
  // (orders aren't tied to a single client, mirroring the server labelling).
  const representativeClientByProject: Record<"takeaway" | "taxi", string> = { takeaway: "", taxi: "" };
  for (const c of clients) {
    if (!representativeClientByProject[c.data_project]) representativeClientByProject[c.data_project] = c.name;
  }

  const clientRows = rows.map(({ client, health }) => ({
    id: client.id,
    name: client.name,
    industry: client.industry,
    plan_tier: client.plan_tier,
    online_ordering_enabled: client.online_ordering_enabled,
    slug: client.slug,
    dataProject: client.data_project,
    healthy: health.healthy,
  }));

  const rtTakeaway = getDataProjectPublicConfig("takeaway");
  const rtTaxi = getDataProjectPublicConfig("taxi");

  return (
    <AdminRealtimeWrapper
      totalClients={totalClients}
      healthyCount={healthyCount}
      initialTotalCalls={totalCalls}
      liveOrdering={liveOrdering}
      openNow={openNow}
      initialOrdersByProject={ordersByProject}
      clientsByProject={clientsByProject}
      representativeClientByProject={representativeClientByProject}
      initialActivity={activity}
      tickerItems={tickerItems}
      clientRows={clientRows}
      healthRows={healthRows}
      realtime={{
        takeaway: { url: rtTakeaway.url, anonKey: rtTakeaway.anonKey, ordersTable: rtTakeaway.table },
        taxi: { url: rtTaxi.url, anonKey: rtTaxi.anonKey, ordersTable: rtTaxi.table },
      }}
    />
  );
}

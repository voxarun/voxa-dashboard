import Link from "next/link";
import { getAllClients, getRecentOrders, getCallHealth, summarizeOrders } from "@/lib/dashboard-data";
import { KpiCard } from "@/components/KpiCard";

export default async function AdminOverviewPage() {
  const clients = await getAllClients();

  const rows = await Promise.all(
    clients.map(async (c) => {
      const [{ rows: orders }, health] = await Promise.all([getRecentOrders(c, 100), getCallHealth(c)]);
      const kpi = summarizeOrders(orders, c);
      return { client: c, kpi, health };
    })
  );

  const totalClients = clients.length;
  const healthyCount = rows.filter((r) => r.health.healthy).length;
  const totalCallsToday = rows.reduce((sum, r) => sum + r.health.totalCalls, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-xl font-extrabold">All Clients</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--t2)" }}>
        Platform-wide view. Nothing on this page is visible to any client.
      </p>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <KpiCard label="Onboarded Clients" value={String(totalClients)} />
        <KpiCard label="Voice Agent Healthy" value={`${healthyCount} / ${totalClients}`} accent={healthyCount === totalClients ? "var(--green)" : "var(--amber)"} />
        <KpiCard label="Calls Logged (recent)" value={String(totalCallsToday)} accent="var(--cyan)" />
      </div>

      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--b1)" }}>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr style={{ background: "var(--s2)" }}>
              <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>Client</th>
              <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>Industry</th>
              <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>Plan</th>
              <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>Status</th>
              <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>Voice Agent</th>
              <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>Orders (recent)</th>
              <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ client, kpi, health }) => (
              <tr key={client.id} className="border-t" style={{ borderColor: "var(--b1)" }}>
                <td className="px-4 py-2.5 font-semibold">{client.name}</td>
                <td className="px-4 py-2.5 capitalize" style={{ color: "var(--t2)" }}>{client.industry}</td>
                <td className="px-4 py-2.5 uppercase" style={{ color: "var(--cyan)" }}>{client.plan_tier}</td>
                <td className="px-4 py-2.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: client.online_ordering_enabled ? "rgba(0,230,118,0.12)" : "rgba(255,68,68,0.12)",
                      color: client.online_ordering_enabled ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {client.online_ordering_enabled ? "Live" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: health.healthy ? "rgba(0,230,118,0.12)" : "rgba(255,171,0,0.12)",
                      color: health.healthy ? "var(--green)" : "var(--amber)",
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: health.healthy ? "var(--green)" : "var(--amber)" }} />
                    {health.healthy ? "Active" : "No recent calls"}
                  </span>
                </td>
                <td className="px-4 py-2.5">{kpi.total}</td>
                <td className="px-4 py-2.5">
                  <Link href={`/${client.slug}`} className="text-xs underline" style={{ color: "var(--blue2)" }}>
                    View dashboard
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

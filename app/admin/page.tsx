import Link from "next/link";
import { getAllClients, getRecentOrders, getCallHealth, summarizeOrders } from "@/lib/dashboard-data";
import { Hero } from "@/components/shell/Hero";
import { KpiGrid, type KpiTile } from "@/components/shell/KpiGrid";

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
  const totalCalls = rows.reduce((sum, r) => sum + r.health.totalCalls, 0);
  const liveOrdering = clients.filter((c) => c.online_ordering_enabled).length;

  const tickerItems = rows
    .flatMap((r) => (r.health.totalCalls > 0 ? [`• ${r.client.name} — ${r.health.totalCalls} calls logged`] : []))
    .slice(0, 10);

  const tiles: KpiTile[] = [
    { icon: "🏢", tone: "kb", label: "Onboarded Clients", value: String(totalClients) },
    {
      icon: "🎙️",
      tone: healthyCount === totalClients && totalClients > 0 ? "kg" : "ka",
      label: "Voice Agent Healthy",
      value: `${healthyCount} / ${totalClients}`,
    },
    { icon: "📞", tone: "kp", label: "Calls Logged (recent)", value: String(totalCalls) },
    { icon: "🌐", tone: "kg", label: "Online Ordering Live", value: `${liveOrdering} / ${totalClients}` },
  ];

  return (
    <div>
      <Hero
        eyebrow="Voxa Platform · Admin"
        headline="Every client."
        headlineEm="One view."
        statusLabel="Voxa AI"
        statusValue="Monitoring live"
        tickerItems={tickerItems}
      />

      <KpiGrid tiles={tiles} />

      <div style={{ marginBottom: 20 }} id="health">
        <div className="ot-hdr">
          <div>
            <div className="ot-title">All Clients</div>
            <div className="ot-sub">Platform-wide · nothing here is visible to any client</div>
          </div>
        </div>
        <div className="ot">
          <div className="thead" style={{ gridTemplateColumns: "1.2fr 100px 100px 100px 140px 100px 110px" }}>
            <div className="th">Client</div>
            <div className="th">Industry</div>
            <div className="th">Plan</div>
            <div className="th">Status</div>
            <div className="th">Voice Agent</div>
            <div className="th">Orders</div>
            <div className="th"></div>
          </div>
          {rows.map(({ client, kpi, health }) => (
            <div key={client.id} className="tr" style={{ gridTemplateColumns: "1.2fr 100px 100px 100px 140px 100px 110px" }}>
              <div className="td br">{client.name}</div>
              <div className="td" style={{ textTransform: "capitalize" }}>{client.industry}</div>
              <div className="td mn" style={{ textTransform: "uppercase" }}>{client.plan_tier}</div>
              <div className="td">
                <span className={`chip ${client.online_ordering_enabled ? "cd" : "ca"}`}>
                  {client.online_ordering_enabled ? "Live" : "Disabled"}
                </span>
              </div>
              <div className="td">
                <span className={`chip ${health.healthy ? "cd" : "ca"}`}>
                  {health.healthy ? "Active" : "No recent calls"}
                </span>
              </div>
              <div className="td">{kpi.total}</div>
              <div className="td">
                <Link href={`/${client.slug}`} className="btn" style={{ textDecoration: "none" }}>
                  View →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bot" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
        <div className="card">
          <div className="ch">
            <div>
              <div className="ct">Client Status Breakdown</div>
              <div className="cs">Live snapshot</div>
            </div>
          </div>
          <div className="rev-stat">
            <span className="rev-label">Open now</span>
            <span className="rev-val a">{clients.filter((c) => c.is_open).length} / {totalClients}</span>
          </div>
          <div className="rev-stat">
            <span className="rev-label">Online ordering enabled</span>
            <span className="rev-val a">{liveOrdering} / {totalClients}</span>
          </div>
          <div className="rev-stat">
            <span className="rev-label">Voice agent healthy</span>
            <span className="rev-val a">{healthyCount} / {totalClients}</span>
          </div>
        </div>

        <div className="card">
          <div className="ch">
            <div>
              <div className="ct">AI Insights</div>
              <div className="cs">Generated from live data</div>
            </div>
          </div>
          {healthyCount < totalClients && totalClients > 0 && (
            <div className="ins">
              <div className="ins-ic">⚠️</div>
              <div className="ins-tx">
                <strong>{totalClients - healthyCount}</strong> client(s) have no calls logged in the last 30 days — worth a check-in.
              </div>
            </div>
          )}
          {totalCalls > 0 && (
            <div className="ins">
              <div className="ins-ic">📞</div>
              <div className="ins-tx">
                <strong>{totalCalls}</strong> total calls logged across the platform, recent window.
              </div>
            </div>
          )}
          {totalClients === 0 && (
            <div className="ins">
              <div className="ins-ic">🧠</div>
              <div className="ins-tx">No clients onboarded yet.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

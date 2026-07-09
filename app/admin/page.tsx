import Link from "next/link";
import { getAllClients, getRecentOrders, getCallHealth, summarizeOrders } from "@/lib/dashboard-data";
import { getAllServiceHealth } from "@/lib/monitoring";
import { Hero } from "@/components/shell/Hero";
import { KpiGrid, type KpiTile } from "@/components/shell/KpiGrid";
import { VoxaBrain } from "@/components/shell/VoxaBrain";
import { AdminHeroScene } from "@/components/shell/AdminHeroScene";

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
        const [{ rows: orders }, health] = await Promise.all([getRecentOrders(c, 100), getCallHealth(c)]);
        const kpi = summarizeOrders(orders, c);
        return { client: c, kpi, health, orders };
      })
    ),
    getAllServiceHealth(),
  ]);

  const totalClients = clients.length;
  const healthyCount = rows.filter((r) => r.health.healthy).length;
  const totalCalls = rows.reduce((sum, r) => sum + r.health.totalCalls, 0);
  const liveOrdering = clients.filter((c) => c.online_ordering_enabled).length;

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
    .flatMap((r) => (r.health.totalCalls > 0 ? [{ text: `${r.client.name} — ${r.health.totalCalls} calls logged`, color: "var(--cyan)" }] : []))
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

  const healthRows = [serviceHealth.vapi, serviceHealth.twilio, serviceHealth.n8n];

  return (
    <div>
      <Hero
        eyebrow="Voxa Platform · Admin"
        headline="Every client."
        headlineEm="One view."
        statusLabel="Voxa AI"
        statusValue="Monitoring live"
        tickerItems={tickerItems.map((t) => t.text)}
        stats={[
          { value: String(totalClients), label: "Clients", tone: "b" },
          { value: `${healthyCount}/${totalClients}`, label: "Voice Agents", tone: "g" },
          { value: String(totalCalls), label: "Calls Logged", tone: "p" },
        ]}
        scene={
          <AdminHeroScene
            healthyCount={healthyCount}
            totalClients={totalClients}
            totalCalls={totalCalls}
          />
        }
      />

      <KpiGrid tiles={tiles} />

      <VoxaBrain activity={activity} tickerItems={tickerItems} brainLabel="VOXA AI BRAIN" />

      <div style={{ marginBottom: 20 }} id="health">
        <div className="ot-hdr">
          <div>
            <div className="ot-title">System Health</div>
            <div className="ot-sub">Live status of the services powering every client</div>
          </div>
        </div>
        <div className="fleet-grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
          {healthRows.map((h) => (
            <div key={h.service} className="card">
              <div className="ch">
                <div>
                  <div className="ct" style={{ textTransform: "capitalize" }}>{h.service}</div>
                  <div className="cs">{h.detail}</div>
                </div>
                <span className={`badge ${!h.configured ? "r" : h.healthy ? "g" : "a"}`}>
                  {!h.configured ? "Not connected" : h.headline}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className="pulse-dot"
                  style={{ background: !h.configured ? "var(--red)" : h.healthy ? "var(--green)" : "var(--amber)" }}
                />
                <span style={{ fontSize: 11, color: "var(--t2)" }}>
                  {!h.configured ? "Add credentials in Vercel to activate" : h.healthy ? "Operating normally" : "Needs attention"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
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
              <div className="td" style={{ display: "flex", gap: 6 }}>
                <Link href={`/${client.slug}`} className="btn" style={{ textDecoration: "none" }}>
                  View →
                </Link>
                <Link href={`/admin/clients/${client.slug}`} className="btn p" style={{ textDecoration: "none" }}>
                  Manage
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

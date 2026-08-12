import Link from "next/link";
import { getAllClients, getCallHealth } from "@/lib/dashboard-data";
import { getAllServiceHealth } from "@/lib/monitoring";

// Absolute timestamp, formatted server-side — deliberately not the relative
// agoLabel() helper, which needs a client-mounted `nowMs` (useEffect) to avoid
// a server/client clock hydration mismatch. This page is a server component,
// so it follows the same pattern already used in ManageClientPage's activity log.
function formatLondon(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" });
}

export default async function MonitoringPage() {
  const [serviceHealth, clients] = await Promise.all([getAllServiceHealth(), getAllClients()]);

  const healthRows = [serviceHealth.vapi, serviceHealth.twilio, serviceHealth.n8n];

  const clientHealth = await Promise.all(
    clients.map(async (c) => {
      const health = await getCallHealth(c);
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        industry: c.data_project,
        totalCalls: health.totalCalls,
        lastCallAt: health.lastCallAt,
        healthy: health.healthy,
      };
    })
  );

  const healthyClients = clientHealth.filter((c) => c.healthy).length;
  const platformHealthy = healthRows.filter((h) => h.configured && h.healthy).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link href="/admin" style={{ fontSize: 11, color: "var(--t3)", textDecoration: "none" }}>
          ← All Clients
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Monitoring</h1>
        <p style={{ fontSize: 12, color: "var(--t2)" }}>
          Live status of the services powering every client, plus a per-client call-activity check.
          Refreshes on load — no polling yet, see the Voxa gap-analysis doc for the synthetic-test
          and heartbeat scoping.
        </p>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="card kpi">
          <div className="cs">Platform services</div>
          <div className="ct" style={{ fontSize: 22 }}>
            {platformHealthy}/{healthRows.length}
          </div>
          <div className="cs">healthy</div>
        </div>
        <div className="card kpi">
          <div className="cs">Clients with recent calls</div>
          <div className="ct" style={{ fontSize: 22 }}>
            {healthyClients}/{clientHealth.length}
          </div>
          <div className="cs">last 50 call logs</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="ot-hdr">
          <div>
            <div className="ot-title">System Health</div>
            <div className="ot-sub">Vapi / Twilio / n8n — checked directly, server-side, on every page load</div>
          </div>
        </div>
        <div className="fleet-grid ap-health-grid">
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

      <div>
        <div className="ot-hdr">
          <div>
            <div className="ot-title">Per-Client Voice Agent Activity</div>
            <div className="ot-sub">
              &quot;Healthy&quot; = a call logged in the last 30 days, not a live Vapi/Twilio/n8n poll —
              see known limitations in the repo README
            </div>
          </div>
        </div>
        <div className="ot ap-monitoring-clients">
          <div className="thead">
            <div className="th">Client</div>
            <div className="th">Industry</div>
            <div className="th">Last Call</div>
            <div className="th">Calls (recent)</div>
            <div className="th">Status</div>
          </div>
          {clientHealth.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: "var(--t3)" }}>No clients yet.</div>
          )}
          {clientHealth.map((c) => (
            <div key={c.id} className="tr">
              <div className="td br">{c.name}</div>
              <div className="td" style={{ textTransform: "capitalize" }}>{c.industry}</div>
              <div className="td">{formatLondon(c.lastCallAt)}</div>
              <div className="td">{c.totalCalls}</div>
              <div className="td">
                <span className={`chip ${c.healthy ? "cd" : "ca"}`}>
                  {c.healthy ? "Active" : "No recent calls"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .ap-monitoring-clients .thead,
        .ap-monitoring-clients .tr { grid-template-columns: 1.4fr 120px 140px 140px 160px; }
        @media (max-width: 900px) {
          .ap-monitoring-clients .thead,
          .ap-monitoring-clients .tr { min-width: 760px; }
        }
      `}</style>
    </div>
  );
}

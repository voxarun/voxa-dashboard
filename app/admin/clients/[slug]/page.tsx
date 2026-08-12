import { notFound } from "next/navigation";
import Link from "next/link";
import { getClientBySlug, getClientUsers, getRecentOrders, getCallHealth } from "@/lib/dashboard-data";
import { ManageClientForm } from "./ManageClientForm";

export default async function ManageClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const [users, { rows }, callHealth] = await Promise.all([
    getClientUsers(client.id),
    getRecentOrders(client, 30),
    getCallHealth(client),
  ]);

  const isTaxi = client.data_project === "taxi";
  const failedOrErrored = rows.filter((r) => ["failed", "error", "cancelled"].includes(String(r.status ?? "")));
  const n8nConfigured = Boolean(client.n8n_webhook_url && client.n8n_webhook_url.trim());

  const clientSince = client.created_at
    ? new Date(client.created_at).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" style={{ fontSize: 11, color: "var(--t3)", textDecoration: "none" }}>
            ← All Clients
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{client.name}</h1>
          <p style={{ fontSize: 12, color: "var(--t2)" }}>{client.tagline}</p>
        </div>
        {client.slug?.trim() ? (
          <a className="btn" href={`/${client.slug}`} style={{ textDecoration: "none" }}>
            View live dashboard →
          </a>
        ) : null}
      </div>

      {/* Record header — the "at a glance" facts an internal record page needs:
          plan, industry, open/closed, and how long they've been a client. */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="card kpi">
          <div className="cs">Plan</div>
          <div className="ct" style={{ fontSize: 16, textTransform: "uppercase" }}>{client.plan_tier}</div>
        </div>
        <div className="card kpi">
          <div className="cs">Industry</div>
          <div className="ct" style={{ fontSize: 16, textTransform: "capitalize" }}>{client.industry || client.data_project}</div>
        </div>
        <div className="card kpi">
          <div className="cs">Status</div>
          <div className="ct" style={{ fontSize: 16 }}>
            <span className={`chip ${client.is_open ? "cd" : "ca"}`}>{client.is_open ? "Open" : "Closed"}</span>
          </div>
        </div>
        <div className="card kpi">
          <div className="cs">Client since</div>
          <div className="ct" style={{ fontSize: 16 }}>{clientSince}</div>
        </div>
      </div>

      {!n8nConfigured && (
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "rgba(0,148,255,0.3)", background: "rgba(0,148,255,0.06)", color: "var(--blue)", marginBottom: 20 }}
        >
          <strong>No dedicated n8n webhook set for this client</strong> — clients.n8n_webhook_url is empty, so
          orders/bookings route through the platform-wide N8N_WEBHOOK_URL_DEFAULT instead (confirmed set in
          voxa-online-ordering-system&apos;s Vercel env vars, so this is very likely fine as-is). Only set a
          value below if this client needs its own dedicated n8n workflow separate from the shared default.
        </div>
      )}

      <ManageClientForm
        client={{
          id: client.id,
          slug: client.slug,
          name: client.name,
          plan_tier: client.plan_tier,
          online_ordering_enabled: client.online_ordering_enabled,
          is_open: client.is_open,
          n8n_webhook_url: client.n8n_webhook_url,
        }}
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
        }))}
      />

      <div style={{ marginTop: 20 }} className="card">
        <div className="ch">
          <div>
            <div className="ct">Recent Activity Log</div>
            <div className="cs">
              {isTaxi ? "Bookings" : "Orders"} · {callHealth.totalCalls} calls logged · {failedOrErrored.length} flagged
            </div>
          </div>
        </div>
        {rows.length === 0 && <div style={{ fontSize: 12, color: "var(--t3)" }}>No activity yet.</div>}
        {rows.slice(0, 15).map((r) => (
          <div key={String(r.id)} className="fi">
            <div
              className="fi-dot"
              style={{
                background: ["failed", "error", "cancelled"].includes(String(r.status))
                  ? "var(--red)"
                  : r.status === "new"
                    ? "var(--amber)"
                    : "var(--green)",
              }}
            />
            <div style={{ flex: 1 }}>
              <div className="fi-evt">
                <strong>{String(r.customer_name ?? "No name")}</strong> · {String(r.status ?? "new")}
              </div>
              <div className="fi-time">
                {r.created_at ? new Date(String(r.created_at)).toLocaleString("en-GB", { timeZone: "Europe/London" }) : "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

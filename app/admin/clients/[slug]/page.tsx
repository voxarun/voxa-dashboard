import { notFound } from "next/navigation";
import Link from "next/link";
import { getClientBySlug, getClientOwner, getRecentOrders, getCallHealth } from "@/lib/dashboard-data";
import { ManageClientForm } from "./ManageClientForm";

export default async function ManageClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const [owner, { rows }, callHealth] = await Promise.all([
    getClientOwner(client.id),
    getRecentOrders(client, 30),
    getCallHealth(client),
  ]);

  const isTaxi = client.data_project === "taxi";
  const failedOrErrored = rows.filter((r) => ["failed", "error", "cancelled"].includes(String(r.status ?? "")));
  const n8nConfigured = Boolean(client.n8n_webhook_url && client.n8n_webhook_url.trim());

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
      </div>

      {!n8nConfigured && (
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.06)", color: "var(--red)", marginBottom: 20 }}
        >
          <strong>n8n not connected for this client.</strong> clients.n8n_webhook_url is empty, so orders/bookings
          save to Supabase fine but SMS, the kitchen alert{isTaxi ? "" : ", and PrintNode receipts"} silently
          don&apos;t fire. Set the webhook URL for this client to turn automation on — the owner sees a matching
          notice on their dashboard.
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
        ownerId={owner?.id ?? null}
        ownerEmail={owner?.email ?? null}
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
                {r.created_at ? new Date(String(r.created_at)).toLocaleString("en-GB") : "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

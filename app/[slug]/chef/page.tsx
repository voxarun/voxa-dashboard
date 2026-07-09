import { notFound } from "next/navigation";
import { getClientBySlug, getRecentOrders } from "@/lib/dashboard-data";
import { StatusButtons } from "./StatusButtons";

export default async function ChefPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const isTaxi = client.data_project === "taxi";
  const { rows } = await getRecentOrders(client, 30);
  const active = rows.filter((r) => !["ready", "delivered", "collected", "completed"].includes(String(r.status)));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-extrabold">{isTaxi ? "Dispatch queue" : "Kitchen queue"}</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--t2)" }}>
        {isTaxi ? "Bookings awaiting driver assignment." : "Only what the kitchen needs — no prices, no customer contact details."}
      </p>

      <div className="space-y-3">
        {active.length === 0 && (
          <div className="rounded-2xl border p-8 text-center text-sm" style={{ borderColor: "var(--b1)", color: "var(--t2)" }}>
            Nothing active right now.
          </div>
        )}
        {active.map((r) => (
          <div key={String(r.id)} className="rounded-2xl border p-4" style={{ borderColor: "var(--b1)", background: "var(--s1)" }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: "var(--t3)" }}>
                {isTaxi ? String(r.pickup_address ?? "—") : String(r.order_type ?? "—").toUpperCase()}
              </span>
              <span className="text-xs" style={{ color: "var(--t3)" }}>
                {r.created_at ? new Date(String(r.created_at)).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : ""}
              </span>
            </div>
            <div className="mb-3 text-sm">
              {isTaxi ? (
                <>
                  {String(r.passengers ?? 1)} passenger(s) → {String(r.destination_address || "no destination given")}
                </>
              ) : Array.isArray(r.items) ? (
                (r.items as { name: string; quantity: number }[]).map((it, i) => (
                  <div key={i}>
                    {it.quantity}× {it.name}
                  </div>
                ))
              ) : (
                "—"
              )}
              {r.special_instructions ? (
                <div className="mt-1 text-xs" style={{ color: "var(--amber)" }}>
                  Note: {String(r.special_instructions)}
                </div>
              ) : null}
            </div>
            {!isTaxi && <StatusButtons slug={slug} orderId={String(r.id)} currentStatus={String(r.status ?? "new")} />}
          </div>
        ))}
      </div>
    </div>
  );
}

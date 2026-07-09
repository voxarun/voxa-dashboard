import { notFound } from "next/navigation";
import { getClientBySlug, getRecentOrders } from "@/lib/dashboard-data";
import { StatusButtons } from "./StatusButtons";

export default async function DriverPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const isTaxi = client.data_project === "taxi";
  const { rows } = await getRecentOrders(client, 30);
  const relevant = isTaxi
    ? rows.filter((r) => !["delivered", "completed", "cancelled"].includes(String(r.status)))
    : rows.filter((r) => r.order_type === "delivery" && !["delivered", "completed"].includes(String(r.status)));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-extrabold">{isTaxi ? "Active rides" : "Delivery jobs"}</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--t2)" }}>
        Address and first name only — no phone number, no order total.
      </p>

      <div className="space-y-3">
        {relevant.length === 0 && (
          <div className="rounded-2xl border p-8 text-center text-sm" style={{ borderColor: "var(--b1)", color: "var(--t2)" }}>
            No active jobs right now.
          </div>
        )}
        {relevant.map((r) => {
          const firstName = String(r.customer_name ?? "").split(" ")[0] || "Customer";
          const address = isTaxi ? String(r.pickup_address ?? "—") : String(r.delivery_address ?? "—");
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
          return (
            <div key={String(r.id)} className="rounded-2xl border p-4" style={{ borderColor: "var(--b1)", background: "var(--s1)" }}>
              <div className="mb-1 text-sm font-semibold">{firstName}</div>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="mb-3 block text-sm underline" style={{ color: "var(--blue2)" }}>
                {address}
              </a>
              <StatusButtons slug={slug} orderId={String(r.id)} currentStatus={String(r.status ?? "new")} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

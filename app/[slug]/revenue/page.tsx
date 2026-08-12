import { notFound } from "next/navigation";
import { getClientBySlug, getRecentOrders, getClientStats } from "@/lib/dashboard-data";
import { KpiGrid, type KpiTile } from "@/components/shell/KpiGrid";

function londonDay(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/London" }); // YYYY-MM-DD
}

/**
 * Revenue screen. The totals here (revenue, today's revenue, avg per job,
 * priced coverage) already existed as KPI tiles on the overview — this page's
 * genuinely new piece is the 14-day revenue trend, which didn't exist
 * anywhere before. Server-rendered (no realtime yet) — a thin page over
 * existing data, not a new pricing model.
 */
export default async function RevenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const isTaxi = client.data_project === "taxi";
  const priceField = isTaxi ? "price_estimate" : "total";

  const [{ rows, error }, stats] = await Promise.all([getRecentOrders(client, 5000), getClientStats(client)]);

  if (error) {
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgba(255,68,68,0.3)", color: "var(--red)" }}>
        Couldn&apos;t load revenue data: {error}
      </div>
    );
  }

  const priceOf = (r: Record<string, unknown>) => parseFloat(String(r[priceField] ?? "")) || 0;

  const now = new Date();
  const days: { label: string; key: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }), key: londonDay(d) });
  }
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const ca = r.created_at as string | undefined;
    if (!ca) continue;
    const k = londonDay(new Date(ca));
    byDay.set(k, (byDay.get(k) ?? 0) + priceOf(r));
  }
  const maxVal = Math.max(1, ...days.map((d) => byDay.get(d.key) ?? 0));

  const onlineRevenue = rows.filter((r) => r.source === "online").reduce((s, r) => s + priceOf(r), 0);
  const phoneRevenue = stats.revenue - onlineRevenue;

  const tiles: KpiTile[] = [
    { icon: "💰", tone: "kg", label: "Total Revenue", value: `£${stats.revenue.toFixed(2)}`, sub: `${stats.pricedCount} of ${stats.totalJobs} priced` },
    { icon: "📅", tone: "kb", label: "Today's Revenue", value: `£${stats.todayRevenue.toFixed(2)}`, sub: `${stats.todayOrders} ${isTaxi ? "bookings" : "orders"} today` },
    { icon: "📊", tone: "ka", label: `Avg per ${isTaxi ? "Booking" : "Order"}`, value: stats.pricedCount ? `£${stats.avgPerJob.toFixed(2)}` : "—", sub: stats.pricedCount ? undefined : "No prices recorded yet" },
    { icon: "📞", tone: "kp", label: "From Phone (Voxa AI)", value: `£${phoneRevenue.toFixed(2)}` },
    { icon: "🌐", tone: "kb", label: "From order.voxa.run", value: `£${onlineRevenue.toFixed(2)}` },
  ];

  return (
    <div>
      <KpiGrid tiles={tiles} />

      <div className="card" style={{ marginTop: 20 }}>
        <div className="ch">
          <div>
            <div className="ct">Revenue — Last 14 Days</div>
            <div className="cs">Daily total, from priced {isTaxi ? "bookings" : "orders"}</div>
          </div>
        </div>
        <div className="chart-plot">
          <div className="y-axis">
            <div>£{Math.ceil(maxVal)}</div>
            <div>£{Math.round(maxVal / 2)}</div>
            <div>£0</div>
          </div>
          <div className="plot">
            <div className="gridlines">
              <div className="gridline" />
              <div className="gridline" />
              <div className="gridline" />
            </div>
            <div className="bars">
              {days.map((d) => {
                const v = byDay.get(d.key) ?? 0;
                const h = v ? Math.max(3, Math.round((v / maxVal) * 100)) : 0;
                return (
                  <div className="bg" key={d.key}>
                    <div className="bp">
                      <div className="b o" style={{ width: 16, height: h }} title={`£${v.toFixed(2)}`} />
                    </div>
                    <div className="bl">{d.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

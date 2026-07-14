"use client";

import { KitchenQueue } from "./KitchenQueue";

type Row = Record<string, unknown>;

/** Figures the insights are built from — all whole-table, all from real columns. */
type Stats = {
  totalJobs: number;
  revenue: number;
  avgPerJob: number;
  pricedCount: number;
  delivered: number;
  failedOrders: number;
  activeOrders: number;
  cooking: number;
  ready: number;
  deliveryOrders: number;
  collectionOrders: number;
  totalCalls: number;
  missedCalls: number;
  preBookings: number;
  airportRuns: number;
};

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

export function BottomGrid({
  rows,
  isTaxi,
  stats,
  slug,
}: {
  rows: Row[];
  isTaxi: boolean;
  stats: Stats;
  slug: string;
}) {
  const newCount = rows.filter((r) => norm(r.status || "new") === "new").length;

  // ── Revenue / mix breakdown ──
  // order_type/booking_type come out of the voice pipeline dirty ("collection\n\n",
  // ""), so normalise the grouping key — the raw value listed "collection" twice
  // and added a blank-labelled row.
  const breakdown = new Map<string, number>();
  for (const r of rows) {
    const key = (isTaxi ? norm(r.booking_type) : norm(r.order_type)) || "unspecified";
    const amt = isTaxi ? 1 : parseFloat(String(r.total ?? "0")) || 0;
    breakdown.set(key, (breakdown.get(key) ?? 0) + amt);
  }
  const breakdownEntries = [...breakdown.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ── Voxa AI Insights — every number below is a real, whole-table figure ──
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
  const jobWord = isTaxi ? "bookings" : "orders";
  const insights: { icon: string; text: React.ReactNode }[] = [];

  insights.push({
    icon: "📈",
    text: (
      <>
        <strong>
          {stats.totalJobs} {jobWord} captured
        </strong>{" "}
        — Total revenue of £{stats.revenue.toFixed(0)}
        {stats.pricedCount ? (
          <>
            {" "}
            with avg value £{stats.avgPerJob.toFixed(2)}{" "}
            <span style={{ color: "var(--t3)" }}>
              ({stats.pricedCount} of {stats.totalJobs} priced)
            </span>
          </>
        ) : null}
        .
      </>
    ),
  });

  insights.push({
    icon: stats.failedOrders > 0 ? "⚠️" : "✅",
    text: (
      <>
        <strong>{pct(stats.delivered, stats.totalJobs)}% completion rate</strong> —{" "}
        {stats.failedOrders === 0
          ? `No failed ${jobWord} this period.`
          : `${stats.failedOrders} failed ${jobWord} — check for patterns.`}{" "}
        {stats.activeOrders > 0 ? `${stats.activeOrders} still open.` : ""}
      </>
    ),
  });

  insights.push(
    isTaxi
      ? {
          icon: "🚗",
          text: (
            <>
              <strong>
                {stats.preBookings} pre-booked · {stats.airportRuns} airport
              </strong>{" "}
              — {pct(stats.preBookings, stats.totalJobs)}% of bookings are scheduled in advance.
            </>
          ),
        }
      : {
          icon: "🚗",
          text: (
            <>
              <strong>
                {pct(stats.deliveryOrders, stats.totalJobs)}% delivery vs{" "}
                {pct(stats.collectionOrders, stats.totalJobs)}% collection
              </strong>{" "}
              — {stats.deliveryOrders} delivery, {stats.collectionOrders} collection.
            </>
          ),
        }
  );

  insights.push({
    icon: "⏳",
    text: isTaxi ? (
      <>
        <strong>{stats.activeOrders} bookings in progress</strong> — {newCount} still unassigned.
      </>
    ) : (
      <>
        <strong>{stats.cooking + stats.ready} orders in progress</strong> — {stats.cooking} cooking, {stats.ready} ready
        for pickup/dispatch.
      </>
    ),
  });

  if (stats.missedCalls > 0) {
    insights.push({
      icon: "📞",
      text: (
        <>
          <strong>{stats.missedCalls} calls didn&apos;t connect</strong> — {pct(stats.missedCalls, stats.totalCalls)}% of{" "}
          {stats.totalCalls} calls. Worth reviewing peak-hour coverage.
        </>
      ),
    });
  }

  return (
    <div className="bot">
      {/* ── Kitchen / Dispatch queue (shared with the Chef screen) ── */}
      <KitchenQueue rows={rows} isTaxi={isTaxi} slug={slug} />

      {/* ── Revenue / booking mix ── */}
      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">{isTaxi ? "Booking Mix" : "Revenue Breakdown"}</div>
            <div className="cs">
              From last {rows.length} {jobWord}
            </div>
          </div>
        </div>
        {breakdownEntries.length === 0 && <div style={{ fontSize: 12, color: "var(--t3)" }}>No data yet.</div>}
        {breakdownEntries.map(([label, val]) => (
          <div key={label} className="rev-stat">
            <span className="rev-label" style={{ textTransform: "capitalize" }}>
              {label}
            </span>
            <span className="rev-val a">{isTaxi ? val : `£${val.toFixed(2)}`}</span>
          </div>
        ))}
      </div>

      {/* ── Voxa AI Insights ── */}
      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">🧠 Voxa AI Insights</div>
            <div className="cs">Live intelligence from your data</div>
          </div>
          <span className="badge b">{insights.length} new</span>
        </div>
        {insights.map((ins, i) => (
          <div key={i} className="ins">
            <div className="ins-ic">{ins.icon}</div>
            <div className="ins-tx">{ins.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

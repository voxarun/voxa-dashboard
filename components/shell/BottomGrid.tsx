"use client";

import { useState } from "react";

type Row = Record<string, unknown>;

function fmtTime(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
}

export function BottomGrid({
  rows,
  isTaxi,
  kpi,
  callHealth,
}: {
  rows: Row[];
  isTaxi: boolean;
  kpi: { total: number; revenue: number; newCount: number; onlineCount: number };
  callHealth: { totalCalls: number; healthy: boolean; avgDurationSec: number };
}) {
  const queue = rows.filter((r) => String(r.status ?? "new") === "new").slice(0, 5);
  const [done, setDone] = useState<Record<string, boolean>>({});

  // Breakdown — counted from real rows, not synthetic.
  const breakdown = new Map<string, number>();
  for (const r of rows) {
    const key = isTaxi ? String(r.booking_type ?? "immediate") : String(r.order_type ?? "delivery");
    const amt = isTaxi ? 1 : parseFloat(String(r.total ?? "0")) || 0;
    breakdown.set(key, (breakdown.get(key) ?? 0) + (isTaxi ? amt : amt));
  }
  const breakdownEntries = [...breakdown.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const insights: { icon: string; text: React.ReactNode }[] = [];
  if (kpi.onlineCount > 0) {
    insights.push({
      icon: "🌐",
      text: (
        <>
          <strong>{kpi.onlineCount}</strong> of the last {kpi.total} {isTaxi ? "bookings" : "orders"} came straight from
          order.voxa.run — no call handling needed.
        </>
      ),
    });
  }
  if (callHealth.totalCalls > 0) {
    insights.push({
      icon: "📞",
      text: (
        <>
          Voice agent has logged <strong>{callHealth.totalCalls}</strong> calls
          {callHealth.avgDurationSec ? <> averaging <strong>{callHealth.avgDurationSec}s</strong></> : null}.
        </>
      ),
    });
  }
  if (kpi.newCount > 0) {
    insights.push({
      icon: "⚡",
      text: (
        <>
          <strong>{kpi.newCount}</strong> {isTaxi ? "booking(s)" : "order(s)"} are new and unactioned right now.
        </>
      ),
    });
  }
  if (insights.length === 0) {
    insights.push({ icon: "🧠", text: <>No activity yet — insights populate once real {isTaxi ? "bookings" : "orders"} start coming in.</> });
  }

  return (
    <div className="bot">
      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">{isTaxi ? "Dispatch Queue" : "Kitchen Queue"}</div>
            <div className="cs">Newest unactioned first</div>
          </div>
          <span className="badge a">{queue.length} waiting</span>
        </div>
        <div className="dq-list">
          {queue.length === 0 && <div style={{ fontSize: 12, color: "var(--t3)" }}>Nothing waiting — you&apos;re all caught up.</div>}
          {queue.map((r) => {
            const id = String(r.id);
            const route = isTaxi
              ? [r.pickup_address, r.destination_address].filter(Boolean).join(" → ") || "Address not provided"
              : String(r.delivery_address ?? r.order_type ?? "—");
            return (
              <div key={id} className="dq-item">
                <div className="dq-top">
                  <span className="dq-id">#{id.slice(-4).toUpperCase()}</span>
                  <span className="dq-time">{fmtTime(r.created_at)}</span>
                </div>
                <div className="dq-route">{route}</div>
                <div className="dq-meta">{String(r.customer_name ?? "No name")}</div>
                <div className="dq-btns">
                  <button
                    className="dq-btn assign"
                    disabled={!!done[id]}
                    onClick={() => setDone((d) => ({ ...d, [id]: true }))}
                  >
                    {done[id] ? "Assigned" : "Assign"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">{isTaxi ? "Booking Mix" : "Revenue Breakdown"}</div>
            <div className="cs">From last {rows.length} {isTaxi ? "bookings" : "orders"}</div>
          </div>
        </div>
        {breakdownEntries.length === 0 && <div style={{ fontSize: 12, color: "var(--t3)" }}>No data yet.</div>}
        {breakdownEntries.map(([label, val]) => (
          <div key={label} className="rev-stat">
            <span className="rev-label" style={{ textTransform: "capitalize" }}>{label}</span>
            <span className="rev-val a">{isTaxi ? val : `£${val.toFixed(2)}`}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">AI Insights</div>
            <div className="cs">Generated from live data</div>
          </div>
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

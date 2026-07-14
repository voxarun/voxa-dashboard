"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** order_type/status arrive with stray whitespace+newlines from the voice
 *  pipeline ("collection\n\n"), so normalise before comparing. */
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

function statusBucket(status: string): "done" | "progress" | "failed" {
  const s = norm(status);
  if (["delivered", "completed", "collected", "done", "picked_up", "dropped_off"].includes(s)) return "done";
  if (["cancelled", "canceled", "failed", "no_show", "error"].includes(s)) return "failed";
  return "progress"; // new, cooking, ready, en_route, confirmed, etc.
}

/**
 * Live-updating charts. Mirrors <RealtimeDataTable>: it renders from the
 * server-provided initial rows/call logs, then subscribes to the client's data
 * project (orders/bookings + call_logs) so the 7-day bars, the status donut and
 * the split bars all move as new records arrive — no refresh needed. If realtime
 * isn't delivered (RLS/publication), it simply keeps the server-rendered values.
 *
 * `nowMs` is passed from the server so the 7-day window is identical during SSR
 * and hydration (using `new Date()` here would risk a hydration mismatch).
 */
export function ChartsSection({
  initialRows,
  initialCallRows,
  isTaxi,
  nowMs,
  supabaseUrl,
  supabaseAnonKey,
  ordersTable,
}: {
  initialRows: Row[];
  initialCallRows: Row[];
  isTaxi: boolean;
  nowMs: number;
  supabaseUrl: string;
  supabaseAnonKey: string;
  ordersTable: string;
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [callRows, setCallRows] = useState<Row[]>(initialCallRows);

  // Reset to fresh server data on a full navigation / revalidation.
  useEffect(() => setRows(initialRows), [initialRows]);
  useEffect(() => setCallRows(initialCallRows), [initialCallRows]);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || !ordersTable) return;
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const channel = sb
      .channel(`charts:${ordersTable}`)
      .on("postgres_changes", { event: "*", schema: "public", table: ordersTable }, (payload) => {
        setRows((prev) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as Row;
            if (prev.some((x) => String(x.id) === String(r.id))) return prev;
            return [r, ...prev].slice(0, 200);
          }
          if (payload.eventType === "UPDATE") {
            const r = payload.new as Row;
            return prev.map((x) => (String(x.id) === String(r.id) ? { ...x, ...r } : x));
          }
          if (payload.eventType === "DELETE") {
            const o = payload.old as Row;
            return prev.filter((x) => String(x.id) !== String(o.id));
          }
          return prev;
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_logs" }, (payload) => {
        setCallRows((prev) => {
          const r = payload.new as Row;
          if (prev.some((x) => String(x.id) === String(r.id))) return prev;
          return [r, ...prev].slice(0, 200);
        });
      })
      .subscribe();

    return () => {
      sb.removeChannel(channel);
      sb.realtime.disconnect();
    };
  }, [supabaseUrl, supabaseAnonKey, ordersTable]);

  // ── 7-day bar chart: orders/bookings vs calls, real counts ──
  const days: { label: string; key: string }[] = [];
  const now = new Date(nowMs);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/London" }), key: dayKey(d) });
  }
  const orderCounts = new Map<string, number>();
  for (const r of rows) {
    const ca = r.created_at as string | undefined;
    if (!ca) continue;
    const k = dayKey(new Date(ca));
    orderCounts.set(k, (orderCounts.get(k) ?? 0) + 1);
  }
  const callCounts = new Map<string, number>();
  for (const r of callRows) {
    const ca = r.created_at as string | undefined;
    if (!ca) continue;
    const k = dayKey(new Date(ca));
    callCounts.set(k, (callCounts.get(k) ?? 0) + 1);
  }
  const maxVal = Math.max(1, ...days.map((d) => Math.max(orderCounts.get(d.key) ?? 0, callCounts.get(d.key) ?? 0)));
  // Round the top of the scale up to a clean number so the axis reads 0 / 8 / 16
  // rather than 0 / 7.5 / 15. Bars are drawn against this, not the raw max.
  const axisMax = Math.max(4, Math.ceil(maxVal / 4) * 4);
  const yTicks = [axisMax, Math.round(axisMax / 2), 0];
  const totalRecentOrders = days.reduce((s, d) => s + (orderCounts.get(d.key) ?? 0), 0);
  const totalPrevWeekOrders = rows.filter((r) => {
    const ca = r.created_at as string | undefined;
    if (!ca) return false;
    const t = new Date(ca).getTime();
    const start = now.getTime() - 14 * 86400000;
    const end = now.getTime() - 7 * 86400000;
    return t >= start && t < end;
  }).length;
  const wowChange =
    totalPrevWeekOrders > 0 ? Math.round(((totalRecentOrders - totalPrevWeekOrders) / totalPrevWeekOrders) * 100) : null;

  // ── Donut: status breakdown, real ──
  const buckets = { done: 0, progress: 0, failed: 0 };
  for (const r of rows) {
    const b = statusBucket(String(r.status ?? "new"));
    buckets[b]++;
  }
  const total = rows.length || 1;
  const pctDone = buckets.done / total;
  const pctProgress = buckets.progress / total;
  const pctFailed = buckets.failed / total;
  const CIRC = 2 * Math.PI * 36; // ≈226.19
  const doneLen = pctDone * CIRC;
  const progressLen = pctProgress * CIRC;
  const failedLen = pctFailed * CIRC;
  const successRate = rows.length ? Math.round((pctDone + pctProgress) * 100) : 0;

  // Split bars. Taxi has no delivery/collection concept — that's a food idea, and
  // it made every taxi client read 100% / 0%. Split taxi on booking_type instead.
  //
  // Count each category EXACTLY: booking_type also carries airport /
  // dispatch-query / cancellation, so "everything that isn't pre-booked" is NOT
  // immediate. These two bars are therefore honest shares of the total and are
  // not forced to add up to 100% (the remainder is the other types, which the
  // Booking Mix card breaks out in full). Food stays a true binary split.
  // Normalised: "collection\n\n" is a collection. Counting each category exactly
  // (rather than "everything that isn't X") also stops the 5 blank-order_type
  // rows being silently dumped into Delivery.
  const splitACount = isTaxi
    ? rows.filter((r) => /immediate/i.test(norm(r.booking_type) || "immediate")).length
    : rows.filter((r) => norm(r.order_type) === "delivery").length;
  const splitBCount = isTaxi
    ? rows.filter((r) => /pre[-\s]?book|schedul|advance/i.test(norm(r.booking_type))).length
    : rows.filter((r) => norm(r.order_type) === "collection").length;
  const splitAPct = rows.length ? Math.round((splitACount / rows.length) * 100) : 0;
  const splitBPct = rows.length ? Math.round((splitBCount / rows.length) * 100) : 0;

  return (
    <div className="charts">
      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">Calls &amp; {isTaxi ? "Bookings" : "Orders"} — Last 7 Days</div>
            <div className="cs">
              Daily volume comparison
              {wowChange !== null ? ` · ${wowChange >= 0 ? "+" : ""}${wowChange}% vs last week` : ""}
            </div>
          </div>
          {/* These bars now update over realtime, so say so. */}
          <span className="live-badge">
            <span className="pulse-dot" style={{ width: 5, height: 5 }} />
            Live data
          </span>
        </div>

        <div className="chart-plot">
          <div className="y-axis">
            {yTicks.map((t) => (
              <div key={t}>{t}</div>
            ))}
          </div>
          <div className="plot">
            <div className="gridlines">
              {yTicks.map((t) => (
                <div key={t} className="gridline" />
              ))}
            </div>
            <div className="bars">
              {days.map((d) => {
                const oc = orderCounts.get(d.key) ?? 0;
                const cc = callCounts.get(d.key) ?? 0;
                // Scale against axisMax so bar heights line up with the gridlines.
                const oh = oc ? Math.max(3, Math.round((oc / axisMax) * 100)) : 0;
                const ch = cc ? Math.max(3, Math.round((cc / axisMax) * 100)) : 0;
                return (
                  <div className="bg" key={d.key}>
                    <div className="bp">
                      <div className="b c" style={{ width: 11, height: ch }} />
                      <div className="b o" style={{ width: 11, height: oh }} />
                    </div>
                    <div className="bl">{d.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="leg">
          <div className="li">
            <div className="li-d" style={{ background: "var(--blue2)" }} />
            Calls
          </div>
          <div className="li">
            <div className="li-d" style={{ background: "var(--green)" }} />
            {isTaxi ? "Bookings" : "Orders"}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">{isTaxi ? "Booking" : "Order"} Status</div>
            <div className="cs">Recent window</div>
          </div>
        </div>
        <div className="donut-w">
          <div className="donut">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="13" />
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke="var(--green)"
                strokeWidth="13"
                strokeDasharray={`${doneLen} ${CIRC - doneLen}`}
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke="var(--amber)"
                strokeWidth="13"
                strokeDasharray={`${progressLen} ${CIRC - progressLen}`}
                strokeDashoffset={-doneLen}
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke="var(--red)"
                strokeWidth="13"
                strokeDasharray={`${failedLen} ${CIRC - failedLen}`}
                strokeDashoffset={-(doneLen + progressLen)}
                strokeLinecap="round"
              />
            </svg>
            <div className="dctr">
              <div className="dcv">{successRate}%</div>
              <div className="dcl">success</div>
            </div>
          </div>
          <div className="dl-list">
            <div className="dl-it">
              <div className="dl-d" style={{ background: "var(--green)" }} />
              {isTaxi ? "Completed" : "Delivered"} {buckets.done}
            </div>
            <div className="dl-it">
              <div className="dl-d" style={{ background: "var(--amber)" }} />
              In Progress {buckets.progress}
            </div>
            <div className="dl-it">
              <div className="dl-d" style={{ background: "var(--red)" }} />
              {isTaxi ? "Cancelled" : "Failed"} {buckets.failed}
            </div>
          </div>
        </div>
        <div className="spark-list">
          <div className="spark">
            <div className="sp-l">{isTaxi ? "Immediate" : "Delivery"}</div>
            <div className="sp-t">
              <div className="sp-f" style={{ width: `${splitAPct}%`, background: "var(--blue2)" }} />
            </div>
            <div className="sp-v" style={{ color: "var(--blue2)" }}>
              {splitAPct}%
            </div>
          </div>
          <div className="spark">
            <div className="sp-l">{isTaxi ? "Pre-booked" : "Collection"}</div>
            <div className="sp-t">
              <div className="sp-f" style={{ width: `${splitBPct}%`, background: "rgba(0,148,255,0.35)" }} />
            </div>
            <div className="sp-v" style={{ color: "var(--t2)" }}>
              {splitBPct}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

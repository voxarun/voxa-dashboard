"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { DataTable } from "./DataTable";

type Row = Record<string, unknown>;

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

/** Status buckets, matching the rest of the dashboard. */
const DONE = ["delivered", "completed", "collected", "done"];
const FAILED = ["failed", "cancelled", "canceled", "error", "no_show"];

/**
 * Dedicated Orders / Bookings screen: the whole book of business (not the
 * 50-row recent slice the overview uses), with status + type filter pills and
 * the same expandable rows as the live feed. Rows stay in sync over realtime.
 */
export function OrdersScreen({
  initialRows,
  isTaxi,
  slug,
  supabaseUrl,
  supabaseAnonKey,
  table,
}: {
  initialRows: Row[];
  isTaxi: boolean;
  slug: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  table: string;
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  useEffect(() => setRows(initialRows), [initialRows]);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || !table) return;
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const channel = sb
      .channel(`orders-screen:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        setRows((prev) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as Row;
            if (prev.some((x) => String(x.id) === String(r.id))) return prev;
            return [r, ...prev];
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
      .subscribe();
    return () => {
      sb.removeChannel(channel);
      sb.realtime.disconnect();
    };
  }, [supabaseUrl, supabaseAnonKey, table]);

  const statusOf = (r: Row) => norm(r.status || "new");

  // Counts come from the full set, so a pill always shows how many exist —
  // not how many are left after the other filter is applied.
  const statusPills = useMemo(() => {
    const count = (fn: (r: Row) => boolean) => rows.filter(fn).length;
    const base = [
      { key: "all", label: "All", n: rows.length },
      { key: "new", label: "New", n: count((r) => statusOf(r) === "new") },
    ];
    const mid = isTaxi
      ? [
          { key: "assigned", label: "Assigned", n: count((r) => statusOf(r) === "assigned") },
          { key: "en_route", label: "On the way", n: count((r) => statusOf(r) === "en_route") },
        ]
      : [
          { key: "cooking", label: "Cooking", n: count((r) => statusOf(r) === "cooking") },
          { key: "ready", label: "Ready", n: count((r) => statusOf(r) === "ready") },
        ];
    return [
      ...base,
      ...mid,
      // "Completed" covers both delivered AND collected orders.
      { key: "done", label: "Completed", n: count((r) => DONE.includes(statusOf(r))) },
      { key: "failed", label: "Failed", n: count((r) => FAILED.includes(statusOf(r))) },
    ];
  }, [rows, isTaxi]);

  // Type matchers use predicates, NOT exact string equality, so the pill counts
  // and the filter match the KPI tiles exactly (e.g. Airport counts the
  // is_airport flag too, Pre-Booking includes "scheduled"). booking_type is
  // dirtier than order_type, which is why exact matching under-reported it.
  const typeMatchers = useMemo(
    () =>
      isTaxi
        ? [
            { key: "immediate", label: "Immediate", test: (r: Row) => /immediate/i.test(norm(r.booking_type)) },
            {
              key: "pre",
              label: "Pre-Booking",
              test: (r: Row) => /pre[-\s]?book|schedul|advance/i.test(norm(r.booking_type)),
            },
            {
              key: "airport",
              label: "Airport",
              test: (r: Row) => r.is_airport === true || /airport/i.test(norm(r.booking_type)),
            },
          ]
        : [
            { key: "delivery", label: "Delivery", test: (r: Row) => norm(r.order_type) === "delivery" },
            { key: "collection", label: "Collection", test: (r: Row) => norm(r.order_type) === "collection" },
          ],
    [isTaxi]
  );

  const typePills = useMemo(
    () => [
      { key: "all", label: "All Types", n: rows.length },
      ...typeMatchers.map((m) => ({ key: m.key, label: m.label, n: rows.filter(m.test).length })),
    ],
    [rows, typeMatchers]
  );

  const filtered = useMemo(() => {
    const typeTest = type === "all" ? () => true : typeMatchers.find((m) => m.key === type)?.test ?? (() => true);
    return rows.filter((r) => {
      const s = statusOf(r);
      const statusOk =
        status === "all" ||
        (status === "done" ? DONE.includes(s) : status === "failed" ? FAILED.includes(s) : s === status);
      return statusOk && typeTest(r);
    });
  }, [rows, status, type, typeMatchers]);

  const word = isTaxi ? "bookings" : "orders";

  return (
    <div>
      <div className="os-head">
        <div>
          <div className="os-title">
            {isTaxi ? "Bookings" : "Orders"}
            <span className="live-badge">
              <span className="pulse-dot" style={{ width: 5, height: 5 }} />
              Live
            </span>
          </div>
          <div className="os-sub">
            {rows.length} {word}
          </div>
        </div>
      </div>

      <div className="os-pills">
        {statusPills.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`os-pill ${status === p.key ? "on" : ""}`}
            onClick={() => setStatus(p.key)}
          >
            {p.label} ({p.n})
          </button>
        ))}
      </div>

      <div className="os-pills">
        {typePills.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`os-pill alt ${type === p.key ? "on" : ""}`}
            onClick={() => setType(p.key)}
          >
            {p.label}
            {p.key !== "all" ? ` (${p.n})` : ""}
          </button>
        ))}
      </div>

      <DataTable
        rows={filtered}
        isTaxi={isTaxi}
        slug={slug}
        title={isTaxi ? "Live Booking Feed" : "Live Order Feed"}
        subtitle={`Real-time ${word} from Voxa AI · ${filtered.length} shown of ${rows.length}`}
        hideFilter
      />
    </div>
  );
}

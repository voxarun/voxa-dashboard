"use client";

import { useState } from "react";

type Row = Record<string, unknown>;

function fmtTime(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function shortId(id: unknown, prefix: string): string {
  const s = String(id ?? "");
  if (!s) return "—";
  return `#${prefix}-${s.slice(-4).toUpperCase()}`;
}

function deriveTypeClass(t: string): string {
  const s = t.toLowerCase();
  if (s.includes("airport")) return "tt-air";
  if (s.includes("account") || s.includes("nhs") || s.includes("corp")) return "tt-acc";
  if (s.includes("pre") || s.includes("advance") || s.includes("schedul")) return "tt-pre";
  return "tt-imm";
}

const TAXI_FILTERS = [
  { key: "all", label: "All", match: "" },
  { key: "immediate", label: "Immediate", match: "immediate" },
  { key: "pre", label: "Pre-Booking", match: "pre" },
  { key: "airport", label: "Airport", match: "airport" },
] as const;

const FOOD_FILTERS = [
  { key: "all", label: "All", match: "" },
  { key: "delivery", label: "Delivery", match: "delivery" },
  { key: "collection", label: "Collection", match: "collection" },
] as const;

function toCsvValue(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function DataTable({ rows, isTaxi }: { rows: Row[]; isTaxi: boolean }) {
  const [filterKey, setFilterKey] = useState("all");
  const filters = isTaxi ? TAXI_FILTERS : FOOD_FILTERS;
  const activeMatch = filters.find((f) => f.key === filterKey)?.match ?? "";

  const displayed = activeMatch
    ? rows.filter((r) => {
        const t = isTaxi ? String(r.booking_type ?? "") : String(r.order_type ?? "");
        return t.toLowerCase().includes(activeMatch);
      })
    : rows;

  function exportCsv() {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map((h) => toCsvValue(r[h])).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isTaxi ? "bookings" : "orders"}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="ot-hdr">
        <div>
          <div className="ot-title">{isTaxi ? "Live Booking Feed" : "Live Order Feed"}</div>
          <div className="ot-sub">Real-time · auto-updating</div>
        </div>
        <div className="ot-ctrls">
          <button className="btn" onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </button>
          <select
            className="btn"
            value={filterKey}
            onChange={(e) => setFilterKey(e.target.value)}
            aria-label="Filter"
            style={{ cursor: "pointer" }}
          >
            {filters.map((f) => (
              <option key={f.key} value={f.key} style={{ background: "#080c16", color: "var(--t1)" }}>
                {f.key === "all" ? "Filter: All" : f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ot" id="bookings">
        <div className="thead">
          <div className="th">ID</div>
          <div className="th">Customer</div>
          <div className="th">{isTaxi ? "Route" : "Address"}</div>
          <div className="th">Status</div>
          <div className="th">Type</div>
          <div className="th">{isTaxi ? "" : "Total"}</div>
          <div className="th">Time</div>
        </div>
        {displayed.length === 0 && (
          <div className="tr" style={{ gridTemplateColumns: "1fr" }}>
            <div className="td" style={{ padding: "18px 0", textAlign: "center", color: "var(--t3)" }}>
              No {isTaxi ? "bookings" : "orders"} yet.
            </div>
          </div>
        )}
        {displayed.map((r) => {
          const type = isTaxi ? String(r.booking_type ?? "Immediate") : String(r.order_type ?? "Delivery");
          const route = isTaxi
            ? [r.pickup_address, r.destination_address].filter(Boolean).join(" → ") || "Address not provided"
            : String(r.delivery_address ?? r.order_type ?? "—");
          return (
            <div key={String(r.id)} className="tr">
              <div className="td mn">{shortId(r.id, isTaxi ? "BK" : "OR")}</div>
              <div className="td">
                <div className="td br">{String(r.customer_name ?? "No Name")}</div>
                <div style={{ fontSize: 10, color: "var(--t3)" }}>
                  {isTaxi ? `${r.passengers ?? 1} passenger(s)` : r.source === "online" ? "order.voxa.run" : "Voice agent"}
                </div>
              </div>
              <div className="td">{route}</div>
              <div className="td">
                <span className="chip cg">{String(r.status ?? "new")}</span>
              </div>
              <div className="td">
                <span className={`type-tag ${deriveTypeClass(type)}`}>{type}</span>
              </div>
              <div className="td br">{isTaxi ? "" : `£${r.total ?? "0.00"}`}</div>
              <div className="td mn">{fmtTime(r.created_at)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

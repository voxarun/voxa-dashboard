"use client";

import { useEffect, useState, useTransition } from "react";
import { setOrderStatus } from "@/app/[slug]/actions";
import { agoLabel, elapsedLabel, waitTone } from "@/lib/time";

type Row = Record<string, unknown>;
type Item = { name?: string; quantity?: number; modifiers?: unknown[]; unitPrice?: number };

function fmtTime(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  // 12-hour clock (was en-GB, which renders 24-hour: "20:09").
  return d.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Europe/London",
  });
}

/** items is a JSON array on the order row: [{name, quantity, modifiers, unitPrice}] */
function parseItems(v: unknown): Item[] {
  if (Array.isArray(v)) return v as Item[];
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? (p as Item[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function itemsSummary(items: Item[]): string {
  if (!items.length) return "";
  return items.map((i) => `${i.quantity ?? 1}× ${i.name ?? "item"}`).join(", ");
}

/** Status steps offered in the expanded row, per vertical. */
const FOOD_STEPS = [
  { value: "new", label: "New" },
  { value: "cooking", label: "Cooking" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
];
const TAXI_STEPS = [
  { value: "new", label: "New" },
  { value: "assigned", label: "Assigned" },
  { value: "en_route", label: "On the way" },
  { value: "completed", label: "Completed" },
];

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

/** Values arrive from the voice pipeline with stray whitespace/newlines
 *  ("collection\n\n") and as empty strings rather than null. */
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
// Pretty-print a raw booking_type/order_type: "safety_emergency" -> "Safety
// Emergency", "pre-booking" -> "Pre Booking". Underscores/hyphens become spaces
// and each word is capitalised.
const titleCase = (s: string) =>
  s
    ? s
        .replace(/[_-]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : s;

/** Colour the status chip by what the status MEANS. It was hardcoded to one
 *  class, so a brand-new unactioned order looked identical to a delivered one. */
function statusChipClass(status: string): string {
  const s = norm(status);
  if (["delivered", "completed", "collected", "done"].includes(s)) return "cd"; // green
  if (["cancelled", "canceled", "failed", "error", "no_show"].includes(s)) return "cr"; // red
  if (["new"].includes(s)) return "ca"; // amber — needs action
  if (["cooking", "preparing", "ready", "en_route", "out_for_delivery", "assigned"].includes(s)) return "cn"; // blue
  return "cg";
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

// Mobile (<=640px) responsive tweaks for THIS table only. Scoped under the
// .ot--rt class added below so desktop/tablet layout is left untouched, and
// scoped with two classes so it overrides the global .thead/.tr grid rules.
const MOBILE_TABLE_CSS = `
@media (max-width: 640px) {
  .ot--rt { overflow-x: auto; }

  /* Drop the Address/Route column (3rd) and widen Customer to reclaim it */
  .ot--rt .thead,
  .ot--rt .tr {
    grid-template-columns: minmax(0, 1fr) 60px 80px 50px;
  }
  .ot--rt .thead .th:nth-child(3),
  .ot--rt .tr > .td:nth-child(3) {
    display: none;
  }

  /* Slightly smaller text + no wrapping so cells fit on one line */
  .ot--rt .td { font-size: 11px; white-space: nowrap; }
  .ot--rt .tr > .td:nth-child(2) { min-width: 0; overflow: hidden; }
  .ot--rt .tr > .td:nth-child(2) > .td.br {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
`;

export function DataTable({
  rows,
  isTaxi,
  slug,
  title,
  subtitle,
  hideFilter = false,
}: {
  rows: Row[];
  isTaxi: boolean;
  slug: string;
  title?: string;
  /** The Orders screen supplies its own filter pills, so its select is hidden. */
  subtitle?: string;
  hideFilter?: boolean;
}) {
  const [filterKey, setFilterKey] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<Record<string, string>>({});
  // Elapsed time — computed after mount (never during render) to avoid a
  // hydration mismatch, refreshed each minute.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  // Optimistic status so the chip/buttons update the moment you click.
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});

  const steps = isTaxi ? TAXI_STEPS : FOOD_STEPS;

  function changeStatus(id: string, next: string, current: string) {
    if (next === current) return;
    setRowErr((e) => ({ ...e, [id]: "" }));
    setLocalStatus((s) => ({ ...s, [id]: next }));
    setPendingId(id);
    startSave(async () => {
      const res = await setOrderStatus(slug, id, next);
      setPendingId(null);
      if (!res.ok) {
        setLocalStatus((s) => {
          const copy = { ...s };
          delete copy[id];
          return copy;
        });
        setRowErr((e) => ({ ...e, [id]: res.error || "Couldn't save" }));
      }
    });
  }

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
      <style dangerouslySetInnerHTML={{ __html: MOBILE_TABLE_CSS }} />
      <div className="ot-hdr">
        <div>
          <div className="ot-title">{title ?? (isTaxi ? "Live Booking Feed" : "Live Order Feed")}</div>
          <div className="ot-sub">{subtitle ?? "Real-time · auto-updating"}</div>
        </div>
        <div className="ot-ctrls">
          <button className="btn" onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </button>
          {!hideFilter && (
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
          )}
        </div>
      </div>

      <div className="ot ot--rt" id="bookings">
        <div className="thead">
          <div className="th">ID</div>
          <div className="th">Customer</div>
          <div className="th">{isTaxi ? "Route" : "Items"}</div>
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
          const id = String(r.id);
          // Normalise, then label the genuinely-missing values instead of
          // rendering an empty cell. `?? fallback` never fired here because the
          // pipeline writes "" (an empty string), not null.
          const rawType = isTaxi ? norm(r.booking_type) : norm(r.order_type);
          const type = titleCase(rawType) || "Unspecified";

          const deliveryAddr = norm(r.delivery_address) ? String(r.delivery_address).trim() : "";
          const items = parseItems(r.items);
          const summary = itemsSummary(items);

          // Food: the middle column is far more useful as the order contents —
          // a collection order has no address at all. Taxi keeps the route.
          const middle = isTaxi
            ? [r.pickup_address, r.destination_address].map((v) => String(v ?? "").trim()).filter(Boolean).join(" → ") ||
              "Address not provided"
            : summary || deliveryAddr || "No items recorded";

          const totalNum = parseFloat(String(r.total ?? ""));
          const total = isTaxi ? "" : isNaN(totalNum) ? "—" : `£${totalNum.toFixed(2)}`;
          const status = localStatus[id] ?? (String(r.status ?? "new").trim() || "new");
          const open = openId === id;
          const muted = middle === "Address not provided" || middle === "No items recorded";

          const fulfilment = isTaxi
            ? `${r.passengers ?? 1} passenger(s)`
            : rawType === "collection"
              ? "Collection — In store"
              : deliveryAddr
                ? `Delivery — ${deliveryAddr}`
                : r.source === "online"
                  ? "order.voxa.run"
                  : "Voice agent";

          return (
            <div key={id}>
              <div
                className="tr tr--click"
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(open ? null : id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenId(open ? null : id);
                  }
                }}
              >
                <div className="td mn">{shortId(r.id, isTaxi ? "BK" : "OR")}</div>
                <div className="td">
                  <div className="td br">{String(r.customer_name ?? "").trim() || "No name"}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--t3)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fulfilment}
                  </div>
                </div>
                <div className="td" style={muted ? { color: "var(--t3)" } : undefined}>
                  {middle}
                </div>
                <div className="td">
                  <span className={`chip ${statusChipClass(status)}`}>{status}</span>
                </div>
                <div className="td">
                  <span className={`type-tag ${deriveTypeClass(type)}`}>{type}</span>
                </div>
                <div className="td br" style={total === "—" ? { color: "var(--t3)" } : undefined}>
                  {total}
                </div>
                <div className="td mn" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                  {fmtTime(r.created_at)}
                  <span className={`row-chev ${open ? "open" : ""}`}>⌃</span>
                </div>
              </div>

              {open && (
                <div className="row-detail">
                  <div>
                    <div className="rd-h">{isTaxi ? "Booking details" : "Full items"}</div>
                    {isTaxi ? (
                      <div className="rd-line">
                        {deliveryAddr || String(r.pickup_address ?? "").trim() || "No pickup address"}
                      </div>
                    ) : items.length ? (
                      items.map((it, i) => (
                        <div key={i} className="rd-line">
                          <strong>
                            {it.quantity ?? 1}× {it.name ?? "item"}
                          </strong>
                          {Array.isArray(it.modifiers) && it.modifiers.length > 0 && (
                            <span style={{ color: "var(--t3)" }}> ({it.modifiers.join(", ")})</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="rd-line" style={{ color: "var(--t3)" }}>
                        No items recorded
                      </div>
                    )}
                    {norm(r.special_instructions) && norm(r.special_instructions) !== "none" && (
                      <div className="rd-line" style={{ color: "var(--amber)", marginTop: 4 }}>
                        ⚠️ {String(r.special_instructions)}
                      </div>
                    )}
                    {!isTaxi && deliveryAddr && (
                      <div className="rd-line" style={{ color: "var(--t3)", marginTop: 6 }}>
                        📍 {deliveryAddr}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="rd-h">Update status</div>
                    <div className="rd-steps">
                      {steps.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          className={`rd-step ${norm(status) === s.value ? "on" : ""}`}
                          disabled={saving && pendingId === id}
                          onClick={(e) => {
                            e.stopPropagation();
                            changeStatus(id, s.value, norm(status));
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    {rowErr[id] ? (
                      <div style={{ fontSize: 10, color: "var(--red)", marginTop: 6 }}>{rowErr[id]}</div>
                    ) : null}
                  </div>

                  <div>
                    <div className="rd-h">Timing</div>
                    <div className="rd-line">
                      Placed <strong>{agoLabel(r.created_at, nowMs)}</strong>
                    </div>
                    {/* For anything not yet completed, how long it has been
                        waiting — turns amber/red the longer it sits. */}
                    {!["delivered", "completed", "collected", "done", "cancelled", "failed"].includes(norm(status)) && (
                      <div className="rd-line" style={{ color: waitTone(r.created_at, nowMs), fontWeight: 700 }}>
                        ⏱ Waiting {elapsedLabel(r.created_at, nowMs)}
                      </div>
                    )}
                    <div className="rd-h" style={{ marginTop: 12 }}>
                      Payment
                    </div>
                    <div className="rd-line">{norm(r.payment_method) ? String(r.payment_method) : "Not recorded"}</div>
                    {norm(r.customer_phone) || norm(r.phone_number) ? (
                      <div className="rd-line" style={{ color: "var(--t3)", fontSize: 11 }}>
                        {String(r.customer_phone ?? r.phone_number)}
                      </div>
                    ) : null}
                    {r.call_id ? (
                      <div className="rd-line mn" style={{ color: "var(--t3)", fontSize: 10 }}>
                        Call: {String(r.call_id).slice(0, 14)}…
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

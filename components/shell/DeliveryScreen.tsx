"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@supabase/supabase-js";
import { setOrderStatus } from "@/app/[slug]/actions";

type Row = Record<string, unknown>;
type Item = { name?: string; quantity?: number };

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const DONE = ["delivered", "completed", "collected", "done"];
const FAILED = ["failed", "cancelled", "canceled", "error", "no_show"];

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

/** "1× Meat Feast 10\", 1× Regular Fries +1 more" */
function itemsSummary(items: Item[]): string {
  if (!items.length) return "No items recorded";
  const shown = items.slice(0, 2).map((i) => `${i.quantity ?? 1}× ${i.name ?? "item"}`);
  const rest = items.length - shown.length;
  return shown.join(", ") + (rest > 0 ? ` +${rest} more` : "");
}

function whenLabel(iso: unknown): string {
  if (!iso) return "—";
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return "—";
  const hoursAgo = (Date.now() - d.getTime()) / 3600000;
  if (hoursAgo < 24) {
    return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Europe/London" });
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
}

/**
 * Delivery board for a takeaway: every delivery order that still has to go out.
 * Not a per-driver view — there is no driver assignment in the schema, so this
 * deliberately shows the shop's whole outstanding delivery list rather than
 * pretending these jobs belong to whoever is signed in.
 */
export function DeliveryScreen({
  initialRows,
  slug,
  supabaseUrl,
  supabaseAnonKey,
  table,
}: {
  initialRows: Row[];
  slug: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  table: string;
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});
  const [rowErr, setRowErr] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startSave] = useTransition();

  useEffect(() => setRows(initialRows), [initialRows]);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || !table) return;
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const channel = sb
      .channel(`delivery:${table}`)
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

  const statusOf = (r: Row) => localStatus[String(r.id)] ?? norm(r.status || "new");

  const active = rows.filter(
    (r) => norm(r.order_type) === "delivery" && !DONE.includes(statusOf(r)) && !FAILED.includes(statusOf(r))
  );
  const readyCount = active.filter((r) => statusOf(r) === "ready").length;
  const preparingCount = active.filter((r) => ["new", "cooking"].includes(statusOf(r))).length;

  function markDelivered(id: string) {
    setRowErr((e) => ({ ...e, [id]: "" }));
    setLocalStatus((s) => ({ ...s, [id]: "delivered" }));
    setPendingId(id);
    startSave(async () => {
      const res = await setOrderStatus(slug, id, "delivered");
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

  return (
    <div>
      <div className="os-head">
        <div className="os-title">
          Delivery Dashboard
          <span className="live-badge">
            <span className="pulse-dot" style={{ width: 5, height: 5 }} />
            Live
          </span>
        </div>
        <div className="os-sub">{active.length} active deliveries</div>
      </div>

      <div className="ks-grid ks-grid--2">
        <div className="ks-card green">
          <div className="ks-val">{readyCount}</div>
          <div className="ks-lbl">Ready for pickup</div>
        </div>
        <div className="ks-card blue">
          <div className="ks-val">{preparingCount}</div>
          <div className="ks-lbl">Being prepared</div>
        </div>
      </div>

      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">🚚 Delivery Dashboard</div>
            <div className="cs">{active.length} active deliveries</div>
          </div>
          <span className="badge b">{active.length} To go</span>
        </div>

        <div className="kq-list" style={{ maxHeight: 620 }}>
          {active.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--t3)" }}>No deliveries waiting — all caught up.</div>
          )}

          {active.map((r) => {
            const id = String(r.id);
            const name = String(r.customer_name ?? "").trim() || "Customer";
            const addr = norm(r.delivery_address) ? String(r.delivery_address).trim() : "";
            const busy = pendingId === id;
            const done = statusOf(r) === "delivered";
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

            return (
              <div key={id} className="kq-item">
                <div className="kq-top">
                  <span className="kq-id">#{id.slice(-6).toUpperCase()}</span>
                  <span className="kq-ago">{whenLabel(r.created_at)}</span>
                </div>

                <div className="dl-route">
                  <span style={{ color: "var(--blue2)" }}>📍</span>
                  <strong>{name}</strong>
                  <span style={{ color: "var(--t3)" }}>→</span>
                  <span style={addr ? undefined : { color: "var(--t3)" }}>{addr || "Address not provided"}</span>
                </div>

                <div className="kq-type" style={{ marginTop: 4 }}>
                  {itemsSummary(parseItems(r.items))}
                </div>

                <div className="kq-btns" style={{ marginTop: 10 }}>
                  {/* Only offer Maps when there's actually an address to open. */}
                  {addr && (
                    <a
                      className="kq-btn maps"
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ flex: "0 0 auto", padding: "9px 16px", textDecoration: "none", textAlign: "center" }}
                    >
                      ➤ Maps
                    </a>
                  )}
                  <button className="kq-btn ready" disabled={busy || done} onClick={() => markDelivered(id)}>
                    {done ? "✅ Delivered" : busy ? "Saving…" : "✅ Mark Delivered"}
                  </button>
                </div>

                {rowErr[id] ? <div className="kq-err">{rowErr[id]}</div> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

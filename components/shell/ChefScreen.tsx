"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@supabase/supabase-js";
import { setOrderStatus } from "@/app/[slug]/actions";
import { elapsedLabel, waitTone } from "@/lib/time";

type Row = Record<string, unknown>;
type Item = { name?: string; quantity?: number };

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

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

/**
 * Kitchen board. Three columns — New → Cooking → Ready — so an order VISIBLY
 * moves one column to the right when the chef presses a button, instead of just
 * vanishing from a single list (which is what made "where did it go?" confusing).
 * Taxi shows a dispatch flavour of the same board.
 *
 * Rows stay live over realtime, and each button writes the real status to the DB.
 */
export function ChefScreen({
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
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});
  const [rowErr, setRowErr] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startSave] = useTransition();
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => setRows(initialRows), [initialRows]);

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || !table) return;
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const channel = sb
      .channel(`chef:${table}`)
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

  function advance(id: string, next: string) {
    setRowErr((e) => ({ ...e, [id]: "" }));
    setLocalStatus((s) => ({ ...s, [id]: next }));
    setPendingId(id);
    startSave(async () => {
      const res = await setOrderStatus(slug, id, next);
      setPendingId(null);
      if (!res.ok) {
        setLocalStatus((s) => {
          const c = { ...s };
          delete c[id];
          return c;
        });
        setRowErr((e) => ({ ...e, [id]: res.error || "Couldn't save" }));
      }
    });
  }

  // Columns only. The button on each card is decided per-order (see cardAction)
  // because completion differs by order type.
  const columns = isTaxi
    ? [
        { key: "new", title: "New", statuses: ["new"], tone: "blue" },
        { key: "assigned", title: "Assigned", statuses: ["assigned"], tone: "amber" },
        { key: "en_route", title: "On the way", statuses: ["en_route"], tone: "green" },
      ]
    : [
        { key: "new", title: "New", statuses: ["new"], tone: "blue" },
        { key: "cooking", title: "Cooking", statuses: ["cooking"], tone: "amber" },
        { key: "ready", title: "Ready", statuses: ["ready"], tone: "green" },
      ];

  const inCol = (c: (typeof columns)[number]) => rows.filter((r) => c.statuses.includes(statusOf(r)));

  // Single source of truth for "what happens next" — so each order is completed
  // in exactly ONE place and never double-owned:
  //   collection: New → Cooking → Ready → Collected   (all here in the kitchen)
  //   delivery:   New → Cooking → Ready → then HANDS OFF to the Delivery board
  //               (the driver marks it Delivered there — no button here).
  function cardAction(colKey: string, type: string): { label: string; next: string } | null {
    if (isTaxi) {
      if (colKey === "new") return { label: "Assign", next: "assigned" };
      if (colKey === "assigned") return { label: "On the way", next: "en_route" };
      return { label: "✅ Complete", next: "completed" };
    }
    if (colKey === "new") return { label: "🔥 Start Cooking", next: "cooking" };
    if (colKey === "cooking") return { label: "✅ Mark Ready", next: "ready" };
    // Ready column:
    if (type === "collection") return { label: "✅ Mark Collected", next: "collected" };
    return null; // delivery → completed on the Delivery board, not here
  }

  return (
    <div>
      <div className="os-head">
        <div className="os-title">
          {isTaxi ? "Dispatch View" : "Kitchen View"}
          <span className="live-badge">
            <span className="pulse-dot" style={{ width: 5, height: 5 }} />
            Live
          </span>
        </div>
        <div className="os-sub">Move each order left → right as you work it</div>
      </div>

      <div className="kb-board">
        {columns.map((c) => {
          const orders = inCol(c);
          return (
            <div key={c.key} className={`kb-col ${c.tone}`}>
              <div className="kb-col-head">
                <span className="kb-col-title">{c.title}</span>
                <span className="kb-col-count">{orders.length}</span>
              </div>

              <div className="kb-col-body">
                {orders.length === 0 && <div className="kb-empty">Nothing here</div>}

                {orders.map((r) => {
                  const id = String(r.id);
                  const items = parseItems(r.items);
                  const type = (isTaxi ? norm(r.booking_type) : norm(r.order_type)) || "unspecified";
                  const instr = String(r.special_instructions ?? "").trim();
                  const showInstr = instr && norm(instr) !== "none";
                  const busy = pendingId === id;
                  const route = [r.pickup_address, r.destination_address]
                    .map((v) => String(v ?? "").trim())
                    .filter(Boolean)
                    .join(" → ");

                  return (
                    <div key={id} className="kb-card">
                      <div className="kb-card-top">
                        <span className="kq-id">#{id.slice(-6).toUpperCase()}</span>
                        <span className="kq-ago" style={{ color: waitTone(r.created_at, nowMs) }}>
                          {elapsedLabel(r.created_at, nowMs)}
                        </span>
                      </div>

                      {isTaxi ? (
                        <div className="kq-line">{route || "Address not provided"}</div>
                      ) : items.length ? (
                        items.map((it, i) => (
                          <div key={i} className="kq-line">
                            {it.quantity ?? 1}× {it.name ?? "item"}
                          </div>
                        ))
                      ) : (
                        <div className="kq-line" style={{ color: "var(--t3)" }}>
                          No items
                        </div>
                      )}

                      {showInstr && <div className="kq-instr">⚠️ {instr}</div>}
                      <div className="kq-type">
                        {type === "collection" ? "🏪" : type === "delivery" ? "🚚" : "•"} {type}
                      </div>

                      {(() => {
                        const action = cardAction(c.key, type);
                        if (action) {
                          return (
                            <button className="kb-btn" disabled={busy} onClick={() => advance(id, action.next)}>
                              {busy ? "Saving…" : action.label}
                            </button>
                          );
                        }
                        // Ready delivery order — the driver completes it on the
                        // Delivery board, so show that instead of a button.
                        return <div className="kb-handoff">🚚 On the Delivery board</div>;
                      })()}
                      {rowErr[id] ? <div className="kq-err">{rowErr[id]}</div> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

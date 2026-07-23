"use client";

import { useEffect, useState, useTransition } from "react";
import { setOrderStatus, completeOrder } from "@/app/[slug]/actions";
import { agoLabel, elapsedLabel, waitPct, waitTone } from "@/lib/time";

type Row = Record<string, unknown>;
type Item = { name?: string; quantity?: number; modifiers?: unknown[] };

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
 * The kitchen / dispatch queue card. Shared by the overview's BottomGrid and the
 * dedicated Chef screen so the two can never drift apart.
 */
export function KitchenQueue({
  rows,
  isTaxi,
  slug,
  maxHeight,
}: {
  rows: Row[];
  isTaxi: boolean;
  slug: string;
  maxHeight?: number;
}) {
  // Elapsed time must be computed AFTER mount — deriving it during render gives
  // the server one value and the client another (a hydration mismatch).
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});
  const [assigned, setAssigned] = useState<Record<string, boolean>>({});
  const [rowErr, setRowErr] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startSave] = useTransition();

  const statusOf = (r: Row) => localStatus[String(r.id)] ?? norm(r.status || "new");
  const queue = rows.filter((r) => statusOf(r) === "new");

  function setStatus(id: string, next: string) {
    setRowErr((e) => ({ ...e, [id]: "" }));
    setLocalStatus((s) => ({ ...s, [id]: next }));
    setPendingId(id);
    startSave(async () => {
      const res = isTaxi && next === "completed" ? await completeOrder(slug, id) : await setOrderStatus(slug, id, next);
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

  const word = isTaxi ? "bookings" : "orders";

  return (
    <div className="card">
      <div className="ch">
        <div>
          <div className="ct">{isTaxi ? "📋 Dispatch Queue" : "👨‍🍳 Chef Dashboard"}</div>
          <div className="cs">
            {queue.length} {word} need attention
          </div>
        </div>
        <span className="badge a">{queue.length} Active</span>
      </div>

      <div className="kq-list" style={maxHeight ? { maxHeight } : undefined}>
        {queue.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--t3)" }}>Nothing waiting — you&apos;re all caught up.</div>
        )}
        {queue.map((r) => {
          const id = String(r.id);
          const items = parseItems(r.items);
          const type = (isTaxi ? norm(r.booking_type) : norm(r.order_type)) || "unspecified";
          const instr = String(r.special_instructions ?? "").trim();
          const showInstr = instr && norm(instr) !== "none";
          const st = statusOf(r);
          const busy = pendingId === id;
          const route = [r.pickup_address, r.destination_address]
            .map((v) => String(v ?? "").trim())
            .filter(Boolean)
            .join(" → ");

          return (
            <div key={id} className="kq-item">
              <div className="kq-top">
                <span className="kq-id">#{id.slice(-6).toUpperCase()}</span>
                <span className="kq-ago">{agoLabel(r.created_at, nowMs)}</span>
              </div>

              {isTaxi ? (
                <div className="kq-line">{route || "Address not provided"}</div>
              ) : items.length ? (
                items.map((it, i) => (
                  <div key={i} className="kq-line">
                    <strong>
                      {it.quantity ?? 1}× {it.name ?? "item"}
                    </strong>
                    {Array.isArray(it.modifiers) && it.modifiers.length > 0 && (
                      <span style={{ color: "var(--t3)" }}> ({it.modifiers.join(", ")})</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="kq-line" style={{ color: "var(--t3)" }}>
                  No items recorded
                </div>
              )}

              {showInstr && <div className="kq-instr">⚠️ {instr}</div>}

              <div className="kq-type">
                {type === "collection" ? "🏪" : type === "delivery" ? "🚚" : "•"} {type}
              </div>

              <div className="kq-wait">
                <div className="kq-bar">
                  <div
                    className="kq-bar-fill"
                    style={{ width: `${waitPct(r.created_at, nowMs)}%`, background: waitTone(r.created_at, nowMs) }}
                  />
                </div>
                <span className="kq-timer mn" style={{ color: waitTone(r.created_at, nowMs) }}>
                  {elapsedLabel(r.created_at, nowMs)}
                </span>
              </div>

              <div className="kq-btns">
                {isTaxi ? (
                  <>
                    <button
                      className="kq-btn cook"
                      disabled={!!assigned[id]}
                      onClick={() => setAssigned((a) => ({ ...a, [id]: true }))}
                    >
                      {assigned[id] ? "✅ Assigned" : "Assign Driver"}
                    </button>
                    <button
                      className="kq-btn ready"
                      disabled={busy || st === "completed"}
                      onClick={() => setStatus(id, "completed")}
                    >
                      {st === "completed" ? "✅ Done" : busy ? "Saving…" : "✅ Complete"}
                    </button>
                  </>
                ) : (
                  <>
                    <button className="kq-btn cook" disabled={busy || st === "cooking"} onClick={() => setStatus(id, "cooking")}>
                      {st === "cooking" ? "🔥 Cooking" : busy ? "Saving…" : "🔥 Mark Cooking"}
                    </button>
                    <button className="kq-btn ready" disabled={busy || st === "ready"} onClick={() => setStatus(id, "ready")}>
                      {st === "ready" ? "✅ Ready" : busy ? "Saving…" : "✅ Mark Ready"}
                    </button>
                  </>
                )}
              </div>

              {rowErr[id] ? <div className="kq-err">{rowErr[id]}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

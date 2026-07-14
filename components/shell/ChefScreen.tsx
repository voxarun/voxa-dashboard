"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { KitchenQueue } from "./KitchenQueue";

type Row = Record<string, unknown>;

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

/**
 * Kitchen / Dispatch view. Rows are kept live over realtime so a new order rings
 * straight through to the pass without anyone refreshing.
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
  useEffect(() => setRows(initialRows), [initialRows]);

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

  const st = (r: Row) => norm(r.status || "new");
  const newCount = rows.filter((r) => st(r) === "new").length;
  const midCount = rows.filter((r) => st(r) === (isTaxi ? "en_route" : "cooking")).length;
  const readyCount = rows.filter((r) => st(r) === (isTaxi ? "assigned" : "ready")).length;

  const midLabel = isTaxi ? "On the way" : "Cooking";
  const readyLabel = isTaxi ? "Assigned" : "Ready";

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
        <div className="os-sub">
          {newCount} new · {midCount} {midLabel.toLowerCase()}
        </div>
      </div>

      <div className="ks-grid">
        <div className="ks-card blue">
          <div className="ks-val">{newCount}</div>
          <div className="ks-lbl">{isTaxi ? "New Bookings" : "New Orders"}</div>
        </div>
        <div className="ks-card amber">
          <div className="ks-val">{midCount}</div>
          <div className="ks-lbl">{midLabel}</div>
        </div>
        <div className="ks-card green">
          <div className="ks-val">{readyCount}</div>
          <div className="ks-lbl">{readyLabel}</div>
        </div>
      </div>

      <KitchenQueue rows={rows} isTaxi={isTaxi} slug={slug} maxHeight={620} />
    </div>
  );
}

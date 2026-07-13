"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { DataTable } from "./DataTable";

type Row = Record<string, unknown>;

// Mirror the server-side getRecentOrders() limit so the live feed never
// grows past what a normal page load would show.
const MAX_ROWS = 50;

function sortNewestFirst(rows: Row[]): Row[] {
  return [...rows].sort(
    (a, b) => new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime()
  );
}

/**
 * Live-updating wrapper around <DataTable>. It renders the exact same table
 * (no layout/design changes) but keeps its rows in sync with the client's
 * data-project Supabase table via a postgres_changes subscription, so new
 * orders/bookings appear without a page refresh.
 *
 * Connection details are passed in from the server component: only the
 * public URL + anon key (NEXT_PUBLIC_*) reach the browser here — never a
 * service-role key. Realtime must be enabled on the table and the anon role
 * must be allowed to read it (RLS) for deltas to be delivered; if that isn't
 * configured, this degrades gracefully to the server-rendered initial rows.
 */
export function RealtimeDataTable({
  initialRows,
  isTaxi,
  supabaseUrl,
  supabaseAnonKey,
  table,
}: {
  initialRows: Row[];
  isTaxi: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  table: string;
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);

  // If the server re-renders with fresh initial data (full navigation /
  // revalidation), reset to it — realtime handles the incremental deltas.
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || !table) return;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const channel = supabase
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        setRows((prev) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Row;
            if (prev.some((r) => String(r.id) === String(row.id))) return prev;
            return sortNewestFirst([row, ...prev]).slice(0, MAX_ROWS);
          }
          if (payload.eventType === "UPDATE") {
            const row = payload.new as Row;
            return prev.map((r) => (String(r.id) === String(row.id) ? { ...r, ...row } : r));
          }
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Row;
            return prev.filter((r) => String(r.id) !== String(oldRow.id));
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Tear down the underlying realtime WebSocket (and the lingering GoTrueClient)
      // so navigating between client dashboards doesn't accumulate Supabase clients.
      supabase.realtime.disconnect();
    };
  }, [supabaseUrl, supabaseAnonKey, table]);

  return <DataTable rows={rows} isTaxi={isTaxi} />;
}

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

/**
 * Keeps the SERVER-computed figures on this page live.
 *
 * The KPI tiles are whole-table aggregates (getClientStats) — they can't be
 * recomputed in the browser without shipping the entire table down, so instead
 * this subscribes to the client's data project and asks Next to re-run the
 * server component when something changes. router.refresh() swaps in a fresh
 * RSC payload without a full page reload and without losing client state.
 *
 * Bursts are debounced: a voice call that writes an order plus a call_log
 * shouldn't trigger two refreshes back to back.
 */
export function RealtimeRefresh({
  supabaseUrl,
  supabaseAnonKey,
  table,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  table: string;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || !table) return;

    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const bump = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 800);
    };

    const channel = sb
      .channel(`kpi-refresh:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, bump)
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      sb.removeChannel(channel);
      sb.realtime.disconnect();
    };
  }, [supabaseUrl, supabaseAnonKey, table, router]);

  return null;
}

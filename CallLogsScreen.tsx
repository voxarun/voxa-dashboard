"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

const callDur = (r: Row) => Number(r.duration_seconds) || 0;

/** Same rule as the Missed Calls KPI (lib/dashboard-data.ts) so this screen
 *  never disagrees with the overview tile or the Live Call Feed card. */
function isMissed(r: Row): boolean {
  return /error|silence-timed-out|no-answer|failed/i.test(String(r.ended_reason ?? "")) || callDur(r) < 5;
}

function fmtDuration(sec: number): string {
  if (sec <= 0) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

function fmtDateTime(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Europe/London",
  });
}

/** Never show a customer's full number on a shared screen. */
function maskPhone(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "Unknown number";
  if (s.length <= 7) return s;
  return `${s.slice(0, 3)}${"•".repeat(Math.max(0, s.length - 7))}${s.slice(-4)}`;
}

function toCsvValue(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Full Call Logs screen — the whole call history (not the 200-row cap the
 * overview's Live Call Feed uses), with Answered/Missed filter pills, a real
 * search box, and CSV export. Mirrors the pattern already used for the
 * dedicated Orders screen (filter pills + real totals, not a hash link into
 * the overview). Stays live via the same postgres_changes subscription the
 * overview's ChartsSection uses.
 */
export function CallLogsScreen({
  initialCalls,
  supabaseUrl,
  supabaseAnonKey,
}: {
  initialCalls: Row[];
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const [calls, setCalls] = useState<Row[]>(initialCalls);
  const [filter, setFilter] = useState<"all" | "answered" | "missed">("all");
  const [search, setSearch] = useState("");

  useEffect(() => setCalls(initialCalls), [initialCalls]);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const channel = sb
      .channel("call-logs-screen:call_logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_logs" }, (payload) => {
        setCalls((prev) => {
          const r = payload.new as Row;
          if (prev.some((x) => String(x.id) === String(r.id))) return prev;
          return [r, ...prev];
        });
      })
      .subscribe();
    return () => {
      sb.removeChannel(channel);
      sb.realtime.disconnect();
    };
  }, [supabaseUrl, supabaseAnonKey]);

  const sorted = useMemo(
    () =>
      [...calls]
        .filter((r) => r.created_at)
        .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime()),
    [calls]
  );

  const pills = useMemo(
    () => [
      { key: "all" as const, label: "All", n: sorted.length },
      { key: "answered" as const, label: "Answered", n: sorted.filter((r) => !isMissed(r)).length },
      { key: "missed" as const, label: "Missed", n: sorted.filter(isMissed).length },
    ],
    [sorted]
  );

  const filtered = useMemo(() => {
    const byFilter = sorted.filter((r) => {
      if (filter === "answered") return !isMissed(r);
      if (filter === "missed") return isMissed(r);
      return true;
    });
    const q = search.trim().toLowerCase();
    if (!q) return byFilter;
    return byFilter.filter(
      (r) =>
        maskPhone(r.customer_number).toLowerCase().includes(q) ||
        String(r.customer_number ?? "").toLowerCase().includes(q)
    );
  }, [sorted, filter, search]);

  function exportCsv() {
    if (!filtered.length) return;
    const headers = ["created_at", "customer_number", "duration_seconds", "ended_reason", "outcome"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push(
        [r.created_at, r.customer_number, r.duration_seconds, r.ended_reason, isMissed(r) ? "Missed" : "Answered"]
          .map(toCsvValue)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="os-head">
        <div>
          <div className="os-title">
            Call Logs
            <span className="live-badge">
              <span className="pulse-dot" style={{ width: 5, height: 5 }} />
              Live
            </span>
          </div>
          <div className="os-sub">{sorted.length} calls logged</div>
        </div>
      </div>

      <div className="os-pills">
        {pills.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`os-pill ${filter === p.key ? "on" : ""}`}
            onClick={() => setFilter(p.key)}
          >
            {p.label} ({p.n})
          </button>
        ))}
      </div>

      <div className="ot-hdr">
        <div>
          <div className="ot-title">Call History</div>
          <div className="ot-sub">
            Real-time · {filtered.length} shown of {sorted.length}
          </div>
        </div>
        <div className="ot-ctrls">
          <input
            className="btn"
            placeholder="Search phone number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 160 }}
          />
          <button className="btn" onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="ot" id="call-logs">
        <div className="thead" style={{ gridTemplateColumns: "110px 1fr 100px 120px 140px" }}>
          <div className="th">Status</div>
          <div className="th">Number</div>
          <div className="th">Duration</div>
          <div className="th">Ended Reason</div>
          <div className="th">Time</div>
        </div>
        {filtered.length === 0 && (
          <div className="tr" style={{ gridTemplateColumns: "1fr" }}>
            <div className="td" style={{ padding: "18px 0", textAlign: "center", color: "var(--t3)" }}>
              No calls match this filter.
            </div>
          </div>
        )}
        {filtered.map((r, i) => {
          const missed = isMissed(r);
          return (
            <div
              key={String(r.id ?? i)}
              className="tr"
              style={{ gridTemplateColumns: "110px 1fr 100px 120px 140px" }}
            >
              <div className="td">
                <span className={`chip ${missed ? "cr" : "cn"}`}>{missed ? "Missed" : "Answered"}</span>
              </div>
              <div className="td mn">{maskPhone(r.customer_number)}</div>
              <div className="td">{fmtDuration(callDur(r))}</div>
              <div className="td" style={{ color: "var(--t3)", fontSize: 12 }}>
                {String(r.ended_reason ?? "").trim() || "—"}
              </div>
              <div className="td mn">{fmtDateTime(r.created_at)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

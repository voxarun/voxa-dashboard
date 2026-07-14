type CallRow = Record<string, unknown>;

/**
 * Live Call Feed — built from real call_logs rows.
 *
 * The card that used to sit here was labelled "Live Call Feed" but actually
 * listed ORDER activity ("Order received — Jonathan"); no call data appeared on
 * the dashboard at all. This shows the calls themselves.
 */

const callDur = (r: CallRow) => Number(r.duration_seconds) || 0;

/** Same rule as the Missed Calls KPI (lib/dashboard-data.ts) so they agree. */
function isMissed(r: CallRow): boolean {
  return /error|silence-timed-out|no-answer|failed/i.test(String(r.ended_reason ?? "")) || callDur(r) < 5;
}

function fmtDuration(sec: number): string {
  if (sec <= 0) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

/** 12-hour clock, matching the orders table. */
function fmtClock(v: unknown): string {
  if (!v) return "—";
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", {
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

export function CallFeed({
  calls,
  totalCalls,
  todayCalls,
  missedCalls,
  avgCallSec,
  answerRatePct,
}: {
  calls: CallRow[];
  totalCalls: number;
  todayCalls: number;
  missedCalls: number;
  avgCallSec: number;
  answerRatePct: number;
}) {
  const recent = [...calls]
    .filter((r) => r.created_at)
    .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())
    .slice(0, 8);

  const tiles = [
    { icon: "📞", label: "Total Calls", value: String(totalCalls), tone: "var(--blue2)" },
    { icon: "📲", label: "Today", value: String(todayCalls), tone: "var(--blue2)" },
    { icon: "📵", label: "Missed", value: String(missedCalls), tone: "var(--red)" },
    { icon: "🕐", label: "Avg Length", value: fmtDuration(avgCallSec), tone: "var(--amber)" },
  ];

  return (
    <div className="card">
      <div className="ch">
        <div>
          <div className="ct">📞 Live Call Feed</div>
          <div className="cs">Real-time activity</div>
        </div>
        <span className="badge b">{answerRatePct}% answer rate</span>
      </div>

      <div className="cf-stats">
        {tiles.map((t) => (
          <div key={t.label} className="cf-stat">
            <div className="cf-stat-lbl">
              <span style={{ color: t.tone }}>{t.icon}</span> {t.label}
            </div>
            <div className="cf-stat-val">{t.value}</div>
          </div>
        ))}
      </div>

      <div className="cf-head">Recent calls</div>

      {recent.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--t3)" }}>No calls logged yet.</div>
      )}

      {recent.map((r, i) => {
        const missed = isMissed(r);
        return (
          <div key={String(r.id ?? i)} className="cf-row">
            <span className={`chip ${missed ? "cr" : "cn"}`}>{missed ? "Missed" : "Answered"}</span>
            <span className="cf-num mn">{maskPhone(r.customer_number)}</span>
            <span className="cf-dur">{fmtDuration(callDur(r))}</span>
            <span className="cf-time mn">{fmtClock(r.created_at)}</span>
          </div>
        );
      })}
    </div>
  );
}

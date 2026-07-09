type Row = Record<string, unknown>;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function statusBucket(status: string): "done" | "progress" | "failed" {
  const s = status.toLowerCase();
  if (["delivered", "completed", "done", "picked_up", "dropped_off"].includes(s)) return "done";
  if (["cancelled", "canceled", "failed", "no_show"].includes(s)) return "failed";
  return "progress"; // new, cooking, ready, en_route, confirmed, etc.
}

export function ChartsSection({ rows, callRows, isTaxi }: { rows: Row[]; callRows: Row[]; isTaxi: boolean }) {
  // ── 7-day bar chart: orders/bookings vs calls, real counts ──
  const days: { label: string; key: string }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString("en-GB", { weekday: "short" }), key: dayKey(d) });
  }
  const orderCounts = new Map<string, number>();
  for (const r of rows) {
    const ca = r.created_at as string | undefined;
    if (!ca) continue;
    const k = dayKey(new Date(ca));
    orderCounts.set(k, (orderCounts.get(k) ?? 0) + 1);
  }
  const callCounts = new Map<string, number>();
  for (const r of callRows) {
    const ca = r.created_at as string | undefined;
    if (!ca) continue;
    const k = dayKey(new Date(ca));
    callCounts.set(k, (callCounts.get(k) ?? 0) + 1);
  }
  const maxVal = Math.max(1, ...days.map((d) => Math.max(orderCounts.get(d.key) ?? 0, callCounts.get(d.key) ?? 0)));
  const totalRecentOrders = days.reduce((s, d) => s + (orderCounts.get(d.key) ?? 0), 0);
  const totalPrevWeekOrders = rows.filter((r) => {
    const ca = r.created_at as string | undefined;
    if (!ca) return false;
    const t = new Date(ca).getTime();
    const start = now.getTime() - 14 * 86400000;
    const end = now.getTime() - 7 * 86400000;
    return t >= start && t < end;
  }).length;
  const wowChange =
    totalPrevWeekOrders > 0 ? Math.round(((totalRecentOrders - totalPrevWeekOrders) / totalPrevWeekOrders) * 100) : null;

  // ── Donut: status breakdown, real ──
  const buckets = { done: 0, progress: 0, failed: 0 };
  for (const r of rows) {
    const b = statusBucket(String(r.status ?? "new"));
    buckets[b]++;
  }
  const total = rows.length || 1;
  const pctDone = buckets.done / total;
  const pctProgress = buckets.progress / total;
  const pctFailed = buckets.failed / total;
  const CIRC = 2 * Math.PI * 36; // ≈226.19
  const doneLen = pctDone * CIRC;
  const progressLen = pctProgress * CIRC;
  const failedLen = pctFailed * CIRC;
  const successRate = rows.length ? Math.round((pctDone + pctProgress) * 100) : 0;

  const deliveryCount = rows.filter((r) => String(r.order_type ?? r.booking_type ?? "delivery") !== "collection").length;
  const collectionCount = rows.length - deliveryCount;
  const deliveryPct = rows.length ? Math.round((deliveryCount / rows.length) * 100) : 0;
  const collectionPct = 100 - deliveryPct;

  return (
    <div className="charts">
      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">Calls &amp; {isTaxi ? "Bookings" : "Orders"} — Last 7 Days</div>
            <div className="cs">Daily volume</div>
          </div>
          {wowChange !== null && (
            <span className={`badge ${wowChange >= 0 ? "g" : "b"}`}>
              {wowChange >= 0 ? "+" : ""}
              {wowChange}% vs last week
            </span>
          )}
        </div>
        <div className="bars">
          {days.map((d) => {
            const oc = orderCounts.get(d.key) ?? 0;
            const cc = callCounts.get(d.key) ?? 0;
            const oh = Math.max(3, Math.round((oc / maxVal) * 100));
            const ch = Math.max(3, Math.round((cc / maxVal) * 100));
            return (
              <div className="bg" key={d.key}>
                <div className="bp">
                  <div className="b c" style={{ width: 11, height: ch }} />
                  <div className="b o" style={{ width: 11, height: oh }} />
                </div>
                <div className="bl">{d.label}</div>
              </div>
            );
          })}
        </div>
        <div className="leg">
          <div className="li">
            <div className="li-d" style={{ background: "var(--blue2)" }} />
            Calls
          </div>
          <div className="li">
            <div className="li-d" style={{ background: "var(--green)" }} />
            {isTaxi ? "Bookings" : "Orders"}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">{isTaxi ? "Booking" : "Order"} Status</div>
            <div className="cs">Recent window</div>
          </div>
        </div>
        <div className="donut-w">
          <div className="donut">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="13" />
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke="var(--green)"
                strokeWidth="13"
                strokeDasharray={`${doneLen} ${CIRC - doneLen}`}
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke="var(--amber)"
                strokeWidth="13"
                strokeDasharray={`${progressLen} ${CIRC - progressLen}`}
                strokeDashoffset={-doneLen}
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke="var(--red)"
                strokeWidth="13"
                strokeDasharray={`${failedLen} ${CIRC - failedLen}`}
                strokeDashoffset={-(doneLen + progressLen)}
                strokeLinecap="round"
              />
            </svg>
            <div className="dctr">
              <div className="dcv">{successRate}%</div>
              <div className="dcl">success</div>
            </div>
          </div>
          <div className="dl-list">
            <div className="dl-it">
              <div className="dl-d" style={{ background: "var(--green)" }} />
              Delivered {buckets.done}
            </div>
            <div className="dl-it">
              <div className="dl-d" style={{ background: "var(--amber)" }} />
              In Progress {buckets.progress}
            </div>
            <div className="dl-it">
              <div className="dl-d" style={{ background: "var(--red)" }} />
              Failed {buckets.failed}
            </div>
          </div>
        </div>
        <div className="spark-list">
          <div className="spark">
            <div className="sp-l">Delivery</div>
            <div className="sp-t">
              <div className="sp-f" style={{ width: `${deliveryPct}%`, background: "var(--blue2)" }} />
            </div>
            <div className="sp-v" style={{ color: "var(--blue2)" }}>
              {deliveryPct}%
            </div>
          </div>
          <div className="spark">
            <div className="sp-l">Collection</div>
            <div className="sp-t">
              <div className="sp-f" style={{ width: `${collectionPct}%`, background: "rgba(0,148,255,0.35)" }} />
            </div>
            <div className="sp-v" style={{ color: "var(--t2)" }}>
              {collectionPct}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

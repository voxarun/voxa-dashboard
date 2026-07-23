/**
 * One place for elapsed-time formatting so every screen reads the same.
 *
 * IMPORTANT: pass `nowMs` from state that's set AFTER mount (useEffect), never
 * call Date.now() while rendering — the server and client clocks differ and
 * that produces a hydration mismatch. Before mount, `nowMs` is null and these
 * return a dash.
 *
 * Format: just now · 5m · 3h 20m · 1d 2h   (days kick in at 24h, so a 26-hour-
 * old order reads "1d 2h" instead of "26h").
 */

export function elapsedLabel(iso: unknown, nowMs: number | null): string {
  if (!iso || nowMs === null) return "—";
  const t = new Date(String(iso)).getTime();
  if (isNaN(t)) return "—";

  const sec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (sec < 60) return "just now";

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;

  const hr = Math.floor(min / 60);
  if (hr < 24) {
    const m = min % 60;
    return m ? `${hr}h ${m}m` : `${hr}h`;
  }

  const d = Math.floor(hr / 24);
  const h = hr % 24;
  return h ? `${d}d ${h}h` : `${d}d`;
}

/** "5m ago", "3h 20m ago", "1d 2h ago". */
export function agoLabel(iso: unknown, nowMs: number | null): string {
  const e = elapsedLabel(iso, nowMs);
  if (e === "—" || e === "just now") return e;
  return `${e} ago`;
}

/** Colour a wait timer green → amber → red as it approaches / passes 30 min. */
export function waitTone(iso: unknown, nowMs: number | null): string {
  if (!iso || nowMs === null) return "var(--t3)";
  const t = new Date(String(iso)).getTime();
  if (isNaN(t)) return "var(--t3)";
  const mins = (nowMs - t) / 60000;
  return mins < 10 ? "var(--green)" : mins < 20 ? "var(--amber)" : "var(--red)";
}

/** 0–100% fill for the wait bar, against a 30-minute target. */
export function waitPct(iso: unknown, nowMs: number | null): number {
  if (!iso || nowMs === null) return 0;
  const t = new Date(String(iso)).getTime();
  if (isNaN(t)) return 0;
  return Math.min(100, Math.max(0, ((nowMs - t) / 60000 / 30) * 100));
}

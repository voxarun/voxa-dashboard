"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Hero } from "./Hero";
import { KpiGrid, type KpiTile } from "./KpiGrid";
import { VoxaBrain } from "./VoxaBrain";
import { AdminHeroScene } from "./AdminHeroScene";

type Project = "takeaway" | "taxi";

type ActivityItem = { client: string; what: string; how: string; when: string; color: string };
type TickerItem = { text: string; color: string };
type ClientRow = {
  id: string;
  name: string;
  industry: string;
  plan_tier: string;
  online_ordering_enabled: boolean;
  slug: string;
  dataProject: Project;
  healthy: boolean;
};
type ServiceHealthRow = { service: string; configured: boolean; healthy: boolean; headline: string; detail: string };
type RealtimeCfg = { url: string; anonKey: string; ordersTable: string };

/**
 * Client wrapper that renders the admin overview body (identical markup to the
 * server version — no design/layout changes) and layers Supabase realtime on
 * top of the server-rendered initial values so three things update without a
 * refresh:
 *   1. the per-project Orders count in the All Clients table
 *   2. the VoxaBrain live activity feed
 *   3. the Calls Logged count (Hero stat + KPI tile + hero scene)
 *
 * It subscribes with the public anon key to each data project's orders table
 * (orders / bookings) and call_logs. Delivery still depends on that project's
 * RLS + realtime publication allowing the anon role; where it doesn't (the taxi
 * project today), the UI simply keeps the server-rendered values.
 */
export function AdminRealtimeWrapper({
  totalClients,
  healthyCount,
  initialTotalCalls,
  liveOrdering,
  openNow,
  initialOrdersByProject,
  clientsByProject,
  representativeClientByProject,
  initialActivity,
  tickerItems,
  clientRows,
  healthRows,
  realtime,
}: {
  totalClients: number;
  healthyCount: number;
  initialTotalCalls: number;
  liveOrdering: number;
  openNow: number;
  initialOrdersByProject: Record<Project, number>;
  clientsByProject: Record<Project, number>;
  representativeClientByProject: Record<Project, string>;
  initialActivity: ActivityItem[];
  tickerItems: TickerItem[];
  clientRows: ClientRow[];
  healthRows: ServiceHealthRow[];
  realtime: Record<Project, RealtimeCfg>;
}) {
  const [totalCalls, setTotalCalls] = useState(initialTotalCalls);
  const [ordersByProject, setOrdersByProject] = useState(initialOrdersByProject);
  const [activity, setActivity] = useState(initialActivity);

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Programmatic navigation with a visible loading state. useTransition keeps the
  // UI responsive (React yields to paint) so the click no longer feels like a
  // freeze while the destination route loads.
  function navigate(href: string) {
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

  useEffect(() => {
    // realtime / clientsByProject / representativeClientByProject come from the
    // server component (single render), so their identities are stable and this
    // effect subscribes exactly once.
    const entries = (Object.keys(realtime) as Project[]).map((key) => {
      const cfg = realtime[key];
      if (!cfg?.url || !cfg?.anonKey) return null;
      const isTaxi = key === "taxi";
      const sb = createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const ch = sb
        .channel(`admin-rt:${key}`)
        // New order/booking → bump this project's Orders count + prepend to feed
        .on("postgres_changes", { event: "INSERT", schema: "public", table: cfg.ordersTable }, (payload) => {
          const row = payload.new as Record<string, unknown>;
          setOrdersByProject((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
          setActivity((prev) => {
            const status = (row.status as string | null) ?? null;
            const item: ActivityItem = {
              client: representativeClientByProject[key] || (isTaxi ? "Taxi" : "Client"),
              what: `${isTaxi ? "Booking" : "Order"} ${status === "new" ? "received" : status ?? "updated"}`,
              how: (row.customer_name as string | null)?.trim() || "customer",
              when: "just now",
              color: status === "new" ? "var(--amber)" : "var(--green)",
            };
            return [item, ...prev].slice(0, 8);
          });
        })
        .subscribe();
      return { sb, ch };
    });

    return () => {
      for (const e of entries) {
        if (!e) continue;
        e.sb.removeChannel(e.ch);
        // Also drop any other channels on this client, then tear down the
        // underlying realtime WebSocket (and with it the lingering GoTrueClient)
        // so navigating to View/Manage and back doesn't accumulate Supabase
        // clients/sockets across mounts.
        e.sb.removeAllChannels();
        e.sb.realtime.disconnect();
      }
    };
  }, [realtime, clientsByProject, representativeClientByProject]);

  const tiles: KpiTile[] = [
    { icon: "🏢", tone: "kb", label: "Onboarded Clients", value: String(totalClients) },
    {
      icon: "🎙️",
      tone: healthyCount === totalClients && totalClients > 0 ? "kg" : "ka",
      label: "Voice Agent Healthy",
      value: `${healthyCount} / ${totalClients}`,
    },
    { icon: "📞", tone: "kp", label: "Calls Logged (recent)", value: String(totalCalls) },
    { icon: "🌐", tone: "kg", label: "Online Ordering Live", value: `${liveOrdering} / ${totalClients}` },
  ];

  return (
    <div className="admin-overview">
      {/* Grid templates live in classes (not inline styles) so the responsive
          media queries in globals.css can take effect on smaller screens.
          Desktop templates are unchanged; these just restore the collapse
          behaviour that inline styles were overriding. The .ap-clients rules
          also keep the admin clients table (which reuses the generic
          .thead/.tr classes) as a horizontal scroll on mobile instead of
          inheriting the bookings-table column hiding. */}
      <style>{`
        /* Seat the "Voxa AI · Monitoring live" status pill comfortably in the
           top-right, slightly smaller, so it clears the "VOXA PLATFORM · ADMIN"
           eyebrow text on every screen size. */
        .admin-overview .hero-status-widget { top: 16px; padding: 8px 14px 8px 10px; }
        .admin-overview .hero-status-name { font-size: 10px; }
        .admin-overview .hero-status-val { font-size: 9px; }

        /* Mobile: shrink the pill and pin it to the very top-right corner.
           left:auto cancels the top-left placement globals.css applies at
           <=640px; the orb core is nudged so the blue dot stays visible at 8px. */
        @media (max-width: 768px) {
          .admin-overview .hero-status-widget {
            top: 8px;
            right: 8px;
            left: auto;
            padding: 4px 8px;
          }
          .admin-overview .hero-status-name,
          .admin-overview .hero-status-val { font-size: 11px; }
          .admin-overview .hsw-orb { width: 8px; height: 8px; }
          .admin-overview .hsw-orb-core { inset: 1px; }
        }

        .ap-health-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media (max-width: 1180px) {
          .ap-health-grid { grid-template-columns: 1fr; }
        }

        .ap-bot-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        @media (max-width: 768px) {
          .ap-bot-grid { grid-template-columns: 1fr; }
        }

        .ap-clients .thead,
        .ap-clients .tr { grid-template-columns: 1.2fr 100px 100px 100px 140px 100px 110px; }
        @media (max-width: 1180px) {
          .ap-clients .thead,
          .ap-clients .tr { min-width: 900px; }
        }
        @media (max-width: 768px) {
          .ap-clients .thead .th:nth-child(1),
          .ap-clients .tr > .td:nth-child(1),
          .ap-clients .thead .th:nth-child(6),
          .ap-clients .tr > .td:nth-child(6) { display: block; }
        }

        /* Voxa AI Brain — on mobile the fixed 280px brain column crushes the
           activity column and the tall min-height leaves a big padded gap, so
           stack the two and trim the vertical padding. Scoped to this admin
           page; desktop and other pages are untouched. */
        @media (max-width: 768px) {
          .admin-overview .rp-top { grid-template-columns: 1fr; min-height: 0; }
          .admin-overview .brain-col {
            border-right: none;
            border-bottom: 1px solid var(--b1);
            padding: 16px 20px;
          }
          .admin-overview .activity-col { padding: 16px 22px; }
        }
      `}</style>

      <Hero
        eyebrow="Voxa Platform · Admin"
        headline="Every client."
        headlineEm="One view."
        statusLabel="Voxa AI"
        statusValue="Monitoring live"
        tickerItems={tickerItems.map((t) => t.text)}
        stats={[
          { value: String(totalClients), label: "Clients", tone: "b" },
          { value: `${healthyCount}/${totalClients}`, label: "Voice Agents", tone: "g" },
          { value: String(totalCalls), label: "Calls Logged", tone: "p" },
        ]}
        scene={
          <AdminHeroScene
            healthyCount={healthyCount}
            totalClients={totalClients}
            totalCalls={totalCalls}
          />
        }
      />

      <KpiGrid tiles={tiles} />

      <VoxaBrain activity={activity} tickerItems={tickerItems} brainLabel="VOXA AI BRAIN" />

      <div style={{ marginBottom: 20 }} id="health">
        <div className="ot-hdr">
          <div>
            <div className="ot-title">System Health</div>
            <div className="ot-sub">Live status of the services powering every client</div>
          </div>
        </div>
        <div className="fleet-grid ap-health-grid">
          {healthRows.map((h) => (
            <div key={h.service} className="card">
              <div className="ch">
                <div>
                  <div className="ct" style={{ textTransform: "capitalize" }}>{h.service}</div>
                  <div className="cs">{h.detail}</div>
                </div>
                <span className={`badge ${!h.configured ? "r" : h.healthy ? "g" : "a"}`}>
                  {!h.configured ? "Not connected" : h.headline}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className="pulse-dot"
                  style={{ background: !h.configured ? "var(--red)" : h.healthy ? "var(--green)" : "var(--amber)" }}
                />
                <span style={{ fontSize: 11, color: "var(--t2)" }}>
                  {!h.configured ? "Add credentials in Vercel to activate" : h.healthy ? "Operating normally" : "Needs attention"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="ot-hdr">
          <div>
            <div className="ot-title">All Clients</div>
            <div className="ot-sub">Platform-wide · nothing here is visible to any client</div>
          </div>
        </div>
        <div className="ot ap-clients">
          <div className="thead">
            <div className="th">Client</div>
            <div className="th">Industry</div>
            <div className="th">Plan</div>
            <div className="th">Status</div>
            <div className="th">Voice Agent</div>
            <div className="th">Orders</div>
            <div className="th"></div>
          </div>
          {clientRows.map((row) => (
            <div key={row.id} className="tr">
              <div className="td br">{row.name}</div>
              <div className="td" style={{ textTransform: "capitalize" }}>{row.industry}</div>
              <div className="td mn" style={{ textTransform: "uppercase" }}>{row.plan_tier}</div>
              <div className="td">
                <span className={`chip ${row.online_ordering_enabled ? "cd" : "ca"}`}>
                  {row.online_ordering_enabled ? "Live" : "Disabled"}
                </span>
              </div>
              <div className="td">
                <span className={`chip ${row.healthy ? "cd" : "ca"}`}>
                  {row.healthy ? "Active" : "No recent calls"}
                </span>
              </div>
              <div className="td">{ordersByProject[row.dataProject]}</div>
              <div className="td" style={{ display: "flex", gap: 6 }}>
                {row.slug?.trim() ? (
                  <button
                    type="button"
                    className="btn"
                    style={{ textDecoration: "none" }}
                    disabled={isPending}
                    onClick={() => navigate(`/${row.slug}`)}
                  >
                    {isPending && pendingHref === `/${row.slug}` ? "Loading…" : "View"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn p"
                  style={{ textDecoration: "none" }}
                  disabled={isPending}
                  onClick={() => navigate(`/admin/clients/${row.slug}`)}
                >
                  {isPending && pendingHref === `/admin/clients/${row.slug}` ? "Loading…" : "Manage"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bot ap-bot-grid">
        <div className="card">
          <div className="ch">
            <div>
              <div className="ct">Client Status Breakdown</div>
              <div className="cs">Live snapshot</div>
            </div>
          </div>
          <div className="rev-stat">
            <span className="rev-label">Open now</span>
            <span className="rev-val a">{openNow} / {totalClients}</span>
          </div>
          <div className="rev-stat">
            <span className="rev-label">Online ordering enabled</span>
            <span className="rev-val a">{liveOrdering} / {totalClients}</span>
          </div>
          <div className="rev-stat">
            <span className="rev-label">Voice agent healthy</span>
            <span className="rev-val a">{healthyCount} / {totalClients}</span>
          </div>
        </div>

        <div className="card">
          <div className="ch">
            <div>
              <div className="ct">AI Insights</div>
              <div className="cs">Generated from live data</div>
            </div>
          </div>
          {healthyCount < totalClients && totalClients > 0 && (
            <div className="ins">
              <div className="ins-ic">⚠️</div>
              <div className="ins-tx">
                <strong>{totalClients - healthyCount}</strong> client(s) have no calls logged in the last 30 days — worth a check-in.
              </div>
            </div>
          )}
          {totalCalls > 0 && (
            <div className="ins">
              <div className="ins-ic">📞</div>
              <div className="ins-tx">
                <strong>{totalCalls}</strong> total calls logged across the platform, recent window.
              </div>
            </div>
          )}
          {totalClients === 0 && (
            <div className="ins">
              <div className="ins-ic">🧠</div>
              <div className="ins-tx">No clients onboarded yet.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

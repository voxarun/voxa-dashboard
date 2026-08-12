import { notFound } from "next/navigation";
import { getClientBySlug, getRecentOrders, getRecentCallLogs, getClientStats } from "@/lib/dashboard-data";
import { getDataProjectPublicConfig } from "@/lib/data-projects";
import { ChartsSection } from "@/components/shell/ChartsSection";
import { KpiGrid, type KpiTile } from "@/components/shell/KpiGrid";

/**
 * Analytics screen. The 7-day volume chart and status donut already existed
 * on the overview via <ChartsSection> — this page gives them their own route
 * (per the scoping doc, the sidebar "Analytics" link was disabled even though
 * this existed one scroll away) and adds the insight numbers that previously
 * had no dedicated home: conversion rate, hours saved, answer rate, avg call
 * length — all already computed in getClientStats, just not surfaced here.
 */
export default async function AnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const isTaxi = client.data_project === "taxi";
  const [{ rows, error }, { rows: callRows }, stats] = await Promise.all([
    getRecentOrders(client, 200),
    getRecentCallLogs(client, 200),
    getClientStats(client),
  ]);
  const rt = getDataProjectPublicConfig(client.data_project);

  if (error) {
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgba(255,68,68,0.3)", color: "var(--red)" }}>
        Couldn&apos;t load analytics: {error}
      </div>
    );
  }

  const tiles: KpiTile[] = [
    {
      icon: "🎯",
      tone: "kg",
      label: "Call → " + (isTaxi ? "Booking" : "Order") + " Conversion",
      value: `${stats.conversionPct}%`,
      sub: `${stats.totalJobs} from ${stats.totalCalls} calls`,
    },
    { icon: "☎️", tone: "kb", label: "Answer Rate", value: `${stats.answerRatePct}%`, sub: `${stats.missedCalls} missed of ${stats.totalCalls}` },
    { icon: "⏱️", tone: "ka", label: "Avg Call Length", value: stats.avgCallSec ? `${Math.round(stats.avgCallSec / 60)}m ${stats.avgCallSec % 60}s` : "—" },
    { icon: "🕐", tone: "kp", label: "Hours Saved", value: `${stats.hoursSaved.toFixed(1)}h`, sub: "Measured AI talk time" },
  ];

  return (
    <div>
      <KpiGrid tiles={tiles} />
      <div style={{ marginTop: 20 }}>
        <ChartsSection
          initialRows={rows}
          initialCallRows={callRows}
          isTaxi={isTaxi}
          nowMs={Date.now()}
          supabaseUrl={rt.url}
          supabaseAnonKey={rt.anonKey}
          ordersTable={rt.table}
        />
      </div>
    </div>
  );
}

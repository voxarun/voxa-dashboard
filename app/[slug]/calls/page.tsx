import { notFound } from "next/navigation";
import { getClientBySlug, getRecentCallLogs } from "@/lib/dashboard-data";
import { getDataProjectPublicConfig } from "@/lib/data-projects";
import { CallLogsScreen } from "@/components/shell/CallLogsScreen";

/**
 * Full Call Logs screen. Unlike the overview's Live Call Feed (capped at 200
 * rows, no filtering) this loads the whole call history so the Answered/
 * Missed pills show real totals, same treatment already given to Orders.
 */
export default async function CallsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const { rows, error } = await getRecentCallLogs(client, 2000);
  const rt = getDataProjectPublicConfig(client.data_project);

  if (error) {
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgba(255,68,68,0.3)", color: "var(--red)" }}>
        Couldn&apos;t load call logs: {error}
      </div>
    );
  }

  return <CallLogsScreen initialCalls={rows} supabaseUrl={rt.url} supabaseAnonKey={rt.anonKey} />;
}

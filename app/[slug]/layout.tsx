import { notFound } from "next/navigation";
import { getClientBySlug, getRecentOrders, summarizeOrders } from "@/lib/dashboard-data";
import { Sidebar } from "@/components/shell/Sidebar";
import { LogoutButton } from "@/components/LogoutButton";
import { Topbar } from "@/components/shell/Topbar";
import { industryVars } from "@/lib/color";
import type { NavSection } from "@/components/shell/types";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const isTaxi = client.data_project === "taxi";
  const { rows } = await getRecentOrders(client, 50);
  const { newCount } = summarizeOrders(rows, client);

  const sections: NavSection[] = [
    {
      title: "Overview",
      items: [
        { icon: "⚡", label: "Command Centre", href: `/${slug}#top`, active: true },
        { icon: "📊", label: "Analytics", disabled: true },
        { icon: "💰", label: isTaxi ? "Booking Mix" : "Revenue", href: `/${slug}#dispatch` },
      ],
    },
    {
      title: "Operations",
      items: [
        { icon: "📋", label: isTaxi ? "Bookings" : "Orders", href: `/${slug}#bookings`, badge: newCount ? String(newCount) : undefined },
        { icon: "📞", label: "Call Logs", disabled: true },
        { icon: isTaxi ? "🚗" : "🍽️", label: isTaxi ? "Fleet Live" : "Kitchen", href: isTaxi ? `/${slug}#fleet` : `/${slug}/chef` },
        { icon: "🛵", label: isTaxi ? "Drivers" : "Delivery", href: `/${slug}/driver` },
      ],
    },
    {
      title: "Intelligence",
      items: [
        { icon: "🧠", label: "AI Insights", href: `/${slug}#dispatch` },
        { icon: "🗺️", label: "Zone Heatmap", disabled: true },
        { icon: "⭐", label: "Reviews", disabled: true },
      ],
    },
    {
      title: "System",
      items: [
        { icon: "🤖", label: "AI Agents", disabled: true },
        { icon: "🔔", label: "Notifications", disabled: true },
        { icon: "⚙️", label: "Settings", disabled: true },
      ],
    },
  ];

  return (
    <div className="dashboard-root" style={industryVars(client.brand_color || "#0094ff")}>
      <Sidebar
        clientTag="Active client"
        clientName={client.name}
        planLabel={`⭐ ${client.plan_tier.charAt(0).toUpperCase()}${client.plan_tier.slice(1)} Plan`}
        mobileTitle={`${client.name} · Command Centre`}
        sections={sections}
        logoutSlot={<LogoutButton />}
        homeHref={`/${slug}`}
      />
      <div className="main">
        <Topbar title={`${client.name} · Command Centre`} avatarInitial={client.name.charAt(0).toUpperCase()} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

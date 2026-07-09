import { LogoutButton } from "@/components/LogoutButton";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import type { NavSection } from "@/components/shell/types";

const ADMIN_INDUSTRY_VARS: React.CSSProperties = {
  ["--industry" as string]: "#9c6bff",
  ["--industry2" as string]: "#c4a6ff",
  ["--industry-bg" as string]: "rgba(156,107,255,0.08)",
  ["--industry-border" as string]: "rgba(156,107,255,0.2)",
};

const sections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { icon: "⚡", label: "All Clients", href: "/admin", active: true },
      { icon: "➕", label: "Add New Client", href: "/admin/new-client" },
    ],
  },
  {
    title: "Platform",
    items: [
      { icon: "🩺", label: "System Health", href: "/admin#health" },
      { icon: "📈", label: "Billing", disabled: true },
      { icon: "🚨", label: "Alerts", disabled: true },
    ],
  },
  {
    title: "System",
    items: [
      { icon: "🔌", label: "Integrations", disabled: true },
      { icon: "⚙️", label: "Settings", disabled: true },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-root" style={ADMIN_INDUSTRY_VARS}>
      <Sidebar
        clientTag="Internal"
        clientName="Voxa Admin"
        planLabel="Not client-visible"
        mobileTitle="Voxa Admin"
        sections={sections}
        logoutSlot={<LogoutButton />}
        homeHref="/admin"
      />
      <div className="main">
        <Topbar title="Voxa Admin · Platform Overview" avatarInitial="V" />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

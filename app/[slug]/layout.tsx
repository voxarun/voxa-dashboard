import { notFound } from "next/navigation";
import { getClientBySlug } from "@/lib/dashboard-data";
import { Sidebar } from "@/components/Sidebar";

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

  const links = [
    { href: `/${slug}`, label: "Overview" },
    { href: `/${slug}/chef`, label: client.industry === "taxi" ? "Dispatch" : "Kitchen" },
    { href: `/${slug}/driver`, label: client.industry === "taxi" ? "Drivers" : "Delivery" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar clientName={client.name} planTier={client.plan_tier} links={links} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside
        className="flex h-screen w-[220px] flex-shrink-0 flex-col border-r"
        style={{ borderColor: "var(--b1)", background: "rgba(2,5,14,0.98)" }}
      >
        <div className="flex items-center gap-2.5 border-b px-4 py-4" style={{ borderColor: "var(--b1)" }}>
          <div
            className="h-7 w-7 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #0094ff, #00e5ff)",
              clipPath: "polygon(50% 0%, 100% 28%, 82% 100%, 50% 76%, 18% 100%, 0% 28%)",
            }}
          />
          <div>
            <div className="text-[15px] font-extrabold leading-tight tracking-tight">Voxa Admin</div>
            <div className="text-[10px]" style={{ color: "var(--t3)" }}>Internal — not client-visible</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-2.5 py-3">
          <Link href="/admin" className="block rounded-lg px-3 py-2 text-[13px] font-medium" style={{ color: "var(--t2)" }}>
            All Clients
          </Link>
          <Link href="/admin/new-client" className="block rounded-lg px-3 py-2 text-[13px] font-medium" style={{ color: "var(--t2)" }}>
            + Add New Client
          </Link>
        </nav>

        <div className="border-t p-3" style={{ borderColor: "var(--b1)" }}>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

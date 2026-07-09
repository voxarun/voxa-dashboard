import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function Sidebar({
  clientName,
  planTier,
  links,
}: {
  clientName: string;
  planTier?: string;
  links: { href: string; label: string }[];
}) {
  return (
    <aside
      className="flex h-screen w-[210px] flex-shrink-0 flex-col border-r"
      style={{ borderColor: "var(--b1)", background: "rgba(2,5,14,0.98)" }}
    >
      <div className="flex items-center gap-2.5 border-b px-4 py-4" style={{ borderColor: "var(--b1)" }}>
        <div
          className="h-7 w-7 flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #0050cc, #0094ff, #00e5ff)",
            clipPath: "polygon(50% 0%, 100% 28%, 82% 100%, 50% 76%, 18% 100%, 0% 28%)",
          }}
        />
        <span className="text-[15px] font-extrabold tracking-tight">Voxa</span>
      </div>

      <div className="m-3 rounded-xl border px-3 py-2.5" style={{ borderColor: "rgba(0,148,255,0.16)", background: "rgba(0,148,255,0.06)" }}>
        <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--t3)" }}>
          Client
        </div>
        <div className="text-[13px] font-semibold">{clientName}</div>
        {planTier && (
          <div className="mt-0.5 text-[10px] font-semibold uppercase" style={{ color: "var(--cyan)" }}>
            {planTier}
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2.5">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-lg px-3 py-2 text-[13px] font-medium"
            style={{ color: "var(--t2)" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="border-t p-3" style={{ borderColor: "var(--b1)" }}>
        <LogoutButton />
      </div>
    </aside>
  );
}

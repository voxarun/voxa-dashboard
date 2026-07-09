export function KpiCard({
  label,
  value,
  sub,
  accent = "var(--blue2)",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--b1)", background: "var(--s1)" }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-extrabold" style={{ color: accent }}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs" style={{ color: "var(--t2)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

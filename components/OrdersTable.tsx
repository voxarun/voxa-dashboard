type Row = Record<string, unknown>;

export function OrdersTable({ rows, isTaxi }: { rows: Row[]; isTaxi: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border p-8 text-center text-sm" style={{ borderColor: "var(--b1)", color: "var(--t2)" }}>
        No {isTaxi ? "bookings" : "orders"} yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--b1)" }}>
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr style={{ background: "var(--s2)" }}>
            <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>Customer</th>
            <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>{isTaxi ? "Pickup" : "Type"}</th>
            <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>Source</th>
            <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>Status</th>
            <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>{isTaxi ? "" : "Total"}</th>
            <th className="px-4 py-2.5 font-semibold" style={{ color: "var(--t3)" }}>When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.id)} className="border-t" style={{ borderColor: "var(--b1)" }}>
              <td className="px-4 py-2.5">{String(r.customer_name ?? "—")}</td>
              <td className="px-4 py-2.5">{isTaxi ? String(r.pickup_address ?? "—") : String(r.order_type ?? "—")}</td>
              <td className="px-4 py-2.5">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: r.source === "online" ? "rgba(0,230,118,0.12)" : "rgba(0,148,255,0.12)",
                    color: r.source === "online" ? "var(--green)" : "var(--blue2)",
                  }}
                >
                  {String(r.source ?? "vapi")}
                </span>
              </td>
              <td className="px-4 py-2.5">{String(r.status ?? "new")}</td>
              <td className="px-4 py-2.5">{isTaxi ? "" : `£${r.total ?? "0.00"}`}</td>
              <td className="px-4 py-2.5" style={{ color: "var(--t2)" }}>
                {r.created_at ? new Date(String(r.created_at)).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

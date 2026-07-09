type Row = Record<string, unknown>;

export function AgentsGrid({
  rows,
  callHealthy,
  isTaxi,
}: {
  rows: Row[];
  callHealthy: boolean;
  isTaxi: boolean;
}) {
  const total = rows.length;
  const online = rows.filter((r) => r.source === "online").length;
  const actioned = rows.filter((r) => r.status !== "new").length;
  const onlinePct = total ? Math.round((online / total) * 100) : 0;
  const actionedPct = total ? Math.round((actioned / total) * 100) : 0;

  const agents = [
    {
      name: "Voice",
      tag: "Calls",
      pct: callHealthy ? 100 : 0,
      label: callHealthy ? "Active" : "Idle",
    },
    {
      name: "Web",
      tag: isTaxi ? "Bookings" : "Orders",
      pct: onlinePct,
      label: `${onlinePct}% online`,
    },
    {
      name: "Ops",
      tag: "Actioned",
      pct: actionedPct,
      label: `${actionedPct}% handled`,
    },
    {
      name: "Data",
      tag: "Records",
      pct: total ? 100 : 0,
      label: `${total} logged`,
    },
  ];

  return (
    <div className="card">
      <div className="ch">
        <div>
          <div className="ct">🤖 AI Agents</div>
          <div className="cs">Real signals from live data</div>
        </div>
        <span className={`badge ${callHealthy ? "g" : "b"}`}>{callHealthy ? "All Online" : "Voice Idle"}</span>
      </div>
      <div className="ag-grid">
        {agents.map((a) => (
          <div key={a.name} className="ag">
            <div className="ag-n">{a.name}</div>
            <div className="ag-t">{a.tag}</div>
            <div className="ag-bar">
              <div className="ag-fill" style={{ width: `${a.pct}%` }} />
            </div>
            <div className="ag-p">{a.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

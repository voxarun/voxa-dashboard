const TIERS = [
  {
    key: "basic",
    tier: "Tier 1",
    name: "Basic",
    price: "£149",
    feats: [
      { text: "AI voice agent — 24/7", on: true },
      { text: "Calls & orders dashboard", on: true },
      { text: "7-day order history", on: true },
      { text: "Receipt printing", on: true },
      { text: "SMS to customer", on: true },
      { text: "Analytics & charts", on: false },
      { text: "Chef & driver dashboards", on: false },
      { text: "AI insights", on: false },
    ],
  },
  {
    key: "pro",
    tier: "Tier 2",
    name: "Pro",
    price: "£299",
    popular: true,
    feats: [
      { text: "Everything in Basic", on: true },
      { text: "Full KPI dashboard", on: true },
      { text: "30-day order history", on: true },
      { text: "Chef dashboard", on: true },
      { text: "Driver dashboard", on: true },
      { text: "SMS to owner & chef", on: true },
      { text: "Live call feed", on: true },
      { text: "AI insights", on: false },
      { text: "Heatmaps & forecasting", on: false },
    ],
  },
  {
    key: "empire",
    tier: "Tier 3",
    name: "Empire",
    price: "£499",
    empire: true,
    feats: [
      { text: "Everything in Pro", on: true },
      { text: "🧠 AI insights & recommendations", on: true },
      { text: "Revenue forecasting", on: true },
      { text: "Peak hour heatmaps", on: true },
      { text: "Customer behaviour analytics", on: true },
      { text: "Outbound missed-call AI", on: true },
      { text: "Auto Google review requests", on: true },
      { text: "Multi-location support", on: true },
      { text: "White-label branding", on: true },
    ],
  },
];

export function PlansSection({ currentTier }: { currentTier: string }) {
  const current = (currentTier || "").toLowerCase();
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Mobile: stack the plan cards into a single column and make them more
          compact (reduced padding). Desktop layout is unchanged. */}
      <style>{`
        @media (max-width: 768px) {
          .plans { grid-template-columns: 1fr; }
          .plans .plan { padding: 14px; }
        }
      `}</style>
      <div className="ot-hdr">
        <div>
          <div className="ot-title">Your Plan</div>
          <div className="ot-sub">Billing is managed by Voxa — contact us to change tier</div>
        </div>
      </div>
      <div className="plans">
        {TIERS.map((t) => (
          <div key={t.key} className={`plan ${t.popular ? "pop" : ""} ${t.empire ? "emp" : ""}`}>
            {current === t.key ? (
              <span className="pl-badge" style={{ background: "var(--green)", color: "#000" }}>
                Current Plan
              </span>
            ) : t.popular ? (
              <span className="pl-badge plb-pop">Most Popular</span>
            ) : t.empire ? (
              <span className="pl-badge plb-emp">Empire</span>
            ) : null}
            <div className="pl-tier">{t.tier}</div>
            <div className="pl-name">{t.name}</div>
            <div className="pl-price">
              {t.price}
              <span>/mo</span>
            </div>
            <div className="pl-div" />
            <div className="pl-feats">
              {t.feats.map((f, i) => (
                <div key={i} className={`pf ${f.on ? "" : "off"}`}>
                  {f.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

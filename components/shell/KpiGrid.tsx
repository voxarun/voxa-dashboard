import AnimatedNumber from "./AnimatedNumber";

export type KpiTile = {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  tone: "ka" | "kg" | "kb" | "kr" | "kp";
};

export function KpiGrid({ tiles }: { tiles: KpiTile[] }) {
  return (
    <div className="kpi-grid">
      {tiles.map((t) => (
        <div key={t.label} className={`kpi ${t.tone}`}>
          <div className="kpi-row">
            <div className={`kpi-ico ${t.tone}`}>{t.icon}</div>
          </div>
          {/* Fraction-style values ("3 / 5") aren't safe to feed through the
              digit-count-up animation — it strips non-digits and would
              concatenate both numbers into one. Render those as static text. */}
          {t.value.includes("/") ? (
            <div className="kpi-val an">{t.value}</div>
          ) : (
            <AnimatedNumber value={t.value} className="kpi-val an" />
          )}
          <div className="kpi-lbl">{t.label}</div>
          {t.sub && <div className="kpi-sub">{t.sub}</div>}
        </div>
      ))}
    </div>
  );
}

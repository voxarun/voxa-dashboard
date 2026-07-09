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
          <AnimatedNumber value={t.value} className="kpi-val an" />
          <div className="kpi-lbl">{t.label}</div>
          {t.sub && <div className="kpi-sub">{t.sub}</div>}
        </div>
      ))}
    </div>
  );
}

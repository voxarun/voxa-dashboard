export function AdminHeroScene({
  healthyCount,
  totalClients,
  totalCalls,
}: {
  healthyCount: number;
  totalClients: number;
  totalCalls: number;
}) {
  const barHeights = [40, 70, 55, 90, 65, 100, 48];

  return (
    <div className="ahs">
      <div className="ahs-rays" />
      <div className="ahs-orbit ahs-orbit-2">
        <span className="ahs-orbit-dot" />
      </div>
      <div className="ahs-orbit ahs-orbit-1">
        <span className="ahs-orbit-dot" />
      </div>

      <div className="ahs-sphere">
        <div className="ahs-sphere-halo" />
        <div className="ahs-sphere-shell" />
        <svg className="ahs-branches" viewBox="0 0 220 220">
          <path d="M110,110 C100,90 90,60 80,40" />
          <path d="M110,110 C125,85 140,55 150,35" />
          <path d="M110,110 C90,120 60,130 35,140" />
          <path d="M110,110 C130,125 155,140 175,155" />
          <path d="M110,110 C105,130 95,155 85,180" />
          <path d="M110,110 C120,135 130,160 145,185" />
          <path d="M110,110 C85,105 55,100 30,95" />
          <path d="M110,110 C135,100 165,95 190,90" />
          {[
            [80, 40],
            [150, 35],
            [35, 140],
            [175, 155],
            [85, 180],
            [145, 185],
            [30, 95],
            [190, 90],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={1.8} />
          ))}
        </svg>
        <div className="ahs-sphere-core" />
      </div>

      <div className="ahs-panel ahs-panel-l">
        <div className="ahs-panel-lbl">Voice Agents Live</div>
        <div className="ahs-panel-val">
          {healthyCount}/{totalClients}
        </div>
        <div className="ahs-mini-bars">
          {barHeights.map((h, i) => (
            <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>

      <div className="ahs-panel ahs-panel-r">
        <div className="ahs-panel-lbl">Calls Handled</div>
        <div className="ahs-panel-val">{totalCalls}</div>
        <div className="ahs-mini-line">
          <svg viewBox="0 0 140 26" preserveAspectRatio="none">
            <path d="M0,20 L18,14 L36,17 L54,8 L72,12 L90,4 L108,9 L126,2 L140,6" />
          </svg>
        </div>
      </div>

      <div className="ahs-base">
        <div className="ahs-base-ring b1" />
        <div className="ahs-base-ring b2" />
        <div className="ahs-base-ring b3" />
      </div>
    </div>
  );
}

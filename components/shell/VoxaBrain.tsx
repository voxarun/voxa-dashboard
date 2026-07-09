type ActivityItem = {
  client: string;
  what: string;
  how: string;
  when: string;
  color: string;
};

export function VoxaBrain({
  activity,
  tickerItems,
  brainLabel,
  activityHeading = "Live Activity Across All Clients",
}: {
  activity: ActivityItem[];
  tickerItems: { text: string; color: string }[];
  brainLabel: string;
  activityHeading?: string;
}) {
  return (
    <div className="running-panel">
      <div className="rp-top">
        <div className="brain-col">
          <div className="brain-glow-bg" />
          <div className="orb">
            <div className="orb-r1" />
            <div className="orb-r2" />
            <div className="orb-r3" />
            <div className="orb-core-el" />
            <div className="orb-ctr">
              <div className="orb-dot" />
            </div>
          </div>
          <div className="brain-label">{brainLabel}</div>
          <div className="brain-sub">UNDERSTAND · DECIDE · ACT</div>
          <div className="brain-live">
            <div className="bl-dot" />
            <span className="bl-txt">Voxa Brain live</span>
          </div>
        </div>

        <div className="activity-col">
          <div className="ac-head">{activityHeading}</div>
          <div className="activity-list">
            {activity.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--t3)" }}>No activity yet — the feed fills in as calls come in.</div>
            )}
            {activity.map((a, i) => (
              <div key={i} className="act-item">
                <div className="act-timeline">
                  <div className="act-circle" style={{ background: a.color }} />
                  {i < activity.length - 1 && <div className="act-line" />}
                </div>
                <div className="act-body">
                  <div className="act-what">{a.what}</div>
                  <div className="act-how">
                    {a.client} · {a.how}
                  </div>
                  <div className="act-when">{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {tickerItems.length > 0 && (
        <div className="rp-ticker">
          <div className="ticker-label">Live</div>
          <div className="ticker-scroll">
            <div className="ticker-inner">
              {[...tickerItems, ...tickerItems].map((t, i) => (
                <span key={i} className="tk-ev">
                  <span className="tk-dot" style={{ background: t.color }} />
                  {t.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

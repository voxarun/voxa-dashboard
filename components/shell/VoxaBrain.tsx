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
      {/* Mobile: the desktop .rp-top is a fixed 280px brain column + 1fr, which
          crushes the activity column on small screens. Below 768px, stack the
          two into a single column and trim the excess vertical padding. Scoped
          to .running-panel; desktop layout is unchanged. */}
      <style>{`
        /* Compact sizing overrides — scoped to .running-panel and sizes/padding
           only (no colour or behaviour changes). These are two-class selectors so
           they win over the single-class base rules in globals.css. The orb is
           shrunk 120px -> 90px with its ring insets scaled proportionally
           (0.125 / 0.233 / 0.3 of the diameter) so the animation keeps its shape. */
        /* Compact: the panel used to grow with the feed and swallow the page.
           The activity list is now capped and scrolls instead. */
        .running-panel .rp-top { min-height: 0; }
        .running-panel .brain-col { padding: 14px 18px; }
        .running-panel .brain-label { margin-top: 8px; font-size: 12px; }
        .running-panel .brain-sub { font-size: 9px; }
        .running-panel .orb { width: 68px; height: 68px; }
        .running-panel .orb-r2 { inset: 8px; }
        .running-panel .orb-r3 { inset: 16px; }
        .running-panel .orb-core-el { inset: 20px; }
        .running-panel .activity-col { padding: 12px 18px; }
        .running-panel .ac-head { margin-bottom: 8px; }
        .running-panel .act-body { padding-bottom: 8px; }

        /* Scroll the feed rather than letting it stretch the card. */
        .running-panel .activity-list {
          max-height: 230px;
          overflow-y: auto;
          padding-right: 6px;
        }
        .running-panel .activity-list::-webkit-scrollbar { width: 5px; }
        .running-panel .activity-list::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 100px;
        }
        .running-panel .act-what { font-size: 12.5px; }
        .running-panel .act-how { font-size: 11px; }
        .running-panel .act-when { font-size: 10px; }

        @media (max-width: 768px) {
          .running-panel .rp-top { grid-template-columns: 1fr; min-height: 0; }
          .running-panel .brain-col {
            border-right: none;
            border-bottom: 1px solid var(--b1);
            padding: 16px 20px;
          }
          .running-panel .activity-col { padding: 16px 22px; }
        }
      `}</style>
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

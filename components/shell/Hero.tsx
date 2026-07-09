"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type HeroStat = {
  value: string;
  label: string;
  tone?: "a" | "g" | "b" | "p";
};

export function Hero({
  eyebrow,
  headline,
  headlineEm,
  statusLabel = "Voxa AI",
  statusValue = "Live",
  tickerItems,
  backgroundImage,
  stats,
  scene,
}: {
  eyebrow: string;
  headline: string;
  headlineEm: string;
  statusLabel?: string;
  statusValue?: string;
  tickerItems: string[];
  backgroundImage?: string;
  stats?: HeroStat[];
  scene?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      const W = (canvas!.width = hero!.offsetWidth);
      const H = (canvas!.height = hero!.offsetHeight);
      ctx!.clearRect(0, 0, W, H);

      const gx = W - 60,
        gy = 60;
      const grd = ctx!.createRadialGradient(gx, gy, 0, gx, gy, H * 0.9);
      grd.addColorStop(0, "rgba(0,148,255,0.10)");
      grd.addColorStop(0.18, "rgba(0,148,255,0.04)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = grd;
      ctx!.fillRect(0, 0, W, H);

      ctx!.lineWidth = 0.4;
      ctx!.strokeStyle = "rgba(0,148,255,0.02)";
      for (let x = 0; x <= W; x += W / 20) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, H);
        ctx!.stroke();
      }
      for (let y = 0; y <= H; y += H / 9) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(W, y);
        ctx!.stroke();
      }
    }

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(hero);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={heroRef}
      className="hero hero-v2"
      id="top"
      style={
        backgroundImage
          ? { backgroundImage: `linear-gradient(rgba(3,6,15,0.74), rgba(3,6,15,0.86)), url("${backgroundImage}")` }
          : undefined
      }
    >
      <canvas ref={canvasRef} className="hero-v2-canvas" />
      {scene && <div className="hero-v2-scene">{scene}</div>}
      <div className="hero-v2-fade" />

      <div className="hero-status-widget">
        <div className="hsw-orb">
          <div className="hsw-orb-ring" />
          <div className="hsw-orb-core" />
        </div>
        <div>
          <div className="hero-status-name">{statusLabel}</div>
          <div className="hero-status-val">{statusValue}</div>
        </div>
      </div>

      <div className="hero-v2-body">
        <div className="hero-v2-greeting">{eyebrow}</div>
        <div className="hero-v2-h1">
          {headline}
          <br />
          <em>{headlineEm}</em>
        </div>
        <div className="hero-v2-pill">
          <div className="bl-dot" />
          <span className="bl-txt">{statusValue}</span>
        </div>

        {stats && stats.length > 0 && (
          <div className="hero-v2-stats">
            {stats.map((s, i) => (
              <div key={i} style={{ display: "contents" }}>
                {i > 0 && <div className="hs-sep" />}
                <div className="hs">
                  <div className={`hs-n an${s.tone ? ` ${s.tone}` : ""}`}>{s.value}</div>
                  <div className="hs-l">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {tickerItems.length > 0 && (
        <div className="hero-v2-ticker">
          <div className="hero-v2-ticker-lbl">Live</div>
          <div className="hero-v2-ticker-scroll">
            <div className="hero-v2-ticker-inner">
              {[...tickerItems, ...tickerItems].map((row, i) => (
                <span key={i} className="hero-v2-tk-ev">
                  {row}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

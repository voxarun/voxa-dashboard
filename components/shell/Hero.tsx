"use client";

import { useEffect, useRef } from "react";

export function Hero({
  eyebrow,
  headline,
  headlineEm,
  statusLabel = "Voxa AI",
  statusValue = "Live",
  tickerItems,
}: {
  eyebrow: string;
  headline: string;
  headlineEm: string;
  statusLabel?: string;
  statusValue?: string;
  tickerItems: string[];
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
    <div ref={heroRef} className="hero hero-v2" id="top">
      <canvas ref={canvasRef} className="hero-v2-canvas" />
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

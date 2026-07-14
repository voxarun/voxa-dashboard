"use client";

import { useEffect, useRef } from "react";

// Ported from the "Neon Rain · Electric Drama · Mount Everest Edition" hero
// concept — tri-colour rain columns with bloom/chromatic glow and splash
// particles. Left-side readability darkening is handled by the shared
// .hero-v2-fade layer in Hero.tsx, so this component only draws the scene.
export function NeonRainScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0,
      H = 0,
      t = 0,
      raf = 0,
      frameCount = 0;

    const COLS = ["#ff00cc", "#00f0ff", "#ffcc00", "#ff6600", "#cc00ff"];
    const GLOW = ["rgba(255,0,200,", "rgba(0,240,255,", "rgba(255,200,0,", "rgba(255,100,0,", "rgba(180,0,255,"];

    type Drop = {
      x: number;
      y: number;
      speed: number;
      len: number;
      ci: number;
      w: number;
      depth: number;
      splashing: boolean;
      splashTimer: number;
      splashParts: { vx: number; vy: number; life: number; x: number; y: number }[];
    };
    let cols: Drop[] = [];

    function init() {
      W = canvas!.width = host!.offsetWidth;
      H = canvas!.height = host!.offsetHeight;
      const cw = 16;
      const numCols = Math.floor((W * 0.7) / cw);
      cols = Array.from({ length: numCols }, (_, i) => ({
        x: W * 0.28 + i * cw + Math.random() * 4,
        y: -Math.random() * H * 1.5,
        speed: 55 + Math.random() * 90,
        len: 22 + Math.random() * 55,
        ci: Math.floor(Math.random() * COLS.length),
        w: 0.8 + Math.random() * 1.4,
        depth: Math.random(),
        splashing: false,
        splashTimer: 0,
        splashParts: [],
      }));
    }

    function draw() {
      ctx!.fillStyle = "rgba(0,0,6,0.16)";
      ctx!.fillRect(0, 0, W, H);

      const gx = W * 0.28;
      ctx!.lineWidth = 0.5;
      for (let i = 0; i < Math.floor((W - gx) / 16); i++) {
        const x = gx + i * 16;
        const gi = i % COLS.length;
        const a = Math.sin(t * 0.3 + i * 0.7) * 0.015 + 0.022;
        ctx!.strokeStyle = GLOW[gi] + a + ")";
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, H);
        ctx!.stroke();
      }
      for (let j = 0; j < 8; j++) {
        const y = j * (H / 8);
        const a = Math.sin(t * 0.25 + j * 0.9) * 0.012 + 0.018;
        ctx!.strokeStyle = "rgba(255,0,200," + a + ")";
        ctx!.beginPath();
        ctx!.moveTo(gx, y);
        ctx!.lineTo(W, y);
        ctx!.stroke();
      }
      for (let i = 0; i < Math.floor((W - gx) / 32); i++) {
        for (let j = 0; j < 8; j++) {
          const x = gx + i * 32;
          const y = j * (H / 8);
          const a = Math.sin(t * 0.6 + i * 0.5 + j * 0.7) * 0.3 + 0.35;
          if (a > 0.15) {
            // No shadowBlur here on purpose: this loop runs up to ~150-200
            // times per frame, and shadowBlur is one of the most expensive
            // Canvas2D operations -- doing it this many times per frame was
            // heavy enough to make the whole hero (and the page load it's
            // part of) feel sluggish/stuck on slower machines. A slightly
            // larger flat dot reads almost identically at this size without
            // the blur pass.
            const ci = cols[i % cols.length]?.ci || 0;
            ctx!.beginPath();
            ctx!.arc(x, y, 1.8, 0, Math.PI * 2);
            ctx!.fillStyle = GLOW[ci] + a + ")";
            ctx!.fill();
          }
        }
      }

      cols.forEach((col) => {
        const brightness = 1 - col.depth * 0.55;
        const alpha = 0.34 + brightness * 0.56;
        const baseCol = COLS[col.ci];
        const glowCol = GLOW[col.ci];

        if (col.depth < 0.3) {
          ctx!.shadowColor = baseCol;
          ctx!.shadowBlur = 12 * brightness;
        }

        const grad = ctx!.createLinearGradient(col.x, col.y, col.x, col.y + col.len);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.3, glowCol + alpha * 0.4 + ")");
        grad.addColorStop(0.85, glowCol + alpha + ")");
        grad.addColorStop(1, "rgba(255,255,255," + alpha * 0.9 + ")");
        ctx!.beginPath();
        ctx!.moveTo(col.x, col.y);
        ctx!.lineTo(col.x, col.y + col.len);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = col.w * (0.5 + brightness * 0.8);
        ctx!.stroke();
        ctx!.shadowBlur = 0;

        const dotA = Math.min(1, alpha * 1.4);
        ctx!.beginPath();
        ctx!.arc(col.x, col.y + col.len, col.w * 0.9 * brightness, 0, Math.PI * 2);
        ctx!.fillStyle = glowCol + dotA + ")";
        ctx!.shadowColor = baseCol;
        ctx!.shadowBlur = 8 * brightness;
        ctx!.fill();
        ctx!.shadowBlur = 0;

        if (col.y + col.len >= H - 34 && !col.splashing) {
          col.splashing = true;
          col.splashTimer = 0;
          col.splashParts = Array.from({ length: 5 }, () => ({
            vx: (Math.random() - 0.5) * 3,
            vy: -(Math.random() * 2.5 + 1),
            life: 1,
            x: col.x,
            y: H - 34,
          }));
        }
        if (col.splashing) {
          col.splashTimer += 0.016;
          col.splashParts.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.life -= 0.07;
            if (p.life > 0) {
              ctx!.beginPath();
              ctx!.arc(p.x, p.y, 0.8, 0, Math.PI * 2);
              ctx!.fillStyle = glowCol + p.life * alpha * 0.8 + ")";
              ctx!.fill();
            }
          });
          if (col.splashTimer > 0.4) col.splashing = false;
        }

        col.y += col.speed * 0.016;
        if (col.y > H + 10) {
          col.y = -col.len - Math.random() * H * 0.8;
          col.ci = Math.floor(Math.random() * COLS.length);
          col.speed = 55 + Math.random() * 90;
          col.splashing = false;
        }
      });

      // These 5 full-canvas radial-gradient fills are the most expensive
      // part of this scene (each is a full fillRect at canvas resolution).
      // They change slowly (a slow sine pulse), so redrawing them every
      // frame is wasted work that can starve the main thread during page
      // load/hydration on slower machines. Throttling to every 3rd frame
      // is visually imperceptible but cuts this scene's per-frame canvas
      // cost roughly 3x on the heaviest part of the draw.
      frameCount++;
      if (frameCount % 3 === 0) {
        ([
          [0.42, 0.35, "rgba(255,0,200,", 0.13],
          [0.65, 0.6, "rgba(0,240,255,", 0.11],
          [0.85, 0.2, "rgba(255,200,0,", 0.1],
          [0.55, 0.85, "rgba(180,0,255,", 0.08],
          [0.95, 0.7, "rgba(255,100,0,", 0.07],
        ] as [number, number, string, number][]).forEach(([ex, ey, col, a]) => {
          const pulse = a + Math.sin(t * 0.4 + ex * 5) * 0.03;
          const g = ctx!.createRadialGradient(W * ex, H * ey, 0, W * ex, H * ey, H * 0.7);
          g.addColorStop(0, col + pulse + ")");
          g.addColorStop(1, col + "0)");
          ctx!.fillStyle = g;
          ctx!.fillRect(0, 0, W, H);
        });
      }

      t += 0.032; // larger delta keeps the pulse speed ~the same at the 30fps cap
    }

    // Cap the loop at ~30fps. At the full display refresh this scene (grid dots,
    // per-column gradients + glow, splash particles) was heavy enough to
    // intermittently saturate the main thread while the page was still
    // hydrating on load — the "sometimes loads, sometimes hangs" symptom.
    // 30fps roughly halves the per-frame cost and reads the same here.
    let lastFrame = 0;
    const FRAME_MS = 1000 / 30;
    function frame(nowMs: number) {
      raf = requestAnimationFrame(frame);
      if (nowMs - lastFrame < FRAME_MS) return;
      lastFrame = nowMs;
      draw();
    }

    init();
    const ro = new ResizeObserver(init);
    ro.observe(host);
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      draw(); // honour reduced-motion: one static frame, no animation loop
    } else {
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

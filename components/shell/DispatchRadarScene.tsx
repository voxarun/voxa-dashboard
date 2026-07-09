"use client";

import { useEffect, useRef } from "react";

// Ported from the "Dispatch Radar · Control Room · Mount Everest Edition"
// hero concept — dual rotating radar sweeps, lingering booking blips, moving
// car dots and a starfield. Left-side readability darkening is handled by
// the shared .hero-v2-fade layer in Hero.tsx.
export function DispatchRadarScene() {
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

    // The 3 ambient radial-gradient glows below barely change frame to
    // frame (their only motion is a slow sine pulse), but re-rendering 3
    // full-canvas gradient fills every single frame was heavy enough to
    // compete with page hydration on load and make the hero feel stuck on
    // slower machines. They're now painted onto a small offscreen canvas
    // that's refreshed every few frames instead of every frame, and the
    // main draw loop just blits it in one cheap drawImage call.
    const ambientCanvas = document.createElement("canvas");
    const ambientCtx = ambientCanvas.getContext("2d");

    function paintAmbient(cx: number, cy: number, mr: number) {
      if (!ambientCtx) return;
      ambientCtx.clearRect(0, 0, W, H);

      const atm = ambientCtx.createRadialGradient(cx, cy, 0, cx, cy, mr * 2.4);
      atm.addColorStop(0, `rgba(255,140,0,${0.16 + Math.sin(t * 0.3) * 0.03})`);
      atm.addColorStop(0.45, "rgba(180,70,0,0.09)");
      atm.addColorStop(1, "rgba(0,0,0,0)");
      ambientCtx.fillStyle = atm;
      ambientCtx.fillRect(0, 0, W, H);

      const atm2 = ambientCtx.createRadialGradient(W, H * 0.3, 0, W, H * 0.3, W * 0.6);
      atm2.addColorStop(0, "rgba(0,110,220,0.09)");
      atm2.addColorStop(1, "rgba(0,0,0,0)");
      ambientCtx.fillStyle = atm2;
      ambientCtx.fillRect(0, 0, W, H);

      const atm3 = ambientCtx.createRadialGradient(W * 0.35, H * 0.85, 0, W * 0.35, H * 0.85, W * 0.4);
      atm3.addColorStop(0, "rgba(0,220,140,0.06)");
      atm3.addColorStop(1, "rgba(0,0,0,0)");
      ambientCtx.fillStyle = atm3;
      ambientCtx.fillRect(0, 0, W, H);
    }

    const BLIPS = [
      { r: 0.32, a: 0.85, label: "Booking", trail: [] as { x: number; y: number; a: number }[] },
      { r: 0.58, a: 2.2, label: "Airport", trail: [] as { x: number; y: number; a: number }[] },
      { r: 0.26, a: 3.6, label: "Booking", trail: [] as { x: number; y: number; a: number }[] },
      { r: 0.47, a: 4.95, label: "Booking", trail: [] as { x: number; y: number; a: number }[] },
      { r: 0.4, a: 1.45, label: "NHS", trail: [] as { x: number; y: number; a: number }[] },
      { r: 0.64, a: 5.55, label: "Booking", trail: [] as { x: number; y: number; a: number }[] },
      { r: 0.22, a: 0.3, label: "Booking", trail: [] as { x: number; y: number; a: number }[] },
      { r: 0.52, a: 3.1, label: "Airport", trail: [] as { x: number; y: number; a: number }[] },
    ];

    const CARS = [
      { a: 0.9, r: 0.35, speed: 0.006, col: "#ffab00" },
      { a: 2.3, r: 0.55, speed: -0.004, col: "#00e5ff" },
      { a: 4.1, r: 0.28, speed: 0.008, col: "#00e676" },
    ];

    let stars: { x: number; y: number; r: number; ph: number; sp: number }[] = [];

    function init() {
      W = canvas!.width = host!.offsetWidth;
      H = canvas!.height = host!.offsetHeight;
      ambientCanvas.width = W;
      ambientCanvas.height = H;
      stars = Array.from({ length: 220 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 0.8 + 0.1,
        ph: Math.random() * Math.PI * 2,
        sp: 0.2 + Math.random() * 0.4,
      }));
    }

    function radarCenter() {
      return { cx: W * 0.6, cy: H * 0.5 };
    }
    function maxR() {
      return Math.min(H * 0.48, W * 0.4);
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = "#010402";
      ctx!.fillRect(0, 0, W, H);

      const { cx, cy } = radarCenter();
      const mr = maxR();

      frameCount++;
      if (frameCount % 5 === 0 || frameCount === 1) paintAmbient(cx, cy, mr);
      if (ambientCtx) ctx!.drawImage(ambientCanvas, 0, 0);

      stars.forEach((s) => {
        const a = (Math.sin(t * s.sp + s.ph) * 0.4 + 0.6) * 0.75;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r * 1.3, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,225,160,${a})`;
        ctx!.fill();
      });

      [0.25, 0.5, 0.75, 1].forEach((f, i) => {
        const pulse = Math.sin(t * 0.5 + i * 0.8) * 0.02;
        ctx!.beginPath();
        ctx!.arc(cx, cy, mr * f, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(255,140,0,${0.05 + f * 0.05 + pulse})`;
        ctx!.lineWidth = f === 1 ? 1 : 0.6;
        ctx!.stroke();
      });

      ctx!.strokeStyle = "rgba(255,140,0,0.06)";
      ctx!.lineWidth = 0.5;
      ctx!.setLineDash([4, 6]);
      ctx!.beginPath();
      ctx!.moveTo(cx - mr, cy);
      ctx!.lineTo(cx + mr, cy);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(cx, cy - mr);
      ctx!.lineTo(cx, cy + mr);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.arc(cx, cy, mr * 0.5, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.setLineDash([]);

      const ang1 = t * 0.7;
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(ang1);
      const sweepSteps = 32;
      for (let i = 0; i < sweepSteps; i++) {
        const a0 = -(i / sweepSteps) * Math.PI * 0.65;
        const a1 = a0 - Math.PI / sweepSteps;
        const fade = 1 - i / sweepSteps;
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.arc(0, 0, mr, a0, a1, true);
        ctx!.closePath();
        ctx!.fillStyle = `rgba(255,171,0,${0.18 * fade * fade})`;
        ctx!.fill();
      }
      ctx!.beginPath();
      ctx!.moveTo(0, 0);
      ctx!.lineTo(mr, 0);
      ctx!.strokeStyle = "rgba(255,210,0,0.7)";
      ctx!.lineWidth = 1.5;
      ctx!.shadowColor = "rgba(255,200,0,0.8)";
      ctx!.shadowBlur = 8;
      ctx!.stroke();
      ctx!.shadowBlur = 0;
      ctx!.restore();

      const ang2 = -t * 0.35 + Math.PI * 0.6;
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(ang2);
      for (let i = 0; i < 20; i++) {
        const a0 = -(i / 20) * Math.PI * 0.4;
        const a1 = a0 - Math.PI / 20;
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.arc(0, 0, mr, a0, a1, true);
        ctx!.closePath();
        ctx!.fillStyle = `rgba(255,100,0,${0.06 * (1 - i / 20)})`;
        ctx!.fill();
      }
      ctx!.restore();

      BLIPS.forEach((b) => {
        const diff = (((b.a - (ang1 % (Math.PI * 2))) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const fade = diff < Math.PI * 0.72 ? Math.pow(1 - diff / (Math.PI * 0.72), 1.4) : 0;

        if (fade > 0.05) {
          const bx = cx + Math.cos(b.a) * mr * b.r;
          const by = cy + Math.sin(b.a) * mr * b.r;
          b.trail.push({ x: bx, y: by, a: fade * 0.4 });
          if (b.trail.length > 8) b.trail.shift();
        }

        b.trail.forEach((p, i) => {
          const ta = p.a * (i / b.trail.length) * 0.5;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,220,0,${ta})`;
          ctx!.fill();
        });

        if (fade > 0.01) {
          const bx = cx + Math.cos(b.a) * mr * b.r;
          const by = cy + Math.sin(b.a) * mr * b.r;

          if (fade > 0.7) {
            const ringR = (1 - fade) * 20;
            ctx!.beginPath();
            ctx!.arc(bx, by, ringR, 0, Math.PI * 2);
            ctx!.strokeStyle = `rgba(255,220,0,${fade * 0.3})`;
            ctx!.lineWidth = 1;
            ctx!.stroke();
          }

          const dotR = 3 + fade * 2;
          ctx!.beginPath();
          ctx!.arc(bx, by, dotR, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,230,0,${Math.min(1, fade * 1.2)})`;
          ctx!.shadowColor = "rgba(255,220,0,0.9)";
          ctx!.shadowBlur = 12 * fade;
          ctx!.fill();
          ctx!.shadowBlur = 0;

          if (fade > 0.3) {
            ctx!.fillStyle = `rgba(255,220,100,${fade * 0.7})`;
            ctx!.font = `500 8px Inter,sans-serif`;
            ctx!.fillText(b.label, bx + 6, by - 4);
          }
        }
      });

      CARS.forEach((car) => {
        car.a += car.speed;
        const cx2 = cx + Math.cos(car.a) * mr * car.r;
        const cy2 = cy + Math.sin(car.a) * mr * car.r;
        ctx!.beginPath();
        ctx!.arc(cx2, cy2, 3, 0, Math.PI * 2);
        ctx!.fillStyle = car.col;
        ctx!.shadowColor = car.col;
        ctx!.shadowBlur = 8;
        ctx!.fill();
        ctx!.shadowBlur = 0;
        ctx!.beginPath();
        ctx!.arc(
          cx + Math.cos(car.a - car.speed * 3) * mr * car.r,
          cy + Math.sin(car.a - car.speed * 3) * mr * car.r,
          1.2,
          0,
          Math.PI * 2
        );
        ctx!.fillStyle = car.col + "4d";
        ctx!.fill();
      });

      const cp = Math.sin(t * 2.8) * 0.22 + 0.78;
      const cg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 55 * cp);
      cg.addColorStop(0, `rgba(255,171,0,${0.18 * cp})`);
      cg.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = cg;
      ctx!.fillRect(0, 0, W, H);
      ctx!.beginPath();
      ctx!.arc(cx, cy, 4 * cp, 0, Math.PI * 2);
      ctx!.fillStyle = "#ffab00";
      ctx!.shadowColor = "#ffcc00";
      ctx!.shadowBlur = 18 * cp;
      ctx!.fill();
      ctx!.shadowBlur = 0;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx!.strokeStyle = `rgba(255,171,0,${0.25 * cp})`;
      ctx!.lineWidth = 1;
      ctx!.stroke();

      ctx!.fillStyle = "rgba(255,140,0,0.15)";
      ctx!.font = "8px monospace";
      ["N", "E", "S", "W"].forEach((dir, i) => {
        const angle = (i * Math.PI) / 2 - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (mr + 14);
        const ly = cy + Math.sin(angle) * (mr + 14);
        ctx!.fillText(dir, lx - 3, ly + 3);
      });

      t += 0.016;
      raf = requestAnimationFrame(draw);
    }

    init();
    const ro = new ResizeObserver(init);
    ro.observe(host);
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

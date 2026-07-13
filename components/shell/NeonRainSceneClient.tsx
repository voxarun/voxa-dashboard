"use client";

import dynamic from "next/dynamic";

// Client boundary so next/dynamic can use `ssr: false` (which Next.js disallows in
// the Server Component page). The heavy requestAnimationFrame canvas scene now loads
// on the client only — after hydration — so it never runs during server render or
// blocks the initial navigation paint.
export const NeonRainScene = dynamic(() => import("./NeonRainScene").then((m) => m.NeonRainScene), {
  ssr: false,
});

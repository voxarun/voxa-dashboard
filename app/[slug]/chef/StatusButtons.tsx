"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "./actions";

export function StatusButtons({ slug, orderId, currentStatus }: { slug: string; orderId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function set(next: string) {
    setErr(null);
    startTransition(async () => {
      const res = await updateOrderStatus(slug, orderId, next);
      if (res.ok) setStatus(next);
      else setErr(res.error ?? "Update failed");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => set("cooking")}
        disabled={pending || status === "cooking"}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
        style={{ background: "rgba(255,171,0,0.15)", color: "var(--amber)" }}
      >
        Cooking
      </button>
      <button
        onClick={() => set("ready")}
        disabled={pending || status === "ready"}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
        style={{ background: "rgba(0,230,118,0.15)", color: "var(--green)" }}
      >
        Ready
      </button>
      {err && <span className="text-xs" style={{ color: "var(--red)" }}>{err}</span>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { updateDeliveryStatus } from "./actions";

export function StatusButtons({ slug, orderId, currentStatus }: { slug: string; orderId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function set(next: string) {
    setErr(null);
    startTransition(async () => {
      const res = await updateDeliveryStatus(slug, orderId, next);
      if (res.ok) setStatus(next);
      else setErr(res.error ?? "Update failed");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => set("out_for_delivery")}
        disabled={pending || status === "out_for_delivery"}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
        style={{ background: "rgba(0,148,255,0.15)", color: "var(--blue2)" }}
      >
        Out for delivery
      </button>
      <button
        onClick={() => set("delivered")}
        disabled={pending || status === "delivered"}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
        style={{ background: "rgba(0,230,118,0.15)", color: "var(--green)" }}
      >
        Delivered
      </button>
      {err && <span className="text-xs" style={{ color: "var(--red)" }}>{err}</span>}
    </div>
  );
}

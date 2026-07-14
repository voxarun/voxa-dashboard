"use client";

import { useState, useTransition } from "react";
import { updateDeliveryStatus } from "./actions";

export function StatusButtons({
  slug,
  orderId,
  currentStatus,
  isTaxi,
}: {
  slug: string;
  orderId: string;
  currentStatus: string;
  isTaxi: boolean;
}) {
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

  // A taxi driver isn't "delivering" anything — these were takeaway labels (and
  // takeaway statuses) showing up on the taxi dashboard. Taxi rides go
  // en_route → completed; food orders keep out_for_delivery → delivered.
  const inProgress = isTaxi
    ? { value: "en_route", label: "On the way" }
    : { value: "out_for_delivery", label: "Out for delivery" };
  const finished = isTaxi
    ? { value: "completed", label: "Completed" }
    : { value: "delivered", label: "Delivered" };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => set(inProgress.value)}
        disabled={pending || status === inProgress.value}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
        style={{ background: "rgba(0,148,255,0.15)", color: "var(--blue2)" }}
      >
        {inProgress.label}
      </button>
      <button
        onClick={() => set(finished.value)}
        disabled={pending || status === finished.value}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
        style={{ background: "rgba(0,230,118,0.15)", color: "var(--green)" }}
      >
        {finished.label}
      </button>
      {err && <span className="text-xs" style={{ color: "var(--red)" }}>{err}</span>}
    </div>
  );
}

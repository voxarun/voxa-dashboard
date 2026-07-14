"use client";

// Catches any render/runtime error inside a client dashboard so a failure
// shows a real, retryable message instead of a silently frozen page (the old
// "it just hangs" symptom, which happened because there was no error boundary
// and a thrown render left the navigation transition stuck).
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        textAlign: "center",
        padding: 24,
        color: "var(--t2)",
      }}
    >
      <div style={{ fontSize: 34 }}>⚠️</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>Something went wrong loading this dashboard</div>
      <div style={{ fontSize: 12, maxWidth: 460, color: "var(--t3)", wordBreak: "break-word" }}>
        {error?.message || "Unknown error"}
        {error?.digest ? ` (ref: ${error.digest})` : ""}
      </div>
      <button
        type="button"
        onClick={reset}
        className="btn p"
        style={{ marginTop: 6, cursor: "pointer" }}
      >
        Try again
      </button>
    </div>
  );
}

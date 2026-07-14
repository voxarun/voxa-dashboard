"use client";

// Error boundary for the whole /admin area (overview + Add New Client +
// Manage Client). Without this, a thrown error during a server render left the
// navigation transition stuck, so clicking View/Manage looked like the page
// just hung. Now any failure shows a real, retryable message instead.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>Something went wrong in the admin panel</div>
      <div style={{ fontSize: 12, maxWidth: 460, color: "var(--t3)", wordBreak: "break-word" }}>
        {error?.message || "Unknown error"}
        {error?.digest ? ` (ref: ${error.digest})` : ""}
      </div>
      <button type="button" onClick={reset} className="btn p" style={{ marginTop: 6, cursor: "pointer" }}>
        Try again
      </button>
    </div>
  );
}

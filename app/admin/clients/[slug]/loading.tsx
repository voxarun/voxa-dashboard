// Streamed instantly on navigation while the server component fetches its data
// (client + owner + recent orders + call health), so opening a client's Manage
// page feels immediate instead of frozen while those queries run.
export default function Loading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        color: "var(--t2)",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "3px solid var(--b1)",
          borderTopColor: "var(--blue)",
          animation: "manage-loading-spin 0.8s linear infinite",
        }}
      />
      <div style={{ fontSize: 13, fontWeight: 500 }}>Loading client…</div>
      <style>{`@keyframes manage-loading-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

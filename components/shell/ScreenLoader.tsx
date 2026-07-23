/**
 * Shared route loader. Rendered by the loading.tsx of each heavy screen
 * (Orders / Kitchen / Delivery) so navigation shows a spinner immediately while
 * the server component fetches the whole order book, instead of a blank pause.
 */
export function ScreenLoader({ label = "Loading…" }: { label?: string }) {
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
          animation: "screen-loader-spin 0.8s linear infinite",
        }}
      />
      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
      <style>{`@keyframes screen-loader-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

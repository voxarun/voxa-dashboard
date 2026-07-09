import Link from "next/link";

// Middleware redirects every request to the right place before this ever
// renders (login, /{slug}, or /admin). This is a safe branded fallback for
// the rare cases middleware hasn't run yet (e.g. an edge cache in front of
// the app serving a stale response) — force-dynamic so this route itself
// is never statically cached.
export const dynamic = "force-dynamic";

export default function RootPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        background: "var(--bg)",
      }}
    >
      <div
        className="logo-mark"
        style={{ width: 44, height: 44 }}
      />
      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--t1)" }}>Voxa</div>
      <div style={{ fontSize: 12, color: "var(--t3)" }}>Taking you to your dashboard…</div>
      <Link
        href="/login"
        className="btn"
        style={{ textDecoration: "none", marginTop: 6 }}
      >
        Continue to sign in
      </Link>
    </div>
  );
}

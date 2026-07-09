// Middleware redirects every request to the right place before this ever
// renders (login, /{slug}, or /admin) — this is just a safe fallback.
export default function RootPage() {
  return null;
}

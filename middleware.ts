import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login"];

// Domain separation: admin.voxa.run is Voxa-internal only (never shown to
// clients), dashboard.voxa.run is the client-facing surface. Both currently
// point at this same app/deployment; this just enforces which routes each
// hostname is allowed to serve so a client browsing dashboard.voxa.run can
// never land on /admin, and admin.voxa.run never serves a bare client view
// to a non-admin.
function isAdminHost(hostname: string) {
  return hostname === "admin.voxa.run" || hostname.startsWith("admin.localhost");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.nextUrl.hostname;
  const onAdminHost = isAdminHost(hostname);

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    const { response } = await updateSession(request);
    return response;
  }

  const { response, user, supabase } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id, clients:client_id(slug)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Authenticated with Supabase but no profile row yet — not a
    // recognized dashboard user. Send them back to login rather than
    // letting them wander an app with no role.
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "no_profile");
    return NextResponse.redirect(url);
  }

  const role = profile.role as string;
  const clientSlug = (profile.clients as unknown as { slug: string } | null)?.slug;

  // admin.voxa.run is Voxa-internal — anyone who isn't voxa_admin gets
  // bounced straight back to the client dashboard domain, never sees the
  // admin login/shell at all.
  if (onAdminHost && role !== "voxa_admin") {
    const url = request.nextUrl.clone();
    url.hostname = "dashboard.voxa.run";
    url.pathname = clientSlug ? `/${clientSlug}` : "/login";
    return NextResponse.redirect(url);
  }

  let correctPrefix: string;
  if (role === "voxa_admin") {
    correctPrefix = "/admin";
  } else if (role === "owner" && clientSlug) {
    correctPrefix = `/${clientSlug}`;
  } else if (role === "chef" && clientSlug) {
    correctPrefix = `/${clientSlug}/chef`;
  } else if (role === "driver" && clientSlug) {
    correctPrefix = `/${clientSlug}/driver`;
  } else {
    correctPrefix = "/login";
  }

  // voxa_admin signing in on the client-facing domain (dashboard.voxa.run)
  // gets sent over to admin.voxa.run instead of exposing /admin there —
  // keeps the admin surface off the domain clients use, per "secret to
  // public and our clients".
  if (!onAdminHost && role === "voxa_admin" && pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.hostname = "admin.voxa.run";
    return NextResponse.redirect(url);
  }

  const onRoot = pathname === "/";
  const inCorrectArea = pathname === correctPrefix || pathname.startsWith(correctPrefix + "/");

  // Admins can browse any client's owner view read-only for support
  // purposes; everyone else is locked to their own prefix.
  const adminBrowsingClient = role === "voxa_admin" && /^\/[^/]+/.test(pathname) && !pathname.startsWith("/admin");

  if (onRoot || (!inCorrectArea && !adminBrowsingClient)) {
    const url = request.nextUrl.clone();
    url.pathname = correctPrefix;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

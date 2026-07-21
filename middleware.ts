import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login"];

/**
 * Admin-only portal. Clients (owner / chef / driver) sign in on the separate
 * client dashboard — nobody but a voxa_admin gets past this gate here.
 *
 * The old host-based split (admin.voxa.run vs dashboard.voxa.run served by one
 * deployment) is gone: this is now its own admin deployment, so the rule is
 * simply "voxa_admin only, everyone else is rejected". An admin can still open
 * any client's view read-only for support (the /{slug} routes); the canonical
 * area is /admin.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "no_profile");
    return NextResponse.redirect(url);
  }

  const role = profile.role as string;

  // The one and only rule: admins only. A client account that authenticates
  // correctly is still turned away here (the login page shows a generic
  // "incorrect email or password", so this doesn't reveal the account exists).
  if (role !== "voxa_admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "not_admin");
    return NextResponse.redirect(url);
  }

  const onRoot = pathname === "/";
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  // Admins may browse a client's dashboard read-only (the /{slug} routes).
  const browsingClient = /^\/[^/]+/.test(pathname) && !inAdmin;

  if (onRoot || (!inAdmin && !browsingClient)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip Next internals, the API, and ANY static file (anything ending in an
  // extension). Without the extension rule a request for /icon-512.png went
  // through the auth check and was redirected to /login, so the browser got
  // HTML where it expected a PNG and the logo rendered as a broken image.
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)"],
};

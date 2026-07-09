import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login"];

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

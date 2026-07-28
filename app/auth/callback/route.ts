import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing point for Supabase auth email links (currently: password recovery).
// Supabase redirects here with a `code` query param; we exchange it for a
// session (sets the auth cookies) then forward on to wherever the flow
// actually needs the user — e.g. /reset-password to set a new password.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/reset-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing or expired/used code — send back to the request-a-link page
  // rather than a dead end.
  return NextResponse.redirect(`${origin}/forgot-password?error=invalid_link`);
}

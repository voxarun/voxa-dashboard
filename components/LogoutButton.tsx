"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await createClient().auth.signOut();
    } catch {
      /* sign out anyway — the hard reload below clears client state regardless */
    }
    // Hard navigation, NOT router.push/refresh. The dashboard holds several
    // Supabase realtime clients sharing one auth-token storage key; a client-side
    // transition kept them alive while the token was cleared and the reconnect
    // churn locked the tab. A full reload tears everything down and loads clean.
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      disabled={busy}
      className="w-full cursor-pointer rounded-lg py-2 text-left text-[13px] font-medium disabled:opacity-60"
      style={{ color: "var(--t2)" }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

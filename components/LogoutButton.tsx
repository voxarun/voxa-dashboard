"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full cursor-pointer rounded-lg py-2 text-left text-[13px] font-medium"
      style={{ color: "var(--t2)" }}
    >
      Sign out
    </button>
  );
}

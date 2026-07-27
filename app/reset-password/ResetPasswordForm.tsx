"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(
        error.message.toLowerCase().includes("session")
          ? "This reset link has expired. Request a new one."
          : error.message
      );
      return;
    }

    // Reset link uses a one-time recovery session — sign it out so the
    // account is only accessible after signing in with the new password.
    await supabase.auth.signOut();
    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (done) {
    return (
      <div
        className="rounded-2xl border p-6 text-center"
        style={{ borderColor: "var(--b1)", background: "var(--s1)" }}
      >
        <h1 className="mb-2 text-lg font-bold" style={{ color: "var(--t1)" }}>
          Password updated
        </h1>
        <p className="text-sm" style={{ color: "var(--t2)" }}>
          Redirecting you to sign in...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-6"
      style={{ borderColor: "var(--b1)", background: "var(--s1)" }}
    >
      <h1 className="mb-1 text-center text-lg font-bold" style={{ color: "var(--t1)" }}>
        Set a new password
      </h1>
      <p className="mb-6 text-center text-sm" style={{ color: "var(--t2)" }}>
        Choose a new password for your admin account.
      </p>

      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
        New password
      </label>
      <input
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-4 w-full rounded-xl border px-4 py-3 text-sm outline-none shadow-sm transition-all duration-150 focus:shadow-[0_0_0_3px_rgba(0,148,255,0.22)]"
        style={{ borderColor: "var(--b1)", background: "var(--s2)", color: "var(--t1)" }}
      />

      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
        Confirm password
      </label>
      <input
        type="password"
        required
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="mb-5 w-full rounded-xl border px-4 py-3 text-sm outline-none shadow-sm transition-all duration-150 focus:shadow-[0_0_0_3px_rgba(0,148,255,0.22)]"
        style={{ borderColor: "var(--b1)", background: "var(--s2)", color: "var(--t1)" }}
      />

      {error && (
        <div
          className="mb-4 rounded-xl border px-3.5 py-2.5 text-sm"
          style={{ borderColor: "rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.08)", color: "var(--red)" }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl py-3.5 text-sm font-bold text-black shadow-[0_12px_34px_-10px_rgba(0,148,255,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-10px_rgba(0,148,255,0.75)] hover:brightness-[1.08] active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100"
        style={{ background: "linear-gradient(115deg,#0094ff,#00e5ff)" }}
      >
        {loading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}


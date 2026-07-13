"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === "Invalid login credentials" ? "Incorrect email or password" : error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-6"
      style={{ borderColor: "var(--b1)", background: "var(--s1)" }}
    >
      <h1 className="mb-1 text-center text-lg font-bold" style={{ color: "var(--t1)" }}>
        Sign in
      </h1>
      <p className="mb-6 text-center text-sm" style={{ color: "var(--t2)" }}>
        One login, every client&apos;s own dashboard.
      </p>

      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
        Email
      </label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-4 w-full rounded-xl border px-4 py-3 text-sm outline-none shadow-sm transition-all duration-150 focus:shadow-[0_0_0_3px_rgba(0,148,255,0.22)]"
        style={{ borderColor: "var(--b1)", background: "var(--s2)", color: "var(--t1)" }}
      />

      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
        Password
      </label>
      <div className="relative mb-5">
        <input
          type={showPassword ? "text" : "password"}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none shadow-sm transition-all duration-150 focus:shadow-[0_0_0_3px_rgba(0,148,255,0.22)]"
          style={{ borderColor: "var(--b1)", background: "var(--s2)", color: "var(--t1)" }}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
          style={{ color: "var(--t2)" }}
        >
          {showPassword ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

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
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <h1 className="mb-1 text-lg font-bold" style={{ color: "var(--t1)" }}>
        Sign in
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--t2)" }}>
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
        className="mb-4 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
        style={{ borderColor: "var(--b1)", background: "var(--s2)", color: "var(--t1)" }}
      />

      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
        Password
      </label>
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-5 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
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
        className="w-full rounded-xl py-3 text-sm font-bold text-black transition-opacity disabled:opacity-60"
        style={{ background: "linear-gradient(115deg,#0094ff,#00e5ff)" }}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function readLinkError(searchParamsError: string | null): string | null {
  if (typeof window !== "undefined" && window.location.hash) {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const errorCode = hashParams.get("error_code");
    const errorDescription = hashParams.get("error_description");
    if (errorCode === "otp_expired") {
      return "That reset link has expired or was already used. Enter your email below to get a new one.";
    }
    if (errorDescription) {
      return errorDescription.replace(/\+/g, " ");
    }
  }
  if (searchParamsError === "invalid_link") {
    return "That reset link is invalid or has expired. Enter your email below to get a new one.";
  }
  return null;
}

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setLinkError(readLinkError(searchParams.get("error")));
    if (window.location.hash || searchParams.get("error")) {
      window.history.replaceState(null, "", "/forgot-password");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLinkError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message.toLowerCase().includes("rate") ? error.message : null);
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div
        className="rounded-2xl border p-6 text-center"
        style={{ borderColor: "var(--b1)", background: "var(--s1)" }}
      >
        <h1 className="mb-2 text-lg font-bold" style={{ color: "var(--t1)" }}>
          Check your email
        </h1>
        <p className="text-sm" style={{ color: "var(--t2)" }}>
          If an account exists for <span style={{ color: "var(--t1)" }}>{email}</span>, a
          password reset link is on its way. It expires in 1 hour and can only be used once.
        </p>
        {error && (
          <div
            className="mt-4 rounded-xl border px-3.5 py-2.5 text-left text-sm"
            style={{ borderColor: "rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.08)", color: "var(--red)" }}
          >
            {error}
          </div>
        )}
        <a
          href="/login"
          className="mt-6 inline-block text-sm font-semibold"
          style={{ color: "var(--blue2)" }}
        >
          Back to sign in
        </a>
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
        Reset password
      </h1>
      <p className="mb-6 text-center text-sm" style={{ color: "var(--t2)" }}>
        Enter your admin email and we&apos;ll send a reset link.
      </p>

      {linkError && (
        <div
          className="mb-5 rounded-xl border px-3.5 py-2.5 text-left text-sm"
          style={{ borderColor: "rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.08)", color: "var(--red)" }}
        >
          {linkError}
        </div>
      )}

      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
        Email
      </label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-5 w-full rounded-xl border px-4 py-3 text-sm outline-none shadow-sm transition-all duration-150 focus:shadow-[0_0_0_3px_rgba(0,148,255,0.22)]"
        style={{ borderColor: "var(--b1)", background: "var(--s2)", color: "var(--t1)" }}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl py-3.5 text-sm font-bold text-black shadow-[0_12px_34px_-10px_rgba(0,148,255,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-10px_rgba(0,148,255,0.75)] hover:brightness-[1.08] active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100"
        style={{ background: "linear-gradient(115deg,#0094ff,#00e5ff)" }}
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>

      <a
        href="/login"
        className="mt-4 block text-center text-sm font-semibold"
        style={{ color: "var(--t2)" }}
      >
        Back to sign in
      </a>
    </form>
  );
}

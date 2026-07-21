import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* ambient brand glow — decorative, reuses the existing logo/button brand colors */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-80 w-80 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(0,148,255,0.16), rgba(0,229,255,0.05), transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* glass frame around the logo + form */}
        <div
          className="rounded-3xl border p-6 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-8"
          style={{ borderColor: "var(--b1)", background: "var(--s1)" }}
        >
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-512.png" alt="Voxa" className="h-11 w-11 flex-shrink-0 object-contain" />
            <span className="text-xl font-extrabold tracking-tight">Voxa Dashboard</span>
          </div>
          <Suspense fallback={<div style={{ height: 232 }} />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

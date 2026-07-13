"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientRow } from "./actions";

const inputCls =
  "w-full rounded-[14px] border px-4 py-3 text-sm outline-none shadow-sm transition-all duration-150 focus:shadow-[0_0_0_3px_rgba(0,148,255,0.22)]";
// top-level fields sit directly on the form (s1) → use the lighter s2 so they pop
const inputStyle = { borderColor: "var(--b1)", background: "var(--s2)", color: "var(--t1)" } as const;
// fields nested inside an s2 card → use s1 so they stay legible against the card
const nestedStyle = { borderColor: "var(--b1)", background: "var(--s1)", color: "var(--t1)" } as const;
const cardStyle = { borderColor: "var(--b1)", background: "var(--s2)" } as const;
const labelCls = "mb-2 block text-[10px] font-bold uppercase tracking-[0.14em]";

// Custom dark dropdown — replaces the native <select> so the option list matches
// the form theme (native option popups render white on some platforms). Behaves
// like a controlled select: `onChange(value)` fires with the chosen option's value.
function CustomSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center justify-between gap-2 text-left`}
        style={nestedStyle}
      >
        <span className="truncate">{selected?.label ?? ""}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className={`flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--t3)" }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-auto rounded-[14px] border p-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)]"
          style={{ borderColor: "var(--b1)", background: "#080c16" }}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06]"
                style={{ color: active ? "var(--t1)" : "var(--t2)", background: active ? "var(--s2)" : "transparent" }}
              >
                <span className="truncate">{o.label}</span>
                {active && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" style={{ color: "var(--blue2)" }}>
                    <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function NewClientForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [industry, setIndustry] = useState("takeaway");
  const [dataProject, setDataProject] = useState<"takeaway" | "taxi">("takeaway");
  const [brandColor, setBrandColor] = useState("#0094ff");
  const [planTier, setPlanTier] = useState<"basic" | "pro" | "empire">("basic");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let pw = "";
    for (let i = 0; i < 14; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setOwnerPassword(pw);
  }
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required");
      return;
    }
    startTransition(async () => {
      const res = await createClientRow({
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        tagline: tagline.trim(),
        industry,
        dataProject,
        brandColor,
        planTier,
        ownerPhone: ownerPhone.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPassword: ownerPassword.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.warning) setWarning(res.warning);
      setSuccess(true);
      setTimeout(() => router.push("/admin"), res.warning ? 4000 : 1200);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl space-y-7 rounded-3xl border p-6 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-8"
      style={{ borderColor: "var(--b1)", background: "var(--s1)" }}
    >
      {/* ── Basics ── */}
      <div className="space-y-5">
        <div>
          <label className={labelCls} style={{ color: "var(--t3)" }}>
            Business name
          </label>
          <input className={inputCls} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Royal Spice" />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--t3)" }}>
            URL slug (order.voxa.run/&#123;slug&#125; and dashboard.voxa.run/&#123;slug&#125;)
          </label>
          <input className={inputCls} style={inputStyle} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="royal-spice" />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--t3)" }}>
            Tagline
          </label>
          <input className={inputCls} style={inputStyle} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Bradford's finest curry house" />
        </div>
      </div>

      <div className="h-px w-full" style={{ background: "var(--b1)" }} />

      {/* ── Configuration (select cards) ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border p-4 shadow-sm transition-all duration-150" style={cardStyle}>
            <label className={labelCls} style={{ color: "var(--t3)" }}>
              Industry
            </label>
            <CustomSelect
              ariaLabel="Industry"
              value={industry}
              onChange={(v) => setIndustry(v)}
              options={[
                { value: "takeaway", label: "Takeaway" },
                { value: "taxi", label: "Taxi" },
                { value: "salon", label: "Salon" },
                { value: "lawfirm", label: "Law Firm" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
          <div className="rounded-2xl border p-4 shadow-sm transition-all duration-150" style={cardStyle}>
            <label className={labelCls} style={{ color: "var(--t3)" }}>
              Data project
            </label>
            <CustomSelect
              ariaLabel="Data project"
              value={dataProject}
              onChange={(v) => setDataProject(v as "takeaway" | "taxi")}
              options={[
                { value: "takeaway", label: "Takeaway (VOXA TAKEAWAY project)" },
                { value: "taxi", label: "Taxi (Voxa Taxi project)" },
              ]}
            />
          </div>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--t3)" }}>
          A brand-new vertical (salon, law firm) needs its own Supabase project provisioned before it can go live — pick whichever
          of the two existing projects it&apos;s closest to for now, or ask a developer to provision a new one.
        </p>
      </div>

      <div className="h-px w-full" style={{ background: "var(--b1)" }} />

      {/* ── Plan & branding (cards) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border p-4 shadow-sm transition-all duration-150" style={cardStyle}>
          <label className={labelCls} style={{ color: "var(--t3)" }}>
            Plan tier
          </label>
          <CustomSelect
            ariaLabel="Plan tier"
            value={planTier}
            onChange={(v) => setPlanTier(v as "basic" | "pro" | "empire")}
            options={[
              { value: "basic", label: "Basic" },
              { value: "pro", label: "Pro" },
              { value: "empire", label: "Empire" },
            ]}
          />
        </div>
        <div className="rounded-2xl border p-4 shadow-sm transition-all duration-150" style={cardStyle}>
          <label className={labelCls} style={{ color: "var(--t3)" }}>
            Brand colour
          </label>
          <input
            type="color"
            className="h-[46px] w-full cursor-pointer rounded-[14px] border p-1 shadow-sm transition-all duration-150"
            style={{ borderColor: "var(--b1)", background: "var(--s1)" }}
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
          />
        </div>
      </div>

      <div className="h-px w-full" style={{ background: "var(--b1)" }} />

      {/* ── Contact ── */}
      <div>
        <label className={labelCls} style={{ color: "var(--t3)" }}>
          Owner phone (for SMS alerts)
        </label>
        <input className={inputCls} style={inputStyle} value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+447700000000" />
      </div>

      <div className="h-px w-full" style={{ background: "var(--b1)" }} />

      {/* ── Owner login (distinct card) ── */}
      <div className="rounded-2xl border p-5 shadow-sm" style={cardStyle}>
        <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--t3)" }}>
          Owner Account
        </div>
        <div className="my-4 h-px w-full" style={{ background: "var(--b1)" }} />
        <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--t3)" }}>
          Owner login (optional — creates their dashboard.voxa.run/&#123;slug&#125; account now)
        </div>
        <div className="space-y-4 rounded-2xl p-4" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <input
            type="email"
            className={inputCls}
            style={nestedStyle}
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@theirbusiness.com"
          />
          <div className="flex gap-3">
            <input
              type="text"
              className={inputCls}
              style={nestedStyle}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder="Password"
            />
            <button
              type="button"
              onClick={generatePassword}
              className="whitespace-nowrap rounded-[14px] border px-4 text-xs font-semibold shadow-sm transition-all duration-150 hover:bg-white/[0.06] hover:shadow active:scale-[0.98]"
              style={{ borderColor: "var(--b1)", color: "var(--t2)" }}
            >
              Generate
            </button>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--t3)" }}>
            Leave both blank to skip — you can create the login later from this client&apos;s Manage page.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-[14px] border px-4 py-3 text-sm" style={{ borderColor: "rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.08)", color: "var(--red)" }}>
          {error}
        </div>
      )}
      {warning && (
        <div className="rounded-[14px] border px-4 py-3 text-sm" style={{ borderColor: "rgba(255,171,0,0.3)", background: "rgba(255,171,0,0.08)", color: "var(--amber)" }}>
          {warning}
        </div>
      )}
      {success && (
        <div className="rounded-[14px] border px-4 py-3 text-sm" style={{ borderColor: "rgba(0,230,118,0.3)", background: "rgba(0,230,118,0.08)", color: "var(--green)" }}>
          Client created — redirecting...
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl py-4 text-[15px] font-extrabold tracking-wide text-black shadow-[0_16px_44px_-12px_rgba(124,58,237,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-12px_rgba(124,58,237,0.75)] hover:brightness-[1.08] active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100"
        style={{ background: "linear-gradient(115deg,#7c3aed,#0094ff)" }}
      >
        {pending ? "Creating..." : "Create client"}
      </button>

      <p className="text-xs leading-relaxed" style={{ color: "var(--t3)" }}>
        Goes live on order.voxa.run/&#123;slug&#125; and dashboard.voxa.run/&#123;slug&#125; immediately. If you filled in the owner
        login above, their dashboard account is created in this same step — nothing to set up by hand.
      </p>
    </form>
  );
}

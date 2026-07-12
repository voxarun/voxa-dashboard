"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClientRow } from "./actions";

const inputCls = "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none";
const inputStyle = { borderColor: "var(--b1)", background: "var(--s2)", color: "var(--t1)" } as const;

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
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
          Business name
        </label>
        <input className={inputCls} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Royal Spice" />
      </div>

      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
          URL slug (order.voxa.run/&#123;slug&#125; and dashboard.voxa.run/&#123;slug&#125;)
        </label>
        <input className={inputCls} style={inputStyle} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="royal-spice" />
      </div>

      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
          Tagline
        </label>
        <input className={inputCls} style={inputStyle} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Bradford's finest curry house" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
            Industry
          </label>
          <select className={inputCls} style={inputStyle} value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="takeaway">Takeaway</option>
            <option value="taxi">Taxi</option>
            <option value="salon">Salon</option>
            <option value="lawfirm">Law Firm</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
            Data project
          </label>
          <select className={inputCls} style={inputStyle} value={dataProject} onChange={(e) => setDataProject(e.target.value as "takeaway" | "taxi")}>
            <option value="takeaway">Takeaway (VOXA TAKEAWAY project)</option>
            <option value="taxi">Taxi (Voxa Taxi project)</option>
          </select>
        </div>
      </div>
      <p className="-mt-2 text-xs" style={{ color: "var(--t3)" }}>
        A brand-new vertical (salon, law firm) needs its own Supabase project provisioned before it can go live — pick whichever
        of the two existing projects it&apos;s closest to for now, or ask a developer to provision a new one.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
            Plan tier
          </label>
          <select className={inputCls} style={inputStyle} value={planTier} onChange={(e) => setPlanTier(e.target.value as "basic" | "pro" | "empire")}>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="empire">Empire</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
            Brand colour
          </label>
          <input type="color" className="h-[42px] w-full rounded-xl border" style={{ borderColor: "var(--b1)" }} value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
          Owner phone (for SMS alerts)
        </label>
        <input className={inputCls} style={inputStyle} value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+447700000000" />
      </div>

      <div className="rounded-xl border p-3.5" style={{ borderColor: "var(--b1)", background: "var(--s1)" }}>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t3)" }}>
          Owner login (optional — creates their dashboard.voxa.run/&#123;slug&#125; account now)
        </div>
        <div className="space-y-3">
          <input
            type="email"
            className={inputCls}
            style={inputStyle}
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@theirbusiness.com"
          />
          <div className="flex gap-2">
            <input
              type="text"
              className={inputCls}
              style={inputStyle}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder="Password"
            />
            <button
              type="button"
              onClick={generatePassword}
              className="whitespace-nowrap rounded-xl border px-3 text-xs font-semibold"
              style={{ borderColor: "var(--b1)", color: "var(--t2)" }}
            >
              Generate
            </button>
          </div>
          <p className="text-[11px]" style={{ color: "var(--t3)" }}>
            Leave both blank to skip — you can create the login later from this client&apos;s Manage page.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border px-3.5 py-2.5 text-sm" style={{ borderColor: "rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.08)", color: "var(--red)" }}>
          {error}
        </div>
      )}
      {warning && (
        <div className="rounded-xl border px-3.5 py-2.5 text-sm" style={{ borderColor: "rgba(255,171,0,0.3)", background: "rgba(255,171,0,0.08)", color: "var(--amber)" }}>
          {warning}
        </div>
      )}
      {success && (
        <div className="rounded-xl border px-3.5 py-2.5 text-sm" style={{ borderColor: "rgba(0,230,118,0.3)", background: "rgba(0,230,118,0.08)", color: "var(--green)" }}>
          Client created — redirecting...
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl py-3 text-sm font-bold text-black disabled:opacity-60"
        style={{ background: "linear-gradient(115deg,#7c3aed,#0094ff)" }}
      >
        {pending ? "Creating..." : "Create client"}
      </button>

      <p className="text-xs" style={{ color: "var(--t3)" }}>
        Goes live on order.voxa.run/&#123;slug&#125; and dashboard.voxa.run/&#123;slug&#125; immediately. If you filled in the owner
        login above, their dashboard account is created in this same step — nothing to set up by hand.
      </p>
    </form>
  );
}

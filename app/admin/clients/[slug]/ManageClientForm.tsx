"use client";

import { useState, useTransition } from "react";
import { updateClientSettings, resetOwnerPassword, createClientLogin, deleteClientLogin } from "./actions";

type Client = {
  id: string;
  slug: string;
  name: string;
  plan_tier: string;
  online_ordering_enabled: boolean;
  is_open: boolean;
  n8n_webhook_url: string | null;
};

export type ClientUser = { id: string; email: string; full_name: string; role: string };

const ROLE_HINT: Record<string, string> = {
  owner: "Full dashboard — KPIs, orders, revenue",
  chef: "Kitchen queue only — no prices, no customer contact",
  driver: "Deliveries only — address + first name",
};

/** Generate a readable password the admin can hand over. */
function suggestPassword(): string {
  const words = ["voxa", "bright", "swift", "amber", "cobalt", "harbor", "lunar", "vivid"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)}-${n}`;
}

const fieldStyle: React.CSSProperties = {
  background: "var(--s2)",
  border: "1px solid var(--b1)",
  borderRadius: 7,
  padding: "8px 11px",
  fontSize: 12,
  color: "var(--t1)",
  width: "100%",
};

export function ManageClientForm({ client, users }: { client: Client; users: ClientUser[] }) {
  const [planTier, setPlanTier] = useState(client.plan_tier);
  const [onlineOrdering, setOnlineOrdering] = useState(client.online_ordering_enabled);
  const [isOpen, setIsOpen] = useState(client.is_open);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(client.n8n_webhook_url ?? "");
  const [saving, startSave] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ── Logins ──
  const [pending, startAction] = useTransition();
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "chef" | "driver">("owner");

  const hasOwner = users.some((u) => u.role === "owner");

  function save() {
    setSaveMsg(null);
    startSave(async () => {
      const res = await updateClientSettings(client.id, client.slug, {
        plan_tier: planTier,
        online_ordering_enabled: onlineOrdering,
        is_open: isOpen,
        n8n_webhook_url: n8nWebhookUrl.trim() || null,
      });
      setSaveMsg(res.ok ? "Saved." : `Error: ${res.error}`);
    });
  }

  function createLogin() {
    setMsg(null);
    startAction(async () => {
      const res = await createClientLogin(client.id, client.slug, { email, password, fullName, role });
      if (res.ok) {
        setMsg({ text: `Login created — ${email} / ${password}. Hand these over now; the password isn't stored anywhere.`, ok: true });
        setEmail("");
        setFullName("");
        setPassword("");
        setAdding(false);
      } else {
        setMsg({ text: res.error ?? "Failed", ok: false });
      }
    });
  }

  function doReset(userId: string) {
    if (resetPw.length < 8) return;
    setMsg(null);
    startAction(async () => {
      const res = await resetOwnerPassword(userId, resetPw);
      setMsg(
        res.ok
          ? { text: `Password updated to: ${resetPw} — hand it over now.`, ok: true }
          : { text: res.error ?? "Failed", ok: false }
      );
      if (res.ok) {
        setResetPw("");
        setResetFor(null);
      }
    });
  }

  function removeLogin(userId: string, userEmail: string) {
    if (!confirm(`Delete the login for ${userEmail}? They will no longer be able to sign in.`)) return;
    setMsg(null);
    startAction(async () => {
      const res = await deleteClientLogin(userId, client.slug);
      setMsg(res.ok ? { text: "Login deleted.", ok: true } : { text: res.error ?? "Failed", ok: false });
    });
  }

  return (
    <div className="fleet-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">Plan &amp; Status</div>
            <div className="cs">Since there&apos;s no payment processor connected yet, this is the billing control surface</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 11, color: "var(--t2)" }}>Plan tier</span>
            <select value={planTier} onChange={(e) => setPlanTier(e.target.value)} style={fieldStyle}>
              <option value="basic" style={{ background: "#080c16" }}>Basic</option>
              <option value="pro" style={{ background: "#080c16" }}>Pro</option>
              <option value="empire" style={{ background: "#080c16" }}>Empire</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--t2)" }}>
            <input type="checkbox" checked={onlineOrdering} onChange={(e) => setOnlineOrdering(e.target.checked)} />
            Online ordering enabled (order.voxa.run)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--t2)" }}>
            <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
            Currently open for business
          </label>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 11, color: "var(--t2)" }}>n8n webhook URL (blank = automation off for this client)</span>
            <input
              type="text"
              placeholder="https://voxarun.app.n8n.cloud/webhook/..."
              value={n8nWebhookUrl}
              onChange={(e) => setN8nWebhookUrl(e.target.value)}
              style={fieldStyle}
            />
          </label>
          <button type="button" className="btn p" disabled={saving} onClick={save} style={{ width: "fit-content" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saveMsg && <div style={{ fontSize: 11, color: saveMsg.startsWith("Error") ? "var(--red)" : "var(--green)" }}>{saveMsg}</div>}
        </div>
      </div>

      <div className="card">
        <div className="ch">
          <div>
            <div className="ct">Logins</div>
            <div className="cs">
              {users.length ? `${users.length} account${users.length === 1 ? "" : "s"} for this client` : "No logins yet"}
            </div>
          </div>
          {!adding && (
            <button
              type="button"
              className="btn p"
              onClick={() => {
                setAdding(true);
                setPassword(suggestPassword());
                setRole(hasOwner ? "chef" : "owner");
                setMsg(null);
              }}
            >
              + Add login
            </button>
          )}
        </div>

        {msg && (
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.6,
              color: msg.ok ? "var(--green)" : "var(--red)",
              background: msg.ok ? "rgba(0,230,118,0.07)" : "rgba(255,68,68,0.07)",
              border: `1px solid ${msg.ok ? "rgba(0,230,118,0.2)" : "rgba(255,68,68,0.2)"}`,
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 12,
            }}
          >
            {msg.text}
          </div>
        )}

        {/* ── Existing logins ── */}
        {users.length === 0 && !adding && (
          <div style={{ fontSize: 12, color: "var(--t3)" }}>
            No login has been provisioned for this client yet — they can&apos;t sign in.
          </div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          {users.map((u) => (
            <div
              key={u.id}
              style={{ background: "var(--s2)", border: "1px solid var(--b1)", borderRadius: 9, padding: "10px 12px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--t1)", fontWeight: 600 }}>{u.email}</div>
                  <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 2 }}>
                    {u.full_name} · {ROLE_HINT[u.role] ?? u.role}
                  </div>
                </div>
                <span className={`chip ${u.role === "owner" ? "cn" : "cg"}`} style={{ flexShrink: 0 }}>
                  {u.role}
                </span>
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
                <button
                  type="button"
                  className="btn"
                  disabled={pending}
                  onClick={() => {
                    setResetFor(resetFor === u.id ? null : u.id);
                    setResetPw(suggestPassword());
                    setMsg(null);
                  }}
                >
                  {resetFor === u.id ? "Cancel" : "Reset password"}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={pending}
                  onClick={() => removeLogin(u.id, u.email)}
                  style={{ color: "var(--red)" }}
                >
                  Delete
                </button>
              </div>

              {resetFor === u.id && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input
                    type="text"
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    style={fieldStyle}
                  />
                  <button
                    type="button"
                    className="btn p"
                    disabled={pending || resetPw.length < 8}
                    onClick={() => doReset(u.id)}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {pending ? "Saving…" : "Set"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Add a login ── */}
        {adding && (
          <div
            style={{
              background: "var(--s2)",
              border: "1px solid var(--b1)",
              borderRadius: 9,
              padding: 12,
              marginTop: users.length ? 10 : 0,
              display: "grid",
              gap: 9,
            }}
          >
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--t2)" }}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@business.co.uk"
                style={fieldStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--t2)" }}>Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Hammad Khan"
                style={fieldStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--t2)" }}>Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "owner" | "chef" | "driver")}
                style={fieldStyle}
              >
                <option value="owner" disabled={hasOwner} style={{ background: "#080c16" }}>
                  Owner {hasOwner ? "(already exists)" : ""}
                </option>
                <option value="chef" style={{ background: "#080c16" }}>Chef</option>
                <option value="driver" style={{ background: "#080c16" }}>Driver</option>
              </select>
              <span style={{ fontSize: 10, color: "var(--t3)" }}>{ROLE_HINT[role]}</span>
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--t2)" }}>Password (min 8 chars)</span>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={fieldStyle}
                />
                <button type="button" className="btn" onClick={() => setPassword(suggestPassword())} style={{ whiteSpace: "nowrap" }}>
                  Suggest
                </button>
              </div>
              {/* Supabase hashes the password — it can never be read back, so the
                  admin has to copy it now. */}
              <span style={{ fontSize: 10, color: "var(--t3)" }}>
                Shown once. Copy it before saving — it can&apos;t be retrieved later, only reset.
              </span>
            </label>

            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => setAdding(false)} disabled={pending}>
                Cancel
              </button>
              <button
                type="button"
                className="btn p"
                disabled={pending || password.length < 8 || !email.trim()}
                onClick={createLogin}
              >
                {pending ? "Creating…" : "Create login"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

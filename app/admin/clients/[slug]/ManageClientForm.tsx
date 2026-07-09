"use client";

import { useState, useTransition } from "react";
import { updateClientSettings, resetOwnerPassword } from "./actions";

type Client = {
  id: string;
  slug: string;
  name: string;
  plan_tier: string;
  online_ordering_enabled: boolean;
  is_open: boolean;
  n8n_webhook_url: string | null;
};

const fieldStyle: React.CSSProperties = {
  background: "var(--s2)",
  border: "1px solid var(--b1)",
  borderRadius: 7,
  padding: "8px 11px",
  fontSize: 12,
  color: "var(--t1)",
  width: "100%",
};

export function ManageClientForm({ client, ownerId, ownerEmail }: { client: Client; ownerId: string | null; ownerEmail: string | null }) {
  const [planTier, setPlanTier] = useState(client.plan_tier);
  const [onlineOrdering, setOnlineOrdering] = useState(client.online_ordering_enabled);
  const [isOpen, setIsOpen] = useState(client.is_open);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(client.n8n_webhook_url ?? "");
  const [saving, startSave] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [resetting, startReset] = useTransition();
  const [resetMsg, setResetMsg] = useState<string | null>(null);

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

  function reset() {
    if (!ownerId || newPassword.length < 8) return;
    setResetMsg(null);
    startReset(async () => {
      const res = await resetOwnerPassword(ownerId, newPassword);
      setResetMsg(res.ok ? "Password updated." : `Error: ${res.error}`);
      if (res.ok) setNewPassword("");
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
            <div className="ct">Owner Account</div>
            <div className="cs">{ownerEmail ?? "No owner account found for this client"}</div>
          </div>
        </div>
        {ownerId ? (
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ fontSize: 11, color: "var(--t2)" }}>New password</span>
              <input
                type="text"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={fieldStyle}
              />
            </label>
            <button
              type="button"
              className="btn"
              disabled={resetting || newPassword.length < 8}
              onClick={reset}
              style={{ width: "fit-content" }}
            >
              {resetting ? "Resetting…" : "Reset password"}
            </button>
            {resetMsg && <div style={{ fontSize: 11, color: resetMsg.startsWith("Error") ? "var(--red)" : "var(--green)" }}>{resetMsg}</div>}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--t3)" }}>No owner has been provisioned for this client yet.</div>
        )}
      </div>
    </div>
  );
}

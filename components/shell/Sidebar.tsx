"use client";

import { useState } from "react";
import type { NavSection } from "./types";

function NavItems({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  return (
    <>
      {sections.map((sec) => (
        <div key={sec.title}>
          <div className="nav-sec">{sec.title}</div>
          {sec.items.map((it) =>
            it.disabled ? (
              <a key={it.label} className="ni disabled" aria-disabled="true" tabIndex={-1}>
                <span className="ni-icon">{it.icon}</span>
                <span className="ni-label">{it.label}</span>
                <span className="ni-badge soon">Soon</span>
              </a>
            ) : (
              <a
                key={it.label}
                className={`ni ${it.active ? "on" : ""}`}
                href={it.href}
                onClick={onNavigate}
              >
                <span className="ni-icon">{it.icon}</span>
                <span className="ni-label">{it.label}</span>
                {it.badge && (
                  <span className={`ni-badge ${it.badgeClass ?? ""}`}>{it.badge}</span>
                )}
              </a>
            )
          )}
        </div>
      ))}
    </>
  );
}

export function Sidebar({
  clientTag,
  clientName,
  planLabel,
  mobileTitle,
  sections,
  logoutSlot,
  homeHref,
}: {
  clientTag: string;
  clientName: string;
  planLabel?: string;
  mobileTitle: string;
  sections: NavSection[];
  logoutSlot: React.ReactNode;
  homeHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="sb">
        <a className="sb-logo" href={homeHref} style={{ textDecoration: "none", cursor: "pointer" }}>
          <div className="logo-mark" />
          <span className="logo-text">Voxa</span>
        </a>
        <div className="sb-client">
          <div className="sbc-tag">{clientTag}</div>
          <div className="sbc-name">{clientName}</div>
          {planLabel && <div className="sbc-plan">{planLabel}</div>}
        </div>
        <nav className="sb-nav">
          <NavItems sections={sections} />
        </nav>
        <div className="sb-foot" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="sb-status">
            <div className="pulse-dot" />
            Voxa running · 24/7
          </div>
          {logoutSlot}
        </div>
      </aside>

      <header className="mobile-nav">
        <button
          className={`hamb ${open ? "open" : ""}`}
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <span className="mobile-title">{mobileTitle}</span>
        <div className="mobile-actions">
          <div className="avatar">{clientName.charAt(0).toUpperCase()}</div>
        </div>
      </header>

      <button
        className={`drawer-overlay ${open ? "show" : ""}`}
        type="button"
        aria-label="Close menu"
        onClick={() => setOpen(false)}
      />

      <aside className={`mobile-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-head">
          <a className="mobile-brand" href={homeHref} style={{ textDecoration: "none" }}>
            <div className="logo-mark" />
            <div>
              <div className="logo-text">Voxa</div>
              <div className="mobile-client">{clientName}</div>
            </div>
          </a>
          <button className="drawer-close" type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        <nav className="drawer-nav">
          <NavItems sections={sections} onNavigate={() => setOpen(false)} />
        </nav>
      </aside>
    </>
  );
}

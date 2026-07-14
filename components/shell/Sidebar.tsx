"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, NavSection } from "./types";

/** The path part of an href, ignoring any #hash or ?query. */
function hrefPath(href?: string): string {
  if (!href) return "";
  return href.split("#")[0].split("?")[0];
}

/**
 * Pick which nav item is "active" from the current URL instead of a hardcoded
 * flag, so the highlight follows real navigation. An item matches when its
 * path equals the current pathname or is a parent segment of it; the longest
 * (most specific) match wins, and ties fall to the first item — so on a
 * client's overview page the several same-path #hash links don't all light up,
 * only the first (Command Centre) does.
 */
function activeItemFor(sections: NavSection[], pathname: string): NavItem | null {
  let best: NavItem | null = null;
  let bestLen = -1;
  for (const sec of sections) {
    for (const it of sec.items) {
      if (it.disabled || !it.href) continue;
      const p = hrefPath(it.href);
      if (!p) continue;
      const matches = pathname === p || pathname.startsWith(p + "/");
      if (matches && p.length > bestLen) {
        bestLen = p.length;
        best = it;
      }
    }
  }
  return best;
}

function NavItems({
  sections,
  activeItem,
  onNavigate,
}: {
  sections: NavSection[];
  activeItem: NavItem | null;
  onNavigate?: () => void;
}) {
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
              <Link
                key={it.label}
                className={`ni ${it === activeItem ? "on" : ""}`}
                href={it.href ?? "#"}
                onClick={onNavigate}
              >
                <span className="ni-icon">{it.icon}</span>
                <span className="ni-label">{it.label}</span>
                {it.badge && (
                  <span className={`ni-badge ${it.badgeClass ?? ""}`}>{it.badge}</span>
                )}
              </Link>
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
  const pathname = usePathname();
  const activeItem = activeItemFor(sections, pathname ?? "");

  return (
    <>
      <aside className="sb">
        <Link className="sb-logo" href={homeHref} style={{ textDecoration: "none", cursor: "pointer" }}>
          <div className="logo-mark" />
          <span className="logo-text">Voxa</span>
        </Link>
        <div className="sb-client">
          <div className="sbc-tag">{clientTag}</div>
          <div className="sbc-name">{clientName}</div>
          {planLabel && <div className="sbc-plan">{planLabel}</div>}
        </div>
        <nav className="sb-nav">
          <NavItems sections={sections} activeItem={activeItem} />
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
          <Link className="mobile-brand" href={homeHref} style={{ textDecoration: "none" }} onClick={() => setOpen(false)}>
            <div className="logo-mark" />
            <div>
              <div className="logo-text">Voxa</div>
              <div className="mobile-client">{clientName}</div>
            </div>
          </Link>
          <button className="drawer-close" type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        <nav className="drawer-nav">
          <NavItems sections={sections} activeItem={activeItem} onNavigate={() => setOpen(false)} />
        </nav>
      </aside>
    </>
  );
}

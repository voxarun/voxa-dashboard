'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Zap, BarChart2, TrendingUp, ClipboardList, Phone,
  ChefHat, Truck, Brain, Map, Star, Bot, Bell, Settings,
} from 'lucide-react'

import type { LucideProps } from 'lucide-react'

interface NavItemDef {
  label: string
  href: string
  Icon: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>
  badge?: string
  badgeVariant?: 'green'
}

const NAV: { section: string; items: NavItemDef[] }[] = [
  {
    section: 'Overview',
    items: [
      { label: 'Command Centre', href: '/',          Icon: Zap },
      { label: 'Analytics',      href: '/analytics', Icon: BarChart2 },
      { label: 'Revenue',        href: '/revenue',   Icon: TrendingUp },
    ],
  },
  {
    section: 'Operations',
    items: [
      { label: 'Orders',         href: '/orders',    Icon: ClipboardList, badge: 'live' },
      { label: 'Call Logs',      href: '/call-logs', Icon: Phone },
      { label: 'Chef Dashboard', href: '/chef',      Icon: ChefHat },
      { label: 'Delivery',       href: '/driver',    Icon: Truck },
    ],
  },
  {
    section: 'Intelligence',
    items: [
      { label: 'AI Insights',    href: '/insights',  Icon: Brain },
      { label: 'Customer Map',   href: '/map',       Icon: Map },
      { label: 'Reviews',        href: '/reviews',   Icon: Star },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'AI Agents',      href: '/agents',    Icon: Bot,      badge: 'ON', badgeVariant: 'green' },
      { label: 'Notifications',  href: '/notifs',    Icon: Bell },
      { label: 'Settings',       href: '/settings',  Icon: Settings },
    ],
  },
]

interface SidebarProps {
  liveOrderCount?: number
}

// Only these routes have working pages - the rest are shown disabled (greyed out).
const ENABLED_HREFS = new Set([
  '/',
  '/orders',
  '/chef',
  '/driver',
])

export default function Sidebar({ liveOrderCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function renderNav(onNavigate?: () => void) {
    return NAV.map(({ section, items }) => (
      <div key={section}>
        <p
          className="px-2 pt-3 pb-1.5 nav-section-label"
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text3)' }}
        >
          {section}
        </p>
        {items.map(({ label, href, Icon, badge, badgeVariant }) => {
          const enabled = ENABLED_HREFS.has(href)
          const isActive = enabled && pathname === href
          const resolvedBadge = label === 'Orders' && liveOrderCount > 0 ? liveOrderCount : badge

          if (!enabled) {
            return (
              <div
                key={href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] nav-item"
                title="Coming soon"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text3)',
                  opacity: 0.5,
                  cursor: 'not-allowed',
                  userSelect: 'none',
                }}
              >
                <Icon size={16} style={{ flexShrink: 0, opacity: 0.6 }} />
                <span className="flex-1 nav-label">{label}</span>
                <span
                  className="nav-badge"
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 100,
                    background: 'var(--surface2)',
                    color: 'var(--text3)',
                  }}
                >
                  Soon
                </span>
              </div>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] transition-all nav-item"
              style={{
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--blue2)' : 'var(--text2)',
                background: isActive ? 'rgba(45,124,246,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(45,124,246,0.2)' : '1px solid transparent',
              }}
              onClick={onNavigate}
              onMouseEnter={e => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--surface2)'
                  ;(e.currentTarget as HTMLElement).style.color = '#fff'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text2)'
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0, opacity: 0.8 }} />
              <span className="flex-1 nav-label">{label}</span>
              {resolvedBadge && (
                <span
                  className="nav-badge"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 100,
                    background:
                      badgeVariant === 'green' ? 'var(--green)' :
                      typeof resolvedBadge === 'number' ? 'var(--red)' :
                      'var(--blue)',
                    color: badgeVariant === 'green' ? '#000' : '#fff',
                  }}
                >
                  {resolvedBadge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    ))
  }

  return (
    <>
      <aside
        className="app-sidebar fixed left-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 240,
          background: 'rgba(5,8,21,0.97)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-6"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <LogoMark />
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Vox<span style={{ color: 'var(--blue)' }}>a</span>
          </span>
        </div>

        <div
          className="mx-3 mt-4 mb-1 rounded-xl px-3.5 py-3"
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border2)',
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
            Active Client
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Bradford Spice House</p>
          <p style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 500, marginTop: 2 }}>⭐ Empire Plan</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
          {renderNav()}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text2)' }}>
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse-dot"
              style={{ background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }}
            />
            Voxa AI running · 24/7
          </div>
        </div>
      </aside>

      <header className="mobile-shellbar">
        <div className="mobile-shell-brand">
          <LogoMark size={32} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>
              Vox<span style={{ color: 'var(--blue)' }}>a</span>
            </div>
            <div className="mobile-shell-client">Bradford Spice House</div>
          </div>
        </div>
        <button
          className={`hamb-btn ${open ? 'open' : ''}`}
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <button
        className={`drawer-scrim ${open ? 'show' : ''}`}
        type="button"
        aria-label="Close menu"
        onClick={() => setOpen(false)}
      />

      <aside className={`mobile-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="drawer-titlebar">
          <div className="mobile-shell-brand">
            <LogoMark size={32} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>
                Vox<span style={{ color: 'var(--blue)' }}>a</span>
              </div>
              <div className="mobile-shell-client">Bradford Spice House</div>
            </div>
          </div>
          <button className="drawer-close" type="button" aria-label="Close menu" onClick={() => setOpen(false)}>×</button>
        </div>
        <nav className="drawer-nav">
          {renderNav(() => setOpen(false))}
        </nav>
      </aside>
    </>
  )
}

function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" style={{ flexShrink: 0 }}>
      <path d="M18 4L6 13L18 32L30 13L18 4Z" fill="url(#sg1)" opacity="0.95" />
      <path d="M18 4L6 13L18 21L30 13L18 4Z" fill="url(#sg2)" />
      <defs>
        <linearGradient id="sg1" x1="6" y1="4" x2="30" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7ea8ff" />
          <stop offset="0.5" stopColor="#2D7CF6" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="sg2" x1="6" y1="4" x2="30" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00d4ff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#2D7CF6" stopOpacity="0.7" />
        </linearGradient>
      </defs>
    </svg>
  )
}

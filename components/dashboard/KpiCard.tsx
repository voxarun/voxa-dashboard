'use client'

interface KpiCardProps {
  icon: string
  label: string
  value: string | number
  sub?: string
  change?: string
  changeUp?: boolean
  accent?: 'blue' | 'green' | 'cyan' | 'amber' | 'red' | 'purple'
}

const ACCENT_MAP = {
  blue:   { icon: 'rgba(45,124,246,0.12)',  iconBorder: 'rgba(45,124,246,0.2)',  bar: 'var(--blue)' },
  green:  { icon: 'rgba(0,230,118,0.10)',   iconBorder: 'rgba(0,230,118,0.2)',   bar: 'var(--green)' },
  cyan:   { icon: 'rgba(0,212,255,0.10)',   iconBorder: 'rgba(0,212,255,0.2)',   bar: 'var(--cyan)' },
  amber:  { icon: 'rgba(255,171,0,0.10)',   iconBorder: 'rgba(255,171,0,0.2)',   bar: 'var(--amber)' },
  red:    { icon: 'rgba(255,68,68,0.10)',   iconBorder: 'rgba(255,68,68,0.2)',   bar: 'var(--red)' },
  purple: { icon: 'rgba(124,58,237,0.10)',  iconBorder: 'rgba(124,58,237,0.2)',  bar: 'var(--purple)' },
}

export default function KpiCard({
  icon, label, value, sub, change, changeUp, accent = 'blue',
}: KpiCardProps) {
  const a = ACCENT_MAP[accent]

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 cursor-default transition-all duration-200 group"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(45,124,246,0.25)'
        el.style.background = 'var(--surface2)'
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = 'var(--glow)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--border)'
        el.style.background = 'var(--surface)'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Top accent bar (visible on hover via group) */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${a.bar}, transparent)` }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg"
          style={{ background: a.icon, border: `1px solid ${a.iconBorder}` }}
        >
          {icon}
        </div>
        {change && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: changeUp ? 'rgba(0,230,118,0.10)' : 'rgba(255,68,68,0.10)',
              color: changeUp ? 'var(--green)' : 'var(--red)',
            }}
          >
            {change}
          </span>
        )}
      </div>

      {/* Value */}
      <div
        style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1, marginBottom: 4, color: '#fff' }}
      >
        {value}
      </div>

      {/* Label */}
      <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{label}</div>

      {/* Sub */}
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>{sub}</div>
      )}
    </div>
  )
}

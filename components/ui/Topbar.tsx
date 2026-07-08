'use client'

import { useState, useEffect } from 'react'
import { Search, Bell, Moon } from 'lucide-react'

interface TopbarProps {
  title: string
  subtitle?: string
  notifCount?: number
}

export default function Topbar({ title, subtitle, notifCount = 0 }: TopbarProps) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      className="dash-topbar sticky top-0 z-40 flex items-center justify-between"
      style={{
        background: 'rgba(2,4,15,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left */}
      <div className="dash-topbar-left flex items-center gap-4">
        <div className="dash-topbar-title-wrap">
          <h1 className="dash-topbar-title" style={{ color: '#fff' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="dash-topbar-subtitle" style={{ color: 'var(--text2)' }}>{subtitle}</p>
          )}
        </div>
        <div
          className="dash-live-chip flex items-center gap-1.5 px-2.5 py-1"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--green)',
            background: 'rgba(0,230,118,0.08)',
            border: '1px solid rgba(0,230,118,0.2)',
            borderRadius: 100,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
            style={{ background: 'var(--green)' }}
          />
          LIVE
        </div>
      </div>

      {/* Right */}
      <div className="dash-topbar-right flex items-center gap-3">
        <div
          className="dash-clock"
          style={{
            fontFamily: 'var(--font-jetbrains)',
            fontSize: 13,
            color: 'var(--text2)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '6px 14px',
            borderRadius: 8,
            minWidth: 90,
            textAlign: 'center',
          }}
        >
          {time}
        </div>

        <TopbarBtn>
          <Search size={16} />
        </TopbarBtn>

        <TopbarBtn>
          <Bell size={16} />
          {notifCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex items-center justify-center"
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'var(--red)',
                fontSize: 9,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {notifCount}
            </span>
          )}
        </TopbarBtn>

        <TopbarBtn>
          <Moon size={16} />
        </TopbarBtn>

        <div
          className="flex items-center justify-center cursor-pointer"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, var(--blue), var(--purple))',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          V
        </div>
      </div>
    </header>
  )
}

function TopbarBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="dash-topbar-btn relative flex items-center justify-center transition-all"
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text2)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--surface2)'
        ;(e.currentTarget as HTMLElement).style.color = '#fff'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
        ;(e.currentTarget as HTMLElement).style.color = 'var(--text2)'
      }}
    >
      {children}
    </button>
  )
}

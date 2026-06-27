'use client'

import { Phone, PhoneCall, PhoneMissed, Clock } from 'lucide-react'
import type { CallStats, CallSummary } from '@/types'

// Exact clock time (UK) for a call — varies per row, reads as a real live feed.
function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

interface CallStatusProps {
  stats: CallStats | null
  loading: boolean
  error: string | null
}

function fmtDuration(sec: number): string {
  if (sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

// Live status pill for a single call.
function statusChip(c: CallSummary): { label: string; color: string; bg: string } {
  if (c.status && c.status !== 'ended') {
    return { label: 'Live', color: 'var(--green)', bg: 'rgba(0,230,118,0.12)' }
  }
  if (!c.answered) {
    return { label: 'Missed', color: 'var(--red)', bg: 'rgba(255,68,68,0.10)' }
  }
  return { label: 'Answered', color: 'var(--blue2)', bg: 'rgba(45,124,246,0.12)' }
}

export default function CallStatus({ stats, loading, error }: CallStatusProps) {
  return (
    <div
      className="rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '22px 24px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>📞 Live Call Feed</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {error
              ? 'Could not load call data'
              : loading && !stats
              ? 'Connecting to VAPI…'
              : 'Real-time activity'}
          </p>
        </div>
        {stats && stats.activeCalls > 0 ? (
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--green)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--green)' }} />
            {stats.activeCalls} on call now
          </span>
        ) : stats ? (
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(45,124,246,0.10)', color: 'var(--blue2)' }}
          >
            {stats.answerRatePct}% answer rate
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.2)', fontSize: 12, color: 'var(--text2)' }}
        >
          <p style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 4 }}>VAPI error</p>
          {error}
        </div>
      ) : (
        <>
          {/* Stat grid */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <CallStat icon={<Phone size={14} />}        label="Total Calls" value={stats?.totalCalls ?? '–'} color="var(--blue2)" />
            <CallStat icon={<PhoneCall size={14} />}     label="Today"       value={stats?.callsToday ?? '–'} color="var(--cyan)" />
            <CallStat icon={<PhoneMissed size={14} />}   label="Missed"      value={stats?.missedCalls ?? '–'} color="var(--red)" />
            <CallStat icon={<Clock size={14} />}         label="Avg Length"  value={stats ? fmtDuration(stats.avgDurationSec) : '–'} color="var(--amber)" />
          </div>

          {/* Recent calls */}
          <div className="flex flex-col gap-2">
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)' }}>
              Recent Calls
            </p>
            {!stats || stats.recent.length === 0 ? (
              <div
                className="flex items-center justify-center py-6 rounded-xl"
                style={{ background: 'var(--surface2)', color: 'var(--text3)', fontSize: 13 }}
              >
                {loading ? 'Loading calls…' : 'No calls yet'}
              </div>
            ) : (
              stats.recent.slice(0, 5).map(c => {
                const chip = statusChip(c)
                const when = c.startedAt ?? c.endedAt
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-[10px] px-3 py-2.5"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                  >
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                      style={{ background: chip.bg, color: chip.color, flexShrink: 0 }}
                    >
                      {chip.label === 'Live' && (
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: chip.color }} />
                      )}
                      {chip.label}
                    </span>
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 500, flex: 1 }} className="truncate">
                      {c.customerMasked ?? (c.type === 'webCall' ? 'Web call' : 'Unknown caller')}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text2)', flexShrink: 0 }}>
                      {fmtDuration(c.durationSec)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: 'var(--text3)', flexShrink: 0, width: 52, textAlign: 'right' }}>
                      {when ? fmtTime(when) : '—'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

function CallStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-[10px] p-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color }}>
        {icon}
        <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  )
}

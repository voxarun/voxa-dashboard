'use client'

import { useMemo } from 'react'
import type { Order } from '@/types'
import { formatGBP, parseTotal } from '@/lib/utils'

// Decorative fallback phrases shown when there's not enough live order data yet.
const FALLBACK: { color: string; text: string }[] = [
  { color: 'var(--green)', text: 'Call answered · order confirmed · customer notified · receipt printed' },
  { color: 'var(--blue)',  text: 'Booking taken · driver alerted · customer confirmed' },
  { color: 'var(--amber)', text: 'Kitchen alerted · owner notified · order in progress' },
  { color: 'var(--cyan)',  text: 'Enquiry captured · owner alerted instantly · lead saved' },
]

// Scrolling "LIVE" ticker, built from recent orders when available.
export default function LiveTicker({ orders }: { orders: Order[] }) {
  const items = useMemo(() => {
    const live = orders.slice(0, 6).map(o => ({
      color: 'var(--green)',
      text: `${o.customer_name ?? 'Customer'} · order confirmed · ${formatGBP(parseTotal(o.total))} · receipt printed`,
    }))
    return live.length >= 3 ? live : FALLBACK
  }, [orders])

  return (
    <div
      className="flex items-center gap-3 overflow-hidden"
      style={{
        borderTop: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.32)',
        padding: '9px 18px',
        backdropFilter: 'blur(6px)',
      }}
    >
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(0,212,255,0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        Live
      </span>
      <div className="flex-1 overflow-hidden" style={{ height: 16 }}>
        <div className="flex vox-ticker" style={{ gap: 36, whiteSpace: 'nowrap' }}>
          {[...items, ...items].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1.5" style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
              {t.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

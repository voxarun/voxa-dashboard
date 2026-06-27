'use client'

import type { DashboardKpis } from '@/types'

interface OrderDonutProps {
  kpis: DashboardKpis
}

const R = 36
const C = 2 * Math.PI * R // circumference ≈ 226.19

export default function OrderDonutChart({ kpis }: OrderDonutProps) {
  const total = kpis.totalOrders
  const delivered = kpis.deliveredOrders
  const inProgress = kpis.cookingOrders + kpis.readyOrders + kpis.newOrders
  const failed = kpis.failedOrders

  const successPct = total > 0 ? Math.round((delivered / total) * 100) : 0
  const deliveryPct = total > 0 ? Math.round((kpis.deliveryOrders / total) * 100) : 0
  const collectionPct = total > 0 ? Math.round((kpis.collectionOrders / total) * 100) : 0

  // Arc length per segment + cumulative offset (drawn clockwise from top).
  const seg = (n: number) => (total > 0 ? (n / total) * C : 0)
  const gLen = seg(delivered)
  const aLen = seg(inProgress)
  const rLen = seg(failed)

  const arcs = [
    { len: gLen, off: 0,            color: 'var(--green)', show: delivered > 0 },
    { len: aLen, off: -gLen,        color: 'var(--amber)', show: inProgress > 0 },
    { len: rLen, off: -(gLen + aLen), color: 'var(--red)', show: failed > 0 },
  ]

  return (
    <div
      className="rounded-2xl h-full"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '22px 24px' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Order Status</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>This month</p>
        </div>
      </div>

      {/* Donut */}
      <div className="flex items-center gap-6 mb-5">
        <div className="relative flex-shrink-0" style={{ width: 88, height: 88 }}>
          <svg viewBox="0 0 100 100" width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="13" />
            {/* Segments */}
            {arcs.map((a, i) =>
              a.show ? (
                <circle
                  key={i}
                  cx="50" cy="50" r={R}
                  fill="none"
                  stroke={a.color}
                  strokeWidth="13"
                  strokeDasharray={`${a.len} ${C - a.len}`}
                  strokeDashoffset={a.off}
                  strokeLinecap="round"
                />
              ) : null
            )}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>{successPct}%</span>
            <span style={{ fontSize: 8, color: 'var(--text3)' }}>success</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <LegendItem color="var(--green)" label="Delivered" count={delivered} />
          <LegendItem color="var(--amber)" label="In Progress" count={inProgress} />
          <LegendItem color="var(--red)"   label="Failed" count={failed} />
        </div>
      </div>

      {/* Delivery vs Collection bars */}
      <SparkBar label="Delivery"   pct={deliveryPct}   color="var(--blue2)" />
      <SparkBar label="Collection" pct={collectionPct} color="rgba(45,124,246,0.35)" />
    </div>
  )
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text2)' }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      {label} {count}
    </div>
  )
}

function SparkBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mt-2.5">
      <span style={{ fontSize: 12, color: 'var(--text2)', width: 70, flexShrink: 0 }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, transition: 'width 1s ease' }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', width: 35, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  )
}

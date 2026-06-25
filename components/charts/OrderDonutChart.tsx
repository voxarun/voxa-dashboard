'use client'

import type { DashboardKpis } from '@/types'

interface OrderDonutProps {
  kpis: DashboardKpis
}

export default function OrderDonutChart({ kpis }: OrderDonutProps) {
  const total = kpis.totalOrders || 1
  const delivered = kpis.deliveredOrders
  const inProgress = kpis.cookingOrders + kpis.readyOrders + kpis.newOrders
  const failed = kpis.failedOrders

  const successPct = Math.round((delivered / total) * 100)
  const inProgressPct = Math.round((inProgress / total) * 100)
  const failedPct = Math.round((failed / total) * 100)
  const deliveryPct = Math.round((kpis.deliveryOrders / total) * 100)
  const collectionPct = 100 - deliveryPct

  // Conic gradient degrees
  const deliveredDeg = (delivered / total) * 360
  const inProgressDeg = (inProgress / total) * 360

  const conicBg = `conic-gradient(
    var(--green)  0deg ${deliveredDeg}deg,
    var(--amber)  ${deliveredDeg}deg ${deliveredDeg + inProgressDeg}deg,
    var(--red)    ${deliveredDeg + inProgressDeg}deg 360deg
  )`

  return (
    <div
      className="rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '22px 24px' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Order Breakdown</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>By status · all time</p>
        </div>
      </div>

      {/* Donut */}
      <div className="flex items-center gap-6 mb-5">
        <div className="relative flex-shrink-0" style={{ width: 110, height: 110 }}>
          <div
            className="rounded-full"
            style={{ width: 110, height: 110, background: conicBg }}
          />
          {/* Hole */}
          <div
            className="absolute rounded-full flex items-center justify-center"
            style={{
              inset: 18,
              background: 'var(--bg3)',
              fontSize: 18,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            {successPct}%
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <LegendItem color="var(--green)" label="Delivered" count={delivered} />
          <LegendItem color="var(--amber)" label="In Progress" count={inProgress} />
          <LegendItem color="var(--red)"   label="Failed" count={failed} />
        </div>
      </div>

      {/* Delivery vs Collection bars */}
      <SparkBar label="Delivery"   pct={deliveryPct}    color="var(--purple)" />
      <SparkBar label="Collection" pct={collectionPct}  color="var(--blue2)" />
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

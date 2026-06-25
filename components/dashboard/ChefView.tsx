'use client'

import { useState } from 'react'
import type { Order } from '@/types'
import { shortId, relativeTime, asItems } from '@/lib/utils'

interface ChefViewProps {
  orders: Order[]
  onStatusChange: (id: string, status: 'cooking' | 'ready') => Promise<void>
  compact?: boolean
}

export default function ChefView({ orders, onStatusChange, compact = false }: ChefViewProps) {
  const active = orders.filter(o => o.status === 'new' || o.status === 'cooking')

  return (
    <div
      className="rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: compact ? '22px 24px' : 24 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>👨‍🍳 Chef Dashboard</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {active.length} order{active.length !== 1 ? 's' : ''} need attention
          </p>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(255,171,0,0.10)', color: 'var(--amber)' }}
        >
          {active.length} Active
        </span>
      </div>

      {/* Orders */}
      <div className="flex flex-col gap-2.5">
        {active.length === 0 ? (
          <div
            className="flex items-center justify-center py-8 rounded-xl"
            style={{ background: 'var(--surface2)', color: 'var(--text3)', fontSize: 13 }}
          >
            All clear — no pending orders
          </div>
        ) : (
          active.map(order => (
            <ChefOrderCard key={order.id} order={order} onStatusChange={onStatusChange} />
          ))
        )}
      </div>
    </div>
  )
}

function ChefOrderCard({
  order, onStatusChange,
}: {
  order: Order
  onStatusChange: (id: string, status: 'cooking' | 'ready') => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  const handle = async (status: 'cooking' | 'ready') => {
    setLoading(true)
    await onStatusChange(order.id, status)
    setLoading(false)
  }

  const isCooking = order.status === 'cooking'

  return (
    <div
      className="rounded-[10px] p-3 transition-all"
      style={{
        background: isCooking ? 'rgba(255,171,0,0.05)' : 'var(--surface2)',
        border: `1px solid ${isCooking ? 'rgba(255,171,0,0.3)' : 'var(--border)'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: 'var(--blue2)' }}>
          {shortId(order.id)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
          {relativeTime(order.created_at)}
        </span>
      </div>

      {/* Items — NO customer name, NO phone shown to chef */}
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.6 }}>
        {asItems(order.items).map((item, i) => (
          <div key={i}>
            {item.quantity}× {item.name}
            {item.modifiers?.length ? (
              <span style={{ color: 'var(--text3)' }}> ({item.modifiers.join(', ')})</span>
            ) : null}
          </div>
        ))}
        {order.special_instructions && (
          <div style={{ color: 'var(--amber)', marginTop: 4, fontSize: 11 }}>
            ⚠ {order.special_instructions}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
          {order.order_type === 'delivery' ? '📦 Delivery' : '🏪 Collection'}
        </div>
      </div>

      {/* Prep timer */}
      <PrepTimer createdAt={order.created_at} status={order.status} />

      {/* Actions */}
      <div className="flex gap-1.5 mt-2">
        <button
          disabled={loading || isCooking}
          onClick={() => handle('cooking')}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: isCooking ? 'rgba(255,171,0,0.08)' : 'rgba(255,171,0,0.15)',
            color: 'var(--amber)',
            border: 'none',
            cursor: isCooking || loading ? 'default' : 'pointer',
            opacity: isCooking ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          {isCooking ? '🔥 Cooking…' : '🔥 Mark Cooking'}
        </button>
        <button
          disabled={loading}
          onClick={() => handle('ready')}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: 'rgba(0,230,118,0.15)',
            color: 'var(--green)',
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ✅ Mark Ready
        </button>
      </div>
    </div>
  )
}

function PrepTimer({ createdAt, status }: { createdAt: string; status: string }) {
  const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const isLate = mins >= 20

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min((mins / 25) * 100, 100)}%`,
            background: isLate
              ? 'var(--red)'
              : mins >= 15
              ? 'var(--amber)'
              : 'linear-gradient(90deg, var(--blue), var(--cyan))',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--font-jetbrains)',
          fontSize: 11,
          color: isLate ? 'var(--red)' : 'var(--text3)',
          flexShrink: 0,
        }}
      >
        {mins}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

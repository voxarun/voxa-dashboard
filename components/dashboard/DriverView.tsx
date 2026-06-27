'use client'

import { useState } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import type { Order } from '@/types'
import { shortId, relativeTime, asItems } from '@/lib/utils'

interface DriverViewProps {
  orders: Order[]
  onMarkDelivered: (id: string) => Promise<void>
  compact?: boolean
}

export default function DriverView({ orders, onMarkDelivered, compact = false }: DriverViewProps) {
  const activeDeliveries = orders.filter(
    o => o.order_type === 'delivery' && (o.status === 'ready' || o.status === 'new' || o.status === 'cooking')
  )

  return (
    <div
      className="rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: compact ? '22px 24px' : 24 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>🚗 Delivery Dashboard</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {activeDeliveries.length} active {activeDeliveries.length === 1 ? 'delivery' : 'deliveries'}
          </p>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(45,124,246,0.10)', color: 'var(--blue2)' }}
        >
          {activeDeliveries.length} En Route
        </span>
      </div>

      {/* Jobs */}
      <div className="flex flex-col gap-2.5" style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
        {activeDeliveries.length === 0 ? (
          <div
            className="flex items-center justify-center py-8 rounded-xl"
            style={{ background: 'var(--surface2)', color: 'var(--text3)', fontSize: 13 }}
          >
            No active deliveries
          </div>
        ) : (
          activeDeliveries.map(order => (
            <DriverJobCard key={order.id} order={order} onMarkDelivered={onMarkDelivered} />
          ))
        )}
      </div>
    </div>
  )
}

function DriverJobCard({
  order, onMarkDelivered,
}: {
  order: Order
  onMarkDelivered: (id: string) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setLoading(true)
    await onMarkDelivered(order.id)
    setLoading(false)
  }

  // Driver only sees first name, no phone number
  const firstName = order.customer_name?.split(' ')[0] || 'Customer'
  const mapsUrl = order.delivery_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`
    : null

  return (
    <div
      className="rounded-[10px] p-3"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
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

      {/* Route — shows address but NOT phone, NOT total */}
      <div className="flex items-center gap-2 mb-2" style={{ fontSize: 12, color: 'var(--text2)' }}>
        <MapPin size={12} style={{ color: 'var(--blue2)', flexShrink: 0 }} />
        <span style={{ color: '#fff', fontWeight: 500 }}>{firstName}</span>
        <span style={{ color: 'var(--text3)' }}>→</span>
        <span className="truncate">{order.delivery_address || '—'}</span>
      </div>

      {/* Brief item summary */}
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
        {(() => {
          const items = asItems(order.items)
          return (
            <>
              {items.slice(0, 2).map((item, i) => (
                <span key={i}>{item.quantity}× {item.name}{i === 0 && items.length > 1 ? ', ' : ''}</span>
              ))}
              {items.length > 2 && <span> +{items.length - 2} more</span>}
            </>
          )
        })()}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2">
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: 'rgba(45,124,246,0.12)',
              color: 'var(--blue2)',
              textDecoration: 'none',
              border: '1px solid rgba(45,124,246,0.2)',
            }}
          >
            <Navigation size={12} />
            Maps
          </a>
        )}
        <button
          disabled={loading}
          onClick={handle}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: 'rgba(0,230,118,0.15)',
            color: 'var(--green)',
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Updating…' : '✅ Mark Delivered'}
        </button>
      </div>
    </div>
  )
}

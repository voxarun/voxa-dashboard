'use client'

import { useState } from 'react'
import { Download, SlidersHorizontal, Plus, ChevronDown } from 'lucide-react'
import type { Order } from '@/types'
import { formatItems, parseTotal, relativeTime, shortId, STATUS_STYLES, asItems } from '@/lib/utils'

interface OrdersTableProps {
  orders: Order[]
  onStatusChange?: (id: string, status: string) => Promise<void>
  showAllColumns?: boolean
}

export default function OrdersTable({ orders, onStatusChange, showAllColumns = false }: OrdersTableProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  const handleStatus = async (id: string, status: string) => {
    if (!onStatusChange) return
    setUpdating(id)
    await onStatusChange(id, status)
    setUpdating(null)
  }

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Live Order Feed</h2>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            Real-time orders from Voxa AI · {orders.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <TblBtn icon={<Download size={14} />}>Export CSV</TblBtn>
          <TblBtn icon={<SlidersHorizontal size={14} />}>Filter</TblBtn>
          <TblBtn primary icon={<Plus size={14} />}>New Order</TblBtn>
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Head */}
        <div
          className="grid px-5 py-3"
          style={{
            gridTemplateColumns: '110px 1fr 180px 130px 110px 100px 90px',
            background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {['Order ID', 'Customer & Address', 'Items', 'Status', 'Type', 'Value', 'Time'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {orders.length === 0 ? (
          <div className="flex items-center justify-center py-16" style={{ color: 'var(--text3)', fontSize: 14 }}>
            No orders yet. Waiting for Voxa AI…
          </div>
        ) : (
          orders.map(order => (
            <OrderRow
              key={order.id}
              order={order}
              loading={updating === order.id}
              onStatusChange={handleStatus}
            />
          ))
        )}
      </div>
    </section>
  )
}

function OrderRow({
  order, loading, onStatusChange,
}: {
  order: Order
  loading: boolean
  onStatusChange: (id: string, status: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const style = STATUS_STYLES[order.status] ?? STATUS_STYLES.new
  const total = parseTotal(order.total)

  return (
    <>
      <div
        className="grid px-5 items-center transition-colors duration-150 cursor-default"
        style={{
          gridTemplateColumns: '110px 1fr 180px 130px 110px 100px 90px',
          paddingTop: 14,
          paddingBottom: 14,
          borderBottom: '1px solid var(--border)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        onClick={() => setOpen(v => !v)}
      >
        {/* ID */}
        <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 12, color: 'var(--blue2)' }}>
          {shortId(order.id)}
        </div>

        {/* Customer */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
            {order.customer_name || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
            {order.order_type === 'collection'
              ? 'Collection — In store'
              : order.delivery_address || '—'}
          </div>
        </div>

        {/* Items */}
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          {formatItems(order.items)}
        </div>

        {/* Status chip */}
        <div>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: style.bg, color: style.text }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: style.dot,
                animation: order.status === 'cooking' ? 'pulse-dot 1.5s infinite' : undefined,
              }}
            />
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>

        {/* Type */}
        <div>
          <span
            className="px-2 py-0.5 rounded-md text-xs font-semibold"
            style={{
              background: order.order_type === 'delivery'
                ? 'rgba(124,58,237,0.12)'
                : 'rgba(45,124,246,0.12)',
              color: order.order_type === 'delivery' ? '#a78bfa' : 'var(--blue2)',
            }}
          >
            {order.order_type ? order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1) : '—'}
          </span>
        </div>

        {/* Value */}
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
          {total > 0 ? `£${total.toFixed(2)}` : '—'}
        </div>

        {/* Time */}
        <div
          className="flex items-center gap-1"
          style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: 'var(--text3)' }}
        >
          {relativeTime(order.created_at)}
          <ChevronDown
            size={12}
            style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', marginLeft: 2 }}
          />
        </div>
      </div>

      {/* Expandable detail row */}
      {open && (
        <div
          className="px-5 pb-4"
          style={{ borderBottom: '1px solid var(--border)', background: 'rgba(45,124,246,0.03)' }}
        >
          <div className="flex items-start gap-8 pt-3">
            {/* Order detail */}
            <div className="flex-1">
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
                Full Items
              </p>
              {asItems(order.items).map((item, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
                  <span style={{ color: '#fff', fontWeight: 500 }}>{item.quantity}× {item.name}</span>
                  {item.modifiers?.length ? (
                    <span style={{ color: 'var(--text3)' }}> ({item.modifiers.join(', ')})</span>
                  ) : null}
                </div>
              ))}
              {order.special_instructions && (
                <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 8 }}>
                  ⚠ {order.special_instructions}
                </p>
              )}
            </div>

            {/* Status actions */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
                Update Status
              </p>
              <div className="flex gap-2">
                {['new', 'cooking', 'ready', 'delivered'].map(s => (
                  <button
                    key={s}
                    disabled={loading || order.status === s}
                    onClick={e => { e.stopPropagation(); onStatusChange(order.id, s) }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: order.status === s ? STATUS_STYLES[s]?.bg : 'var(--surface2)',
                      color: order.status === s ? STATUS_STYLES[s]?.text : 'var(--text2)',
                      border: `1px solid ${order.status === s ? STATUS_STYLES[s]?.dot + '40' : 'var(--border)'}`,
                      cursor: order.status === s || loading ? 'default' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment info */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
                Payment
              </p>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                {order.payment_method || '—'}
              </p>
              {order.call_id && (
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--font-jetbrains)' }}>
                  Call: {order.call_id.slice(0, 12)}…
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TblBtn({
  children, icon, primary,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  primary?: boolean
}) {
  return (
    <button
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: primary ? 'var(--blue)' : 'var(--surface)',
        color: primary ? '#fff' : 'var(--text2)',
        border: `1px solid ${primary ? 'var(--blue)' : 'var(--border)'}`,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        if (!primary) {
          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface2)'
          ;(e.currentTarget as HTMLElement).style.color = '#fff'
        }
      }}
      onMouseLeave={e => {
        if (!primary) {
          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text2)'
        }
      }}
    >
      {icon}
      {children}
    </button>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/types'
import Topbar      from '@/components/ui/Topbar'
import OrdersTable from '@/components/dashboard/OrdersTable'

const STATUS_FILTERS = ['all', 'new', 'cooking', 'ready', 'delivered', 'failed'] as const

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setOrders(data as Order[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
    const channel = supabase
      .channel('orders-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        if (payload.eventType === 'INSERT') setOrders(prev => [payload.new as Order, ...prev])
        if (payload.eventType === 'UPDATE')
          setOrders(prev => prev.map(o => o.id === (payload.new as Order).id ? payload.new as Order : o))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => typeFilter === 'all' || o.order_type === typeFilter)

  return (
    <>
      <Topbar title="Orders" subtitle={`${filtered.length} orders`} notifCount={orders.filter(o => o.status === 'new').length} />

      <div className="dash-page">
        {/* Status filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: filter === s ? 'var(--blue)' : 'var(--surface)',
                color: filter === s ? '#fff' : 'var(--text2)',
                border: `1px solid ${filter === s ? 'var(--blue)' : 'var(--border)'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {s === 'all' ? `All (${orders.length})` : `${s} (${orders.filter(o => o.status === s).length})`}
            </button>
          ))}
          <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
          {(['all', 'delivery', 'collection'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: typeFilter === t ? 'var(--purple)' : 'var(--surface)',
                color: typeFilter === t ? '#fff' : 'var(--text2)',
                border: `1px solid ${typeFilter === t ? 'var(--purple)' : 'var(--border)'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: 'var(--text3)', fontSize: 14 }}>
            Loading orders…
          </div>
        ) : (
          <OrdersTable orders={filtered} onStatusChange={handleStatusChange} showAllColumns />
        )}
      </div>
    </>
  )
}

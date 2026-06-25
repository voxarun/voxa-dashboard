'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/types'
import Topbar     from '@/components/ui/Topbar'
import DriverView from '@/components/dashboard/DriverView'

export default function DriverPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at, order_type, items, delivery_address, customer_name, status')
      // Driver sees: order ID, items (brief), delivery address, customer first name ONLY
      // NO customer_phone, NO total, NO payment_method, NO call logs
      .eq('order_type', 'delivery')
      .in('status', ['ready', 'new', 'cooking'])
      .order('created_at', { ascending: true })
    if (!error && data) setOrders(data as Order[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel('driver-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        if (payload.eventType === 'UPDATE') {
          const o = payload.new as Order
          if (o.order_type === 'delivery' && ['ready', 'new', 'cooking'].includes(o.status)) {
            setOrders(prev => {
              const exists = prev.find(x => x.id === o.id)
              return exists ? prev.map(x => x.id === o.id ? o : x) : [...prev, o]
            })
          } else {
            setOrders(prev => prev.filter(x => x.id !== o.id))
          }
        }
        if (payload.eventType === 'INSERT') {
          const o = payload.new as Order
          if (o.order_type === 'delivery') setOrders(prev => [...prev, o])
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  const handleMarkDelivered = async (id: string) => {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', id)
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  return (
    <>
      <Topbar
        title="Delivery Dashboard"
        subtitle={`${orders.length} active ${orders.length === 1 ? 'delivery' : 'deliveries'}`}
        notifCount={orders.filter(o => o.status === 'ready').length}
      />

      <div style={{ padding: '28px 32px' }}>
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4 mb-6" style={{ maxWidth: 480 }}>
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)' }}
          >
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--green)' }}>
              {orders.filter(o => o.status === 'ready').length}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Ready for pickup</div>
          </div>
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(45,124,246,0.08)', border: '1px solid rgba(45,124,246,0.2)' }}
          >
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--blue2)' }}>
              {orders.filter(o => o.status === 'new' || o.status === 'cooking').length}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Being prepared</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: 'var(--text3)', fontSize: 14 }}>
            Loading deliveries…
          </div>
        ) : (
          <DriverView orders={orders} onMarkDelivered={handleMarkDelivered} />
        )}
      </div>
    </>
  )
}

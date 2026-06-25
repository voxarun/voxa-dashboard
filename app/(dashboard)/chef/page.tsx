'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/types'
import Topbar    from '@/components/ui/Topbar'
import ChefView  from '@/components/dashboard/ChefView'

export default function ChefPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at, order_type, items, special_instructions, status')
      // Chef only sees: order ID, items, special requests, order type, time, status
      // NO customer_name, customer_phone, delivery_address, total, payment_method
      .in('status', ['new', 'cooking'])
      .order('created_at', { ascending: true })
    if (!error && data) setOrders(data as Order[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel('chef-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        if (payload.eventType === 'INSERT') {
          const o = payload.new as Order
          if (['new', 'cooking'].includes(o.status)) setOrders(prev => [...prev, o])
        }
        if (payload.eventType === 'UPDATE') {
          const o = payload.new as Order
          if (['new', 'cooking'].includes(o.status)) {
            setOrders(prev => {
              const exists = prev.find(x => x.id === o.id)
              return exists ? prev.map(x => x.id === o.id ? o : x) : [...prev, o]
            })
          } else {
            setOrders(prev => prev.filter(x => x.id !== o.id))
          }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  const handleStatusChange = async (id: string, status: 'cooking' | 'ready') => {
    await supabase.from('orders').update({ status }).eq('id', id)
    if (status === 'ready') {
      setOrders(prev => prev.filter(o => o.id !== id))
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    }
  }

  const newCount = orders.filter(o => o.status === 'new').length
  const cookingCount = orders.filter(o => o.status === 'cooking').length

  return (
    <>
      <Topbar
        title="Kitchen View"
        subtitle={`${newCount} new · ${cookingCount} cooking`}
        notifCount={newCount}
      />

      <div style={{ padding: '28px 32px' }}>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'New Orders', count: newCount, color: 'var(--blue2)', bg: 'rgba(45,124,246,0.10)' },
            { label: 'Cooking',    count: cookingCount, color: 'var(--amber)', bg: 'rgba(255,171,0,0.10)' },
            { label: 'Ready',      count: 0, color: 'var(--green)', bg: 'rgba(0,230,118,0.10)' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-2xl p-5"
              style={{ background: stat.bg, border: `1px solid ${stat.color}30` }}
            >
              <div style={{ fontSize: 32, fontWeight: 800, color: stat.color }}>{stat.count}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: 'var(--text3)', fontSize: 14 }}>
            Loading kitchen queue…
          </div>
        ) : (
          <ChefView orders={orders} onStatusChange={handleStatusChange} />
        )}
      </div>
    </>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { computeKpis, buildDailyChartData, formatGBP } from '@/lib/utils'
import { useCallLogs } from '@/lib/useCallLogs'
import type { Order } from '@/types'

import Topbar      from '@/components/ui/Topbar'
import KpiCard     from '@/components/dashboard/KpiCard'
import OrdersTable from '@/components/dashboard/OrdersTable'
import ChefView    from '@/components/dashboard/ChefView'
import DriverView  from '@/components/dashboard/DriverView'
import AIInsights  from '@/components/dashboard/AIInsights'
import AgentStatus from '@/components/dashboard/AgentStatus'
import CallStatus  from '@/components/dashboard/CallStatus'
import CallsOrdersChart from '@/components/charts/CallsOrdersChart'
import OrderDonutChart  from '@/components/charts/OrderDonutChart'

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // ── Live VAPI call stats (instant via Supabase Realtime on call_logs) ──
  const { stats: callStats, loading: callsLoading, error: callsError } = useCallLogs()

  // ── Fetch all orders ──────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data as Order[])
    }
    setLoading(false)
  }, [])

  // ── Realtime subscription ─────────────────────────────────────────────
  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new as Order, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev =>
            prev.map(o => (o.id === (payload.new as Order).id ? (payload.new as Order) : o))
          )
        } else if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.id !== (payload.old as Order).id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  // ── Status update ─────────────────────────────────────────────────────
  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    }
  }

  // ── Computed values ───────────────────────────────────────────────────
  const kpis = computeKpis(orders)
  const baseChart = buildDailyChartData(orders)
  // Overlay real VAPI call counts onto the chart when available; otherwise the
  // "calls" series falls back to the order-count proxy from buildDailyChartData.
  const chartData = callStats
    ? baseChart.map((d, i) => ({ ...d, calls: callStats.byDay[i]?.calls ?? d.calls }))
    : baseChart
  const activeCount = orders.filter(o => o.status === 'new' || o.status === 'cooking').length

  return (
    <>
      <Topbar
        title="Command Centre"
        subtitle="Bradford Spice House · Live Dashboard"
        notifCount={activeCount}
      />

      <div style={{ padding: '28px 32px' }}>

        {/* ── Brain Hero ─────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-[20px] mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(5,8,21,0.9), rgba(8,12,26,0.9))',
            border: '1px solid var(--border2)',
            padding: '32px 36px',
          }}
        >
          {/* Glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 600px 300px at 70% 50%, rgba(45,124,246,0.08) 0%, transparent 60%)' }}
          />

          <div className="relative flex items-center justify-between">
            <div style={{ maxWidth: 520 }}>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
                Good {getGreeting()}, Hammad 👋
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8, color: '#fff' }}>
                Your AI workforce is{' '}
                <span
                  style={{
                    background: 'linear-gradient(90deg, var(--blue2), var(--cyan))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  running everything.
                </span>
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
                {loading
                  ? 'Loading your dashboard data…'
                  : kpis.totalOrders > 0
                  ? `Voxa has captured ${kpis.totalOrders} orders totalling ${formatGBP(kpis.totalRevenue)}. Every call answered. Every order logged. Zero missed.`
                  : 'Voxa is live and ready. Orders will appear here as soon as the first call comes in.'}
              </p>
            </div>

            {/* Hero Stats */}
            <div className="flex gap-8 relative z-10">
              <HeroStat value={kpis.totalOrders.toString()} label="Orders" color="var(--blue2)" />
              <HeroStat value={formatGBP(kpis.totalRevenue)} label="Revenue" color="var(--green)" />
              <HeroStat
                value={`${kpis.totalOrders * 2}h`}
                label="Hours Saved"
                color="var(--cyan)"
              />
            </div>
          </div>

          {/* Orb decoration */}
          <div className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden" style={{ width: 280 }}>
            <div
              className="absolute animate-orb-breathe"
              style={{
                top: '50%', right: 30,
                transform: 'translateY(-50%)',
                width: 160, height: 160,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 38% 36%, rgba(180,150,255,0.6) 0%, rgba(45,124,246,0.5) 40%, rgba(0,212,255,0.2) 70%, transparent 85%)',
                boxShadow: '0 0 40px rgba(45,124,246,0.4), 0 0 80px rgba(45,124,246,0.2)',
              }}
            />
            <div
              className="absolute animate-ring-spin"
              style={{
                top: '50%', right: 30,
                transform: 'translate(50%, -50%)',
                width: 200, height: 200,
                borderRadius: '50%',
                border: '1px solid rgba(45,124,246,0.15)',
              }}
            />
          </div>
        </div>

        {/* ── KPI Grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiCard
            icon="📞" label="Total Orders" value={kpis.totalOrders}
            sub={`${kpis.todayOrders} today`} accent="blue"
          />
          <KpiCard
            icon="✅" label="Delivered" value={kpis.deliveredOrders}
            sub={kpis.totalOrders > 0 ? `${Math.round((kpis.deliveredOrders / kpis.totalOrders) * 100)}% success rate` : '—'}
            accent="green"
          />
          <KpiCard
            icon="🛒" label="Active Orders" value={kpis.newOrders + kpis.cookingOrders + kpis.readyOrders}
            sub={`${kpis.cookingOrders} cooking · ${kpis.readyOrders} ready`}
            accent="amber"
          />
          <KpiCard
            icon="💰" label="Revenue" value={formatGBP(kpis.totalRevenue)}
            sub={`Avg ${formatGBP(kpis.avgOrderValue)} per order`}
            accent="cyan"
          />
          <KpiCard
            icon="🚗" label="Delivery Orders" value={kpis.deliveryOrders}
            sub={kpis.totalOrders > 0 ? `${Math.round((kpis.deliveryOrders / kpis.totalOrders) * 100)}% of total` : '—'}
            accent="purple"
          />
          <KpiCard
            icon="🏪" label="Collection Orders" value={kpis.collectionOrders}
            sub={kpis.totalOrders > 0 ? `${Math.round((kpis.collectionOrders / kpis.totalOrders) * 100)}% of total` : '—'}
            accent="blue"
          />
          <KpiCard
            icon="❌" label="Failed Orders" value={kpis.failedOrders}
            sub={kpis.totalOrders > 0 ? `${Math.round((kpis.failedOrders / kpis.totalOrders) * 100)}% fail rate` : '—'}
            accent="red"
          />
          <KpiCard
            icon="📅" label="Today's Revenue" value={formatGBP(kpis.todayRevenue)}
            sub={`${kpis.todayOrders} orders today`}
            accent="green"
          />
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────────── */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <CallsOrdersChart data={chartData} />
          </div>
          <OrderDonutChart kpis={kpis} />
        </div>

        {/* ── Live Orders Table ──────────────────────────────────────────── */}
        <div className="mb-6">
          {loading ? (
            <LoadingShimmer />
          ) : (
            <OrdersTable orders={orders} onStatusChange={handleStatusChange} />
          )}
        </div>

        {/* ── Live Call Status (VAPI) ────────────────────────────────────── */}
        <div className="mb-6">
          <CallStatus stats={callStats} loading={callsLoading} error={callsError} />
        </div>

        {/* ── Bottom Grid: Chef / Driver / AI Insights ───────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <ChefView
            orders={orders}
            onStatusChange={handleStatusChange as any}
            compact
          />
          <DriverView
            orders={orders}
            onMarkDelivered={(id) => handleStatusChange(id, 'delivered')}
            compact
          />
          <AIInsights kpis={kpis} />
        </div>

        {/* ── Agent Status ───────────────────────────────────────────────── */}
        {/* <div className="mb-6">
          <AgentStatus
            ordersProcessed={kpis.totalOrders}
            voiceAnswerRate={callStats?.answerRatePct}
            voiceCallCount={callStats?.totalCalls}
          />
        </div> */}

        {/* ── Plan Tiers ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Dashboard Access by Plan</h2>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Feature tiers — Basic → Pro → Empire</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <PlanCard
              tier="Tier 1" name="Basic" price="£149"
              features={[
                'AI voice agent — answers all calls',
                'Total calls & orders KPIs',
                'Basic order log (last 7 days)',
                'PrintNode automatic printing',
                'SMS to customer',
              ]}
              locked={['Advanced analytics', 'Chef & driver dashboards', 'AI insights', 'Live call feed', 'Revenue analytics']}
            />
            <PlanCard
              tier="Tier 2" name="Pro" price="£299"
              badge="Most Popular" badgeStyle="blue"
              features={[
                'Everything in Basic',
                'Full KPI dashboard (all 8 metrics)',
                '30-day order history + export',
                'Chef dashboard — status updates',
                'Driver dashboard — delivery tracking',
                'WhatsApp to owner + chef',
                'Calls & orders bar charts',
                'Live call feed',
              ]}
              locked={['AI insights & recommendations', 'Heatmaps & peak analysis', 'Customer analytics']}
            />
            <PlanCard
              tier="Tier 3" name="Empire" price="£499"
              badge="Empire" badgeStyle="cyan" highlight
              features={[
                'Everything in Pro',
                '🧠 AI insights & recommendations',
                'Revenue forecasting',
                'Heatmaps — peak hours & days',
                'Customer behaviour analytics',
                'Agent health monitoring',
                'Outbound missed-call follow-up AI',
                'Auto Google review posting',
                'Multi-location support',
                'White-label dashboard branding',
              ]}
            />
          </div>
        </div>

      </div>
    </>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeroStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center">
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function PlanCard({
  tier, name, price, badge, badgeStyle, highlight = false,
  features, locked = [],
}: {
  tier: string; name: string; price: string
  badge?: string; badgeStyle?: 'blue' | 'cyan'
  highlight?: boolean
  features: string[]; locked?: string[]
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: highlight
          ? 'linear-gradient(145deg, rgba(0,212,255,0.06), rgba(45,124,246,0.04))'
          : name === 'Pro'
          ? 'linear-gradient(145deg, rgba(45,124,246,0.08), rgba(124,58,237,0.04))'
          : 'var(--surface)',
        border: highlight
          ? '1px solid rgba(0,212,255,0.3)'
          : name === 'Pro'
          ? '1px solid rgba(45,124,246,0.4)'
          : '1px solid var(--border)',
      }}
    >
      {badge && (
        <span
          className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
          style={{
            background: badgeStyle === 'cyan'
              ? 'linear-gradient(90deg, var(--cyan), var(--blue))'
              : 'var(--blue)',
            color: badgeStyle === 'cyan' ? '#000' : '#fff',
          }}
        >
          {badge}
        </span>
      )}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
        {tier}
      </p>
      <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: '#fff', marginBottom: 4 }}>{name}</p>
      <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px', color: '#fff' }}>
        {price}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text2)' }}>/mo</span>
      </p>
      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
      <div className="flex flex-col gap-2">
        {features.map(f => (
          <div key={f} className="flex items-start gap-2" style={{ fontSize: 12, color: 'var(--text2)' }}>
            <span style={{ color: 'var(--blue2)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
            {f}
          </div>
        ))}
        {locked.map(f => (
          <div key={f} className="flex items-start gap-2" style={{ fontSize: 12, color: 'var(--text2)', opacity: 0.35 }}>
            <span style={{ color: 'var(--text3)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>—</span>
            {f}
          </div>
        ))}
      </div>
    </div>
  )
}

function LoadingShimmer() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', height: 240 }}
    >
      <div className="p-5 flex items-center gap-3">
        <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--surface2)' }} />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="px-5 py-3.5 flex gap-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="h-3 rounded animate-pulse" style={{ width: 80, background: 'var(--surface2)' }} />
          <div className="h-3 rounded animate-pulse flex-1" style={{ background: 'var(--surface2)' }} />
          <div className="h-3 rounded animate-pulse" style={{ width: 60, background: 'var(--surface2)' }} />
        </div>
      ))}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

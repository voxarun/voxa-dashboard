'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShoppingBag, CheckCircle2, Flame, PoundSterling,
  Truck, Store, XCircle, CalendarDays,
} from 'lucide-react'
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
// import AIAgents    from '@/components/dashboard/AIAgents'  // section commented out
import CallStatus  from '@/components/dashboard/CallStatus'
import LiveTicker  from '@/components/dashboard/LiveTicker'
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

  // Order Status donut reflects the current calendar month only.
  const now = new Date()
  const monthOrders = orders.filter(o => {
    const d = new Date(o.created_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const monthKpis = computeKpis(monthOrders)

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

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[20px] mb-6" style={{ height: 260 }}>
          {/* Photo */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/hero.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center 40%',
              filter: 'brightness(0.55) saturate(1.15)',
            }}
          />
          {/* Gradient overlay for text legibility */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(100deg, rgba(3,6,15,0.96) 0%, rgba(3,6,15,0.8) 42%, rgba(3,6,15,0.28) 75%, rgba(3,6,15,0.08) 100%)',
            }}
          />

          <div className="relative z-10 h-full flex flex-col">
            <div className="flex-1 flex items-center justify-between" style={{ padding: '0 40px' }}>
            {/* Left text */}
            <div>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
                Good {getGreeting()}, Hammad 👋
              </p>
              <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-2px', lineHeight: 1, marginBottom: 10, color: '#fff' }}>
                You relax.<br />
                <span
                  style={{
                    background: 'linear-gradient(90deg, var(--blue2), var(--cyan))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Voxa runs.
                </span>
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text2)', maxWidth: 380, lineHeight: 1.6 }}>
                {loading
                  ? 'Loading your dashboard data…'
                  : kpis.totalOrders > 0
                  ? `Your AI workforce captured ${kpis.totalOrders} orders totalling ${formatGBP(kpis.totalRevenue)} and saved you ${kpis.totalOrders * 2} hours. Not one customer went unanswered.`
                  : 'Voxa is live and ready. Orders will appear here as soon as the first call comes in.'}
              </p>
            </div>

            {/* Right cluster */}
            <div className="flex flex-col items-end gap-3.5">
              {/* Status chip */}
              <div
                className="flex items-center gap-2.5"
                style={{
                  background: 'rgba(18,26,46,0.62)',
                  border: '1px solid rgba(45,124,246,0.28)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* Mini orb — same multi-ring style as the big panel orb, scaled down */}
                <div className="relative" style={{ width: 36, height: 36, flexShrink: 0 }}>
                  <div className="absolute inset-0 rounded-full vox-spin-slow" style={{ border: '1px solid rgba(45,124,246,0.25)' }}>
                    <span style={{ position: 'absolute', top: -2, left: 'calc(50% - 2px)', width: 4, height: 4, borderRadius: '50%', background: '#2D7CF6', boxShadow: '0 0 6px #2D7CF6' }} />
                  </div>
                  <div className="absolute rounded-full vox-spin-mid" style={{ inset: 5, border: '1px dashed rgba(0,212,255,0.18)' }}>
                    <span style={{ position: 'absolute', bottom: -1.5, left: 'calc(50% - 1.5px)', width: 3, height: 3, borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 5px var(--cyan)' }} />
                  </div>
                  <div className="absolute rounded-full vox-breathe" style={{ inset: 10, background: 'radial-gradient(circle at 38% 34%, rgba(130,200,255,0.45), rgba(0,100,220,0.22) 60%, transparent)' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="vox-core" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cyan)' }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Voxa is running</p>
                  <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>All systems live · 24/7</p>
                </div>
              </div>

              {/* Hero Stats */}
              <div className="flex items-center gap-6">
                <HeroStat value={(callStats?.totalCalls ?? 0).toString()} label="Calls" color="var(--blue2)" />
                <span style={{ width: 1, height: 50, background: 'var(--border)' }} />
                <HeroStat value={formatGBP(kpis.totalRevenue)} label="Revenue" color="var(--green)" />
                <span style={{ width: 1, height: 50, background: 'var(--border)' }} />
                <HeroStat value={`${kpis.totalOrders * 2}h`} label="Hours Saved" color="var(--cyan)" />
              </div>
            </div>
            </div>

            {/* Live ticker — pinned to the bottom of the hero */}
            <LiveTicker orders={orders} />
          </div>
        </div>

        {/* ── KPI Grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiCard
            Icon={ShoppingBag} label="Total Orders" value={kpis.totalOrders}
            sub={`${kpis.todayOrders} today`} accent="blue"
          />
          <KpiCard
            Icon={CheckCircle2} label="Delivered" value={kpis.deliveredOrders}
            sub={kpis.totalOrders > 0 ? `${Math.round((kpis.deliveredOrders / kpis.totalOrders) * 100)}% success rate` : '—'}
            accent="green"
          />
          <KpiCard
            Icon={Flame} label="Active Orders" value={kpis.newOrders + kpis.cookingOrders + kpis.readyOrders}
            sub={`${kpis.cookingOrders} cooking · ${kpis.readyOrders} ready`}
            accent="amber"
          />
          <KpiCard
            Icon={PoundSterling} label="Revenue" value={formatGBP(kpis.totalRevenue)}
            sub={`Avg ${formatGBP(kpis.avgOrderValue)} per order`}
            accent="cyan"
          />
          <KpiCard
            Icon={Truck} label="Delivery Orders" value={kpis.deliveryOrders}
            sub={kpis.totalOrders > 0 ? `${Math.round((kpis.deliveryOrders / kpis.totalOrders) * 100)}% of total` : '—'}
            accent="purple"
          />
          <KpiCard
            Icon={Store} label="Collection Orders" value={kpis.collectionOrders}
            sub={kpis.totalOrders > 0 ? `${Math.round((kpis.collectionOrders / kpis.totalOrders) * 100)}% of total` : '—'}
            accent="blue"
          />
          <KpiCard
            Icon={XCircle} label="Failed Orders" value={kpis.failedOrders}
            sub={kpis.totalOrders > 0 ? `${Math.round((kpis.failedOrders / kpis.totalOrders) * 100)}% fail rate` : '—'}
            accent="red"
          />
          <KpiCard
            Icon={CalendarDays} label="Today's Revenue" value={formatGBP(kpis.todayRevenue)}
            sub={`${kpis.todayOrders} orders today`}
            accent="green"
          />
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────────── */}
        <div className="grid gap-4 mb-6 items-stretch" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="h-full" style={{ gridColumn: 'span 2' }}>
            <CallsOrdersChart data={chartData} />
          </div>
          <OrderDonutChart kpis={monthKpis} />
        </div>

        {/* ── Live Orders Table ──────────────────────────────────────────── */}
        <div className="mb-6">
          {loading ? (
            <LoadingShimmer />
          ) : (
            <OrdersTable orders={orders} onStatusChange={handleStatusChange} />
          )}
        </div>

        {/* ── Chef / Driver / AI Insights ────────────────────────────────── */}
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

        {/* ── Live Call Feed ─────────────────────────────────────────────── */}
        <div className="mb-6">
          <CallStatus stats={callStats} loading={callsLoading} error={callsError} />
          {/* AI Agents section — commented out per request
          <AIAgents callStats={callStats} ordersProcessed={kpis.totalOrders} />
          */}
        </div>

        {/* ── Plan Tiers (hidden per request) ─────────────────────────────── */}
        {false && (
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
        )}

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

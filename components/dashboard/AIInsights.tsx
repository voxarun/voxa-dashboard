import type { DashboardKpis } from '@/types'
import { formatGBP } from '@/lib/utils'

interface AIInsightsProps {
  kpis: DashboardKpis
}

export default function AIInsights({ kpis }: AIInsightsProps) {
  const insights = generateInsights(kpis)

  return (
    <div
      className="rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '22px 24px' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>🧠 Voxa AI Insights</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Live intelligence from your data</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="flex gap-3 items-start rounded-[10px] p-3"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          >
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{insight.icon}</span>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
              <strong style={{ color: '#fff', fontWeight: 600 }}>{insight.title}</strong>
              {' '}— {insight.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function generateInsights(kpis: DashboardKpis) {
  const insights = []
  const successRate = kpis.totalOrders > 0
    ? Math.round((kpis.deliveredOrders / kpis.totalOrders) * 100)
    : 0
  const deliveryPct = kpis.totalOrders > 0
    ? Math.round((kpis.deliveryOrders / kpis.totalOrders) * 100)
    : 0

  insights.push({
    icon: '📈',
    title: `${kpis.totalOrders} orders captured`,
    body: kpis.totalOrders > 0
      ? `Total revenue of ${formatGBP(kpis.totalRevenue)} with avg order value ${formatGBP(kpis.avgOrderValue)}.`
      : 'Orders will appear here once Voxa AI starts processing calls.',
  })

  if (kpis.totalOrders > 0) {
    insights.push({
      icon: successRate >= 90 ? '🎯' : '⚠️',
      title: `${successRate}% delivery success rate`,
      body: successRate >= 90
        ? 'Excellent performance. Keep monitoring for any late orders.'
        : `${kpis.failedOrders} failed orders this period. Check for patterns in failures.`,
    })

    insights.push({
      icon: '🚗',
      title: `${deliveryPct}% delivery vs ${100 - deliveryPct}% collection`,
      body: deliveryPct > 70
        ? 'High delivery demand — ensure driver coverage during peak hours.'
        : 'Good mix of delivery and collection orders.',
    })
  }

  if (kpis.cookingOrders + kpis.readyOrders > 0) {
    insights.push({
      icon: '⏳',
      title: `${kpis.cookingOrders + kpis.readyOrders} orders in progress`,
      body: `${kpis.cookingOrders} cooking, ${kpis.readyOrders} ready for pickup/dispatch.`,
    })
  }

  // Pad to 4 insights with a placeholder if needed
  while (insights.length < 4) {
    insights.push({
      icon: '💡',
      title: 'AI insights improving',
      body: 'More intelligence unlocks as order volume grows. Keep Voxa running.',
    })
  }

  return insights.slice(0, 4)
}

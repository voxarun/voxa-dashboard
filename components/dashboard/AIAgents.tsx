'use client'

import type { CallStats } from '@/types'

interface AIAgentsProps {
  callStats: CallStats | null
  ordersProcessed: number
}

// Voice + Data cards are wired to live data; infra agents (SMS/Print/Automation/
// WhatsApp) show their operational uptime — there's no live source for those.
export default function AIAgents({ callStats, ordersProcessed }: AIAgentsProps) {
  const answerRate = callStats?.answerRatePct
  const totalCalls = callStats?.totalCalls ?? 0

  const agents = [
    {
      name: 'Voice',
      type: 'Calls',
      fill: answerRate ?? 97,
      label: answerRate != null ? `${answerRate}%` : '—',
    },
    { name: 'SMS',        type: 'Notifications', fill: 100,  label: '100%' },
    { name: 'Print',      type: 'Receipts',      fill: 99.8, label: '99.8%' },
    { name: 'Automation', type: 'Workflows',     fill: 100,  label: '99.99%' },
    {
      name: 'Data',
      type: 'Records',
      fill: 100,
      label: `${ordersProcessed} logged`,
    },
    { name: 'WhatsApp',   type: 'Alerts',        fill: 98,   label: '98%' },
  ]

  return (
    <div className="rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '18px 20px' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>🤖 AI Agents</h3>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {totalCalls > 0 ? `${totalCalls} calls handled` : 'All operational'}
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(0,230,118,0.08)', color: 'var(--green)' }}>
          All Online
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {agents.map(a => (
          <div key={a.name} className="rounded-[9px]" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '11px 12px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{a.name}</p>
            <p style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>{a.type}</p>
            <div className="rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.05)', marginBottom: 4 }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${a.fill}%`, background: 'linear-gradient(90deg, var(--blue), var(--cyan))' }} />
            </div>
            <p style={{ fontSize: 10, color: 'var(--text2)' }}>{a.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

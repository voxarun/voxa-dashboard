interface AgentStatusProps {
  ordersProcessed: number
  voiceAnswerRate?: number   // real VAPI answer rate; overrides the static Voice Agent value
  voiceCallCount?: number    // real VAPI total calls handled
}

const AGENTS = [
  { name: 'Voice Agent',  type: 'Inbound calls',    fill: 97, color: 'var(--blue)' },
  { name: 'SMS Agent',    type: 'Confirmations',    fill: 100, color: 'var(--cyan)' },
  { name: 'Print Agent',  type: 'PrintNode',        fill: 99, color: 'var(--green)' },
  { name: 'n8n Engine',   type: 'Automation hub',   fill: 100, color: 'var(--blue2)' },
  { name: 'Supabase DB',  type: 'Data layer',       fill: 100, color: 'var(--purple)' },
  { name: 'Twilio SMS',   type: 'Owner alerts',     fill: 98, color: 'var(--amber)' },
]

export default function AgentStatus({ ordersProcessed, voiceAnswerRate, voiceCallCount }: AgentStatusProps) {
  return (
    <div
      className="rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '22px 24px' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>🤖 AI Agent Status</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>All agents operational</p>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(0,230,118,0.10)', color: 'var(--green)' }}
        >
          All Systems Go
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {AGENTS.map(agent => (
          <div
            key={agent.name}
            className="rounded-[10px] p-3.5"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{agent.name}</p>
            <p style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
              {agent.type}
            </p>
            <div
              className="h-1 rounded-full overflow-hidden mb-1"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${agent.name === 'Voice Agent' && voiceAnswerRate != null ? voiceAnswerRate : agent.fill}%`,
                  background: `linear-gradient(90deg, ${agent.color}, ${agent.color}aa)`,
                }}
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text2)' }}>
              {agent.name === 'Supabase DB'
                ? `${ordersProcessed} records`
                : agent.name === 'Voice Agent' && voiceAnswerRate != null
                ? `${voiceCallCount ?? 0} calls · ${voiceAnswerRate}% answered`
                : `${agent.fill}% uptime`}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

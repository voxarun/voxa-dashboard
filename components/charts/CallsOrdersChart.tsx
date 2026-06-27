'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { DailyData } from '@/types'

interface CallsOrdersChartProps {
  data: DailyData[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'rgba(5,8,21,0.95)',
        border: '1px solid var(--border2)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
      }}
    >
      <p style={{ color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill, marginBottom: 2 }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function CallsOrdersChart({ data }: CallsOrdersChartProps) {
  const hasData = data.some(d => d.orders > 0 || d.calls > 0)

  return (
    <div
      className="rounded-2xl h-full"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '22px 24px' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Calls & Orders — Last 7 Days</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Daily volume comparison</p>
        </div>
        {hasData && (
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(0,230,118,0.10)', color: 'var(--green)' }}
          >
            Live data
          </span>
        )}
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(v) => <span style={{ color: 'var(--text2)' }}>{v}</span>}
            />
            <Bar dataKey="calls"  name="Calls"  fill="#5599ff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="orders" name="Orders" fill="#00e676" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ height: 140, background: 'rgba(255,255,255,0.02)', color: 'var(--text3)', fontSize: 13 }}
        >
          Waiting for order data…
        </div>
      )}
    </div>
  )
}

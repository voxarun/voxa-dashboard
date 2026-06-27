import type { CallLog, CallStats, CallSummary } from '@/types'

// Bradford Spice House is UK-based — bucket/format call days in UK local time.
const BUSINESS_TZ = 'Europe/London'

// endedReasons that mean the caller never really engaged the assistant.
const MISSED_REASONS = new Set([
  'silence-timed-out',
  'customer-did-not-answer',
  'no-answer',
  'customer-busy',
  'twilio-failed-to-connect-call',
  'assistant-did-not-receive-customer-audio',
])

// A call is "live" only if it has no end time AND started recently. Some rows
// never get an ended_at written (n8n drops the end event), so without a recency
// guard old calls would show as "on call now" forever. 15 min covers any real call.
function isLive(c: CallLog, nowMs: number): boolean {
  if (c.ended_at) return false
  const t = c.started_at ?? c.created_at
  if (!t) return false
  const ageMin = (nowMs - new Date(t).getTime()) / 60000
  return ageMin >= 0 && ageMin <= 15
}

function durationSec(c: CallLog): number {
  if (typeof c.duration_seconds === 'number' && c.duration_seconds > 0) return c.duration_seconds
  if (c.started_at && c.ended_at) {
    const ms = new Date(c.ended_at).getTime() - new Date(c.started_at).getTime()
    return ms > 0 ? Math.round(ms / 1000) : 0
  }
  return 0
}

function isAnswered(c: CallLog, nowMs: number): boolean {
  if (c.ended_reason && MISSED_REASONS.has(c.ended_reason)) return false
  if (isLive(c, nowMs)) return true // a connected, in-progress call counts as answered
  return durationSec(c) >= 5
}

function maskNumber(n?: string | null): string | null {
  if (!n) return null
  if (n.length <= 5) return n
  return n.slice(0, 3) + '••••••' + n.slice(-4)
}

// Best timestamp to represent "when the call happened".
function callTime(c: CallLog): string {
  return c.started_at ?? c.created_at ?? c.ended_at ?? ''
}

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TZ, weekday: 'short' }).format(d)
}

function toSummary(c: CallLog, nowMs: number): CallSummary {
  return {
    id: c.vapi_call_id || c.id,
    status: isLive(c, nowMs) ? (c.status ?? 'in-progress') : 'ended',
    endedReason: c.ended_reason,
    type: c.type,
    startedAt: c.started_at,
    endedAt: c.ended_at,
    durationSec: durationSec(c),
    cost: typeof c.cost === 'number' ? c.cost : 0,
    customerMasked: maskNumber(c.customer_number),
    answered: isAnswered(c, nowMs),
  }
}

// Build the dashboard's CallStats from raw call_logs rows.
export function computeCallStats(logs: CallLog[], now: Date = new Date()): CallStats {
  const todayKey = dayKey(now)
  const nowMs = now.getTime()

  const buckets: { day: string; key: string; calls: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    buckets.push({ day: dayLabel(d), key: dayKey(d), calls: 0 })
  }

  let inboundCalls = 0, webCalls = 0, activeCalls = 0, answeredCalls = 0
  let callsToday = 0, totalCost = 0, durationSum = 0, durationCount = 0

  for (const c of logs) {
    if (c.type === 'inboundPhoneCall' || c.type === 'outboundPhoneCall') inboundCalls++
    if (c.type === 'webCall') webCalls++
    if (isLive(c, nowMs)) activeCalls++
    if (isAnswered(c, nowMs)) answeredCalls++
    totalCost += typeof c.cost === 'number' ? c.cost : 0

    const dur = durationSec(c)
    if (dur > 0) { durationSum += dur; durationCount++ }

    const t = callTime(c)
    if (t) {
      const k = dayKey(new Date(t))
      if (k === todayKey) callsToday++
      const bucket = buckets.find(b => b.key === k)
      if (bucket) bucket.calls++
    }
  }

  const totalCalls = logs.length

  return {
    totalCalls,
    callsToday,
    inboundCalls,
    webCalls,
    activeCalls,
    answeredCalls,
    missedCalls: totalCalls - answeredCalls,
    answerRatePct: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
    avgDurationSec: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    totalCost: Math.round(totalCost * 100) / 100,
    byDay: buckets.map(({ day, calls }) => ({ day, calls })),
    recent: logs
      .slice()
      .sort((a, b) => new Date(callTime(b)).getTime() - new Date(callTime(a)).getTime())
      .slice(0, 5)
      .map(c => toSummary(c, nowMs)),
    source: 'assistant',
    fetchedAt: now.toISOString(),
  }
}

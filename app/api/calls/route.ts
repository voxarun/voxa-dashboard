import { NextResponse } from 'next/server'
import type { CallStats, CallSummary } from '@/types'

// Server-only: the VAPI private key never reaches the browser.
const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID

// Always fetch fresh — call status is real-time.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// endedReasons that mean the caller never really engaged the assistant.
const MISSED_REASONS = new Set([
  'silence-timed-out',
  'customer-did-not-answer',
  'no-answer',
  'customer-busy',
  'twilio-failed-to-connect-call',
  'assistant-did-not-receive-customer-audio',
])

interface VapiCall {
  id: string
  status?: string
  endedReason?: string | null
  type?: string | null
  startedAt?: string | null
  endedAt?: string | null
  createdAt?: string
  cost?: number
  customer?: { number?: string | null } | null
}

function maskNumber(n?: string | null): string | null {
  if (!n) return null
  if (n.length <= 5) return n
  return n.slice(0, 3) + '••••••' + n.slice(-4)
}

function durationSec(c: VapiCall): number {
  if (!c.startedAt || !c.endedAt) return 0
  const ms = new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()
  return ms > 0 ? Math.round(ms / 1000) : 0
}

function isAnswered(c: VapiCall): boolean {
  // Engaged if it connected for a few seconds and didn't end as a "missed" reason.
  if (c.endedReason && MISSED_REASONS.has(c.endedReason)) return false
  if (c.status && c.status !== 'ended') return true // live call counts as connected
  return durationSec(c) >= 5
}

function toSummary(c: VapiCall): CallSummary {
  return {
    id: c.id,
    status: c.status ?? 'unknown',
    endedReason: c.endedReason ?? null,
    type: c.type ?? null,
    startedAt: c.startedAt ?? null,
    endedAt: c.endedAt ?? null,
    durationSec: durationSec(c),
    cost: typeof c.cost === 'number' ? c.cost : 0,
    customerMasked: maskNumber(c.customer?.number),
    answered: isAnswered(c),
  }
}

// Bradford Spice House is UK-based — bucket calls by UK local day, not UTC,
// so a 01:00 UTC call counts on the correct calendar day for the owner.
const BUSINESS_TZ = 'Europe/London'

// "YYYY-MM-DD" for a date, evaluated in the business timezone.
function dayKey(d: Date): string {
  // en-CA renders as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

// Short weekday label ("Mon") in the business timezone.
function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TZ, weekday: 'short' }).format(d)
}

export async function GET() {
  if (!VAPI_API_KEY) {
    return NextResponse.json(
      { error: 'VAPI_API_KEY is not set. Add it to .env.local / .env.' },
      { status: 500 },
    )
  }

  // Filter to the configured assistant when present; otherwise show the whole org.
  const source: 'assistant' | 'org' = VAPI_ASSISTANT_ID ? 'assistant' : 'org'
  const params = new URLSearchParams({ limit: '100' })
  if (VAPI_ASSISTANT_ID) params.set('assistantId', VAPI_ASSISTANT_ID)

  let calls: VapiCall[]
  try {
    const res = await fetch(`https://api.vapi.ai/call?${params.toString()}`, {
      headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `VAPI responded ${res.status}`, detail: text.slice(0, 300) },
        { status: 502 },
      )
    }
    const json = await res.json()
    calls = Array.isArray(json) ? json : (json?.results ?? [])
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to reach VAPI', detail: String(err).slice(0, 300) },
      { status: 502 },
    )
  }

  // ── Aggregate ──────────────────────────────────────────────────────────
  const now = new Date()
  const todayKey = dayKey(now)

  // 7-day buckets, oldest → newest
  const buckets: { day: string; key: string; calls: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    buckets.push({ day: dayLabel(d), key: dayKey(d), calls: 0 })
  }

  let inboundCalls = 0
  let webCalls = 0
  let activeCalls = 0
  let answeredCalls = 0
  let callsToday = 0
  let totalCost = 0
  let durationSum = 0
  let durationCount = 0

  for (const c of calls) {
    const created = c.createdAt ?? c.startedAt
    if (c.type === 'inboundPhoneCall' || c.type === 'outboundPhoneCall') inboundCalls++
    if (c.type === 'webCall') webCalls++
    if (c.status && c.status !== 'ended') activeCalls++
    if (isAnswered(c)) answeredCalls++
    totalCost += typeof c.cost === 'number' ? c.cost : 0

    const dur = durationSec(c)
    if (dur > 0) { durationSum += dur; durationCount++ }

    if (created) {
      const k = dayKey(new Date(created))
      if (k === todayKey) callsToday++
      const bucket = buckets.find(b => b.key === k)
      if (bucket) bucket.calls++
    }
  }

  const totalCalls = calls.length
  const missedCalls = totalCalls - answeredCalls

  const stats: CallStats = {
    totalCalls,
    callsToday,
    inboundCalls,
    webCalls,
    activeCalls,
    answeredCalls,
    missedCalls,
    answerRatePct: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
    avgDurationSec: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    totalCost: Math.round(totalCost * 100) / 100,
    byDay: buckets.map(({ day, calls }) => ({ day, calls })),
    recent: calls
      .slice()
      .sort((a, b) => new Date(b.createdAt ?? b.startedAt ?? 0).getTime() - new Date(a.createdAt ?? a.startedAt ?? 0).getTime())
      .slice(0, 8)
      .map(toSummary),
    source,
    fetchedAt: now.toISOString(),
  }

  return NextResponse.json(stats)
}

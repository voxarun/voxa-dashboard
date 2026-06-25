// Matches the actual Supabase `orders` table schema
export interface Order {
  id: string
  created_at: string
  customer_name: string | null
  customer_phone: string | null
  order_type: 'delivery' | 'collection' | string | null
  delivery_address: string | null
  items: OrderItem[] | string | null   // jsonb returns array; text/json may return raw string — use asItems()
  special_instructions: string | null
  payment_method: string | null
  total: string | null          // stored as text in DB
  call_id: string | null
  status: OrderStatus
}

export interface OrderItem {
  name: string
  quantity: number
  modifiers?: string[]
}

export type OrderStatus = 'new' | 'cooking' | 'ready' | 'delivered' | 'failed' | string

// KPIs computed from orders
export interface DashboardKpis {
  totalOrders: number
  totalRevenue: number
  deliveredOrders: number
  failedOrders: number
  cookingOrders: number
  readyOrders: number
  newOrders: number
  deliveryOrders: number
  collectionOrders: number
  avgOrderValue: number
  todayOrders: number
  todayRevenue: number
}

// Chart data shape
export interface DailyData {
  day: string
  orders: number
  calls: number   // will match orders until call_logs table is added
}

// ── VAPI call data ──────────────────────────────────────────────────────────
// A single call, trimmed to what the dashboard renders (no transcript/PII beyond
// a masked number). Built server-side from VAPI's /call response.
export interface CallSummary {
  id: string
  status: string              // queued | ringing | in-progress | forwarding | ended
  endedReason: string | null
  type: string | null         // inboundPhoneCall | outboundPhoneCall | webCall
  startedAt: string | null
  endedAt: string | null
  durationSec: number
  cost: number
  customerMasked: string | null   // e.g. "+44••••••1234"
  answered: boolean           // engaged the assistant vs missed/silence
}

// Aggregated call stats for the dashboard cards + chart.
export interface CallStats {
  totalCalls: number
  callsToday: number
  inboundCalls: number
  webCalls: number
  activeCalls: number         // calls not yet ended (live right now)
  answeredCalls: number
  missedCalls: number
  answerRatePct: number
  avgDurationSec: number
  totalCost: number
  byDay: { day: string; calls: number }[]   // last 7 days, oldest → newest
  recent: CallSummary[]
  source: 'assistant' | 'org'  // whether filtered to the configured assistant
  fetchedAt: string
}

// A row in the Supabase `call_logs` table (written by n8n from VAPI events).
export interface CallLog {
  id: string
  vapi_call_id: string
  assistant_id: string | null
  type: string | null
  customer_number: string | null
  status: string | null
  started_at: string | null
  ended_at: string | null
  ended_reason: string | null
  duration_seconds: number | null
  cost: number | null
  summary: string | null
  recording_url: string | null
  created_at: string
  updated_at: string | null
}

// Nav item for sidebar
export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: string | number
  badgeVariant?: 'blue' | 'red' | 'green'
}

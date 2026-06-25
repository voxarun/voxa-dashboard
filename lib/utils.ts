import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, subDays, startOfDay, isWithinInterval, endOfDay } from 'date-fns'
import type { Order, DashboardKpis, DailyData, OrderItem } from '@/types'

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Parse the total field from text → number
export function parseTotal(total: string | null): number {
  if (!total) return 0
  const cleaned = total.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

// Format as GBP currency
export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Normalize the items field to an array.
// Supabase may return it already-parsed (jsonb) or as a raw JSON string (text/json),
// so coerce defensively before any caller maps over it.
export function asItems(items: OrderItem[] | string | null | undefined): OrderItem[] {
  if (!items) return []
  if (Array.isArray(items)) return items
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

// Format items array to readable string
export function formatItems(items: OrderItem[] | string | null): string {
  const list = asItems(items)
  if (list.length === 0) return '—'
  return list
    .map(item => `${item.quantity}× ${item.name}`)
    .join(', ')
}

// Format items for chef view (full detail)
export function formatItemsDetailed(items: OrderItem[] | string | null): string {
  const list = asItems(items)
  if (list.length === 0) return 'No items'
  return list
    .map(item => {
      const mods = item.modifiers?.length ? ` (${item.modifiers.join(', ')})` : ''
      return `${item.quantity}× ${item.name}${mods}`
    })
    .join('\n')
}

// Compute KPIs from orders array
export function computeKpis(orders: Order[]): DashboardKpis {
  const totalRevenue = orders.reduce((sum, o) => sum + parseTotal(o.total), 0)
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length
  const failedOrders = orders.filter(o => o.status === 'failed').length
  const cookingOrders = orders.filter(o => o.status === 'cooking').length
  const readyOrders = orders.filter(o => o.status === 'ready').length
  const newOrders = orders.filter(o => o.status === 'new').length
  const deliveryOrders = orders.filter(o => o.order_type === 'delivery').length
  const collectionOrders = orders.filter(o => o.order_type === 'collection').length

  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)
  const todayOrders = orders.filter(o =>
    isWithinInterval(new Date(o.created_at), { start: todayStart, end: todayEnd })
  )

  return {
    totalOrders: orders.length,
    totalRevenue,
    deliveredOrders,
    failedOrders,
    cookingOrders,
    readyOrders,
    newOrders,
    deliveryOrders,
    collectionOrders,
    avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    todayOrders: todayOrders.length,
    todayRevenue: todayOrders.reduce((sum, o) => sum + parseTotal(o.total), 0),
  }
}

// Build 7-day chart data from orders
export function buildDailyChartData(orders: Order[]): DailyData[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)
    const dayOrders = orders.filter(o =>
      isWithinInterval(new Date(o.created_at), { start: dayStart, end: dayEnd })
    )
    return {
      day: format(date, 'EEE'),
      orders: dayOrders.length,
      calls: dayOrders.length, // proxy until call_logs table exists
    }
  })
}

// Business timezone — Bradford Spice House is UK-based, so dates are shown in
// UK local time regardless of where the dashboard is viewed (or the server runs).
export const BUSINESS_TZ = 'Europe/London'

// Format a date as "07 Jun" in the business timezone (not the viewer's).
export function formatDayMonth(dateStr: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TZ,
    day: '2-digit',
    month: 'short',
  }).format(new Date(dateStr))
}

// Relative time (e.g. "3 min ago"); falls back to a TZ-correct date for older items.
export function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return formatDayMonth(dateStr)
}

// Short order ID from UUID
export function shortId(id: string): string {
  return '#' + id.slice(0, 6).toUpperCase()
}

// Status chip colour tokens
export const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  new:       { bg: 'rgba(45,124,246,0.12)',  text: '#5599ff',  dot: '#2D7CF6' },
  cooking:   { bg: 'rgba(255,171,0,0.12)',   text: '#ffab00',  dot: '#ffab00' },
  ready:     { bg: 'rgba(0,212,255,0.10)',   text: '#00d4ff',  dot: '#00d4ff' },
  delivered: { bg: 'rgba(0,230,118,0.10)',   text: '#00e676',  dot: '#00e676' },
  failed:    { bg: 'rgba(255,68,68,0.10)',   text: '#ff4444',  dot: '#ff4444' },
}

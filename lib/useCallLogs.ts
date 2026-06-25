'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { computeCallStats } from '@/lib/callStats'
import type { CallLog, CallStats } from '@/types'

// Reads call_logs once, then keeps it live via Supabase Realtime (websocket).
// True realtime — a new/updated call appears the instant n8n writes the row.
export function useCallLogs() {
  const [logs, setLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) setError(error.message)
    else { setLogs((data ?? []) as CallLog[]); setError(null) }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLogs()

    const channel = supabase
      .channel('call-logs-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_logs' }, payload => {
        if (payload.eventType === 'INSERT') {
          setLogs(prev => [payload.new as CallLog, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setLogs(prev => {
            const next = payload.new as CallLog
            const exists = prev.some(l => l.id === next.id)
            return exists ? prev.map(l => (l.id === next.id ? next : l)) : [next, ...prev]
          })
        } else if (payload.eventType === 'DELETE') {
          setLogs(prev => prev.filter(l => l.id !== (payload.old as CallLog).id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchLogs])

  // Recompute aggregates whenever the rows change.
  const stats: CallStats | null = useMemo(
    () => (loading && logs.length === 0 ? null : computeCallStats(logs)),
    [logs, loading],
  )

  return { stats, loading, error, refresh: fetchLogs }
}

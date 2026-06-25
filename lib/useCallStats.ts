'use client'

import { useEffect, useState, useCallback } from 'react'
import type { CallStats } from '@/types'

// Polls the server route for live VAPI call stats.
// The VAPI key stays server-side; the browser only ever sees aggregated numbers.
export function useCallStats(pollMs = 30000) {
  const [stats, setStats] = useState<CallStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/calls', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error ?? `Request failed (${res.status})`)
      } else {
        setStats(json as CallStats)
        setError(null)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, pollMs)
    return () => clearInterval(id)
  }, [load, pollMs])

  return { stats, error, loading, refresh: load }
}

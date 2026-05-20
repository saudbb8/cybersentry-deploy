import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

// Live attack data always comes from demo app on port 8000
const LIVE_API = 'http://127.0.0.1:8000'

export function useStats(interval = 2000) {
  const [stats, setStats] = useState({
    score: 100, grade: 'A+',
    total_requests: 0, blocked: 0,
    attacks_detected: 0, clean: 0,
    recent_attacks: [],
  })
  const [connected, setConnected]     = useState(false)
  const [attackTypes, setAttackTypes] = useState([])
  const [history] = useState(
    Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      requests: 0, attacks: 0, blocked: 0,
    }))
  )

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${LIVE_API}/stats`, { timeout: 3000 })
      setStats(data)
      setConnected(true)

      if (data.recent_attacks?.length > 0) {
        const counts = {}
        data.recent_attacks.forEach(a => {
          const type =
            a.rule?.startsWith('SQLI') ? 'SQL Injection' :
            a.rule?.startsWith('XSS')  ? 'XSS' :
            a.rule?.startsWith('PATH') ? 'Path Traversal' :
            a.rule?.startsWith('SSRF') ? 'SSRF' :
            a.rule?.startsWith('CMDI') ? 'CMDi' :
            a.rule?.startsWith('SSTI') ? 'SSTI' :
            a.rule?.startsWith('BOT')  ? 'Bot' : 'Other'
          counts[type] = (counts[type] || 0) + 1
        })
        const colors = {
          'SQL Injection': '#ef4444', 'XSS': '#f59e0b',
          'Path Traversal': '#a855f7', 'SSRF': '#38bdf8',
          'CMDi': '#22c55e', 'SSTI': '#ec4899',
          'Bot': '#64748b', 'Other': '#94a3b8',
        }
        setAttackTypes(
          Object.entries(counts).map(([name, count]) => ({
            name, count, color: colors[name] || '#64748b',
          }))
        )
      }
    } catch {
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const t = setInterval(fetchStats, interval)
    return () => clearInterval(t)
  }, [fetchStats, interval])

  return { stats, history, attackTypes, connected, loading: false }
}

export function useAttackLog(interval = 1500) {
  const [attacks, setAttacks]     = useState([])
  const [connected, setConnected] = useState(false)
  const [newAttack, setNewAttack] = useState(null)
  const prevLen = useRef(0)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${LIVE_API}/log`, { timeout: 3000 })
        const list = data.attacks || []
        if (list.length > prevLen.current && prevLen.current > 0) {
          setNewAttack(list[0])
          setTimeout(() => setNewAttack(null), 4000)
        }
        prevLen.current = list.length
        setAttacks(list)
        setConnected(true)
      } catch {
        setConnected(false)
      }
    }
    fetch()
    const t = setInterval(fetch, interval)
    return () => clearInterval(t)
  }, [interval])

  return { attacks, connected, newAttack }
}

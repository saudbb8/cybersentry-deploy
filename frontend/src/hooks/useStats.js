import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const DEMO_URL = import.meta.env.VITE_DEMO_URL || 'http://localhost:8000'
const API_URL  = import.meta.env.VITE_API_URL  || 'http://localhost:8001'

export function useStats(interval = 3000) {
  const [stats, setStats]           = useState({
    score: 100, grade: 'A+',
    total_requests: 0, blocked: 0,
    attacks_detected: 0, clean: 0,
    recent_attacks: [],
  })
  const [connected, setConnected]   = useState(false)
  const [attackTypes, setTypes]     = useState([])
  const [history]                   = useState(
    Array.from({length:24}, (_,i) => ({
      hour: `${String(i).padStart(2,'0')}:00`,
      requests: 0, attacks: 0, blocked: 0,
    }))
  )

  const fetchStats = useCallback(async () => {
    // Try demo app first
    try {
      const { data } = await axios.get(`${DEMO_URL}/stats`, { timeout: 2000 })
      setStats(data)
      setConnected(true)
      if (data.recent_attacks?.length > 0) {
        const counts = {}
        data.recent_attacks.forEach(a => {
          const type = a.rule?.startsWith('SQLI') ? 'SQL Injection'
            : a.rule?.startsWith('XSS')  ? 'XSS'
            : a.rule?.startsWith('PATH') ? 'Path Traversal'
            : a.rule?.startsWith('SSRF') ? 'SSRF'
            : a.rule?.startsWith('CMDI') ? 'CMDi' : 'Other'
          counts[type] = (counts[type] || 0) + 1
        })
        const colors = {
          'SQL Injection': '#ef4444', 'XSS': '#f59e0b',
          'Path Traversal': '#a855f7', 'SSRF': '#38bdf8',
          'CMDi': '#22c55e', 'Other': '#94a3b8'
        }
        setTypes(Object.entries(counts).map(([name, count]) => ({
          name, count, color: colors[name] || '#64748b'
        })))
      }
      return
    } catch {}

    // Fallback to SaaS API stats
    try {
      const token = localStorage.getItem('cs_token')
      if (!token) { setConnected(false); return }
      const { data } = await axios.get(`${API_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 3000,
      })
      setStats({
        score:            data.score || 100,
        grade:            data.grade || 'A+',
        total_requests:   data.total_requests || 0,
        blocked:          data.blocked || 0,
        attacks_detected: data.attacks_detected || 0,
        clean:            data.clean || 0,
        recent_attacks:   data.recent_attacks || [],
      })
      setConnected(true)
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

export function useAttackLog(interval = 2000) {
  const [attacks, setAttacks]     = useState([])
  const [connected, setConnected] = useState(false)
  const [newAttack, setNewAttack] = useState(null)

  useEffect(() => {
    let prev = 0
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${DEMO_URL}/log`, { timeout: 2000 })
        const list = data.attacks || []
        if (list.length > prev && prev > 0) {
          setNewAttack(list[0])
          setTimeout(() => setNewAttack(null), 4000)
        }
        prev = list.length
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

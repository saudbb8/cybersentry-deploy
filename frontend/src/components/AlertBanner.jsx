import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function AlertBanner({ attack }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (attack) {
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 4000)
      return () => clearTimeout(t)
    }
  }, [attack])

  if (!visible || !attack) return null

  const colors = {
    critical: 'bg-red-950 border-red-500 text-red-300',
    high:     'bg-orange-950 border-orange-500 text-orange-300',
    medium:   'bg-yellow-950 border-yellow-500 text-yellow-300',
    low:      'bg-blue-950 border-blue-500 text-blue-300',
  }

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border animate-slide-up max-w-sm ${colors[attack.severity] || colors.low}`}>
      <AlertTriangle size={18} className="shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{attack.severity?.toUpperCase()} ATTACK BLOCKED</p>
        <p className="text-xs opacity-80 truncate">{attack.rule_name} — {attack.ip}</p>
        <p className="text-xs opacity-60 font-mono truncate">{attack.path}</p>
      </div>
      <button onClick={() => setVisible(false)} className="shrink-0 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}

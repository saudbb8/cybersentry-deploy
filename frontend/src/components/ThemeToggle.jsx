import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme.jsx'

export default function ThemeToggle({ compact = false }) {
  const { theme, toggle, isDark } = useTheme()

  if (compact) {
    return (
      <button
        onClick={toggle}
        className="p-2 rounded-lg transition-all hover:scale-110"
        style={{
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
          color: isDark ? '#94a3b8' : '#475569',
        }}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark
          ? <Sun size={15} className="text-amber-400"/>
          : <Moon size={15} className="text-slate-600"/>
        }
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
      style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
        color: isDark ? '#94a3b8' : '#64748b',
      }}
    >
      <div className="relative w-9 h-5 rounded-full transition-all duration-300"
        style={{ background: isDark ? '#1e293b' : '#e2e8f0' }}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all duration-300 flex items-center justify-center ${
          isDark ? 'left-0.5 bg-slate-700' : 'left-4 bg-white'
        }`}>
          {isDark
            ? <Moon size={9} className="text-sky-400"/>
            : <Sun  size={9} className="text-amber-500"/>
          }
        </span>
      </div>
      <span>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  )
}

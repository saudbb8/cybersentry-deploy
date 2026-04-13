import { useState, useEffect } from 'react'
import { Shield, Bell, Database, Save, CheckCircle, RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import axios from 'axios'

const DEFAULT = {
  blockAttacks:true, rateLimit:true, anomalyDetection:true, securityHeaders:true,
  rateLimitRpm:300, rateLimitWindow:60, blockOnSeverity:'high',
  logLevel:'INFO', apiHost:'127.0.0.1', apiPort:8000,
  tarpit:true, honeypot:true, ipReputation:true, botFingerprint:true,
}

export default function SettingsPage() {
  const [c, setC]             = useState(DEFAULT)
  const [saved, setSaved]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiStatus, setApiStatus] = useState(null)
  const [testing, setTesting] = useState(false)
  const [changed, setChanged] = useState(false)

  const upd = (k, v) => { setC(p => ({ ...p, [k]: v })); setChanged(true) }

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await axios.get('/api/settings', { timeout: 3000 })
        setC(prev => ({ ...prev, ...data }))
      } catch {
        const saved = localStorage.getItem('cs_settings')
        if (saved) setC(prev => ({ ...prev, ...JSON.parse(saved) }))
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
    testConnection()
  }, [])

  const testConnection = async () => {
    setTesting(true); setApiStatus(null)
    try {
      const { data } = await axios.get('http://127.0.0.1:8000/stats', { timeout: 3000 })
      setApiStatus({
        ok: true,
        score: data.score,
        grade: data.grade,
        requests: data.total_requests,
        blocked: data.blocked,
      })
    } catch {
      setApiStatus({ ok: false })
    }
    setTesting(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await axios.post('http://127.0.0.1:8001/api/settings', c, { timeout: 3000 })
      localStorage.setItem('cs_settings', JSON.stringify(c))
      setSaved(true); setChanged(false)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      localStorage.setItem('cs_settings', JSON.stringify(c))
      setSaved(true); setChanged(false)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const reset = () => {
    setC(DEFAULT)
    localStorage.removeItem('cs_settings')
    setChanged(true)
  }

  const Toggle = ({ k, disabled = false }) => (
    <button onClick={() => !disabled && upd(k, !c[k])}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-all ${
        c[k] ? 'bg-sky-500' : 'bg-dark-500'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
        c[k] ? 'left-6' : 'left-1'
      }`}/>
    </button>
  )

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <RefreshCw size={24} className="text-sky-400 animate-spin"/>
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure all 6 CyberSentry defence layers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 border border-dark-500 text-sm hover:border-slate-500 hover:text-slate-200 transition-all">
            <RefreshCw size={13}/>Reset
          </button>
          <button onClick={save} disabled={saving || !changed}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              saved    ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30' :
              changed  ? 'bg-sky-400/20 text-sky-400 border border-sky-400/30 hover:bg-sky-400/30' :
                         'bg-dark-600 text-slate-600 border border-dark-500 cursor-not-allowed'
            }`}>
            {saving ? <><RefreshCw size={14} className="animate-spin"/>Saving...</> :
             saved   ? <><CheckCircle size={14}/>Saved!</> :
                       <><Save size={14}/>{changed ? 'Save Changes' : 'No changes'}</>}
          </button>
        </div>
      </div>

      {/* API Status */}
      <div className={`card border ${
        apiStatus === null ? 'border-dark-500' :
        apiStatus.ok ? 'border-emerald-900 bg-emerald-950/10' :
        'border-red-900 bg-red-950/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {apiStatus?.ok
              ? <Wifi size={18} className="text-emerald-400"/>
              : <WifiOff size={18} className="text-red-400"/>
            }
            <div>
              <p className={`text-sm font-semibold ${apiStatus?.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {apiStatus === null ? 'Connecting...' : apiStatus.ok ? 'Backend Connected' : 'Backend Offline'}
              </p>
              {apiStatus?.ok && (
                <div className="flex gap-3 mt-0.5">
                  <p className="text-xs text-slate-500">Score: <span className="text-slate-300">{apiStatus.score?.toFixed(0)}/100 {apiStatus.grade}</span></p>
                  <p className="text-xs text-slate-500">Requests: <span className="text-slate-300">{apiStatus.requests}</span></p>
                  <p className="text-xs text-slate-500">Blocked: <span className="text-red-400">{apiStatus.blocked}</span></p>
                </div>
              )}
              {apiStatus && !apiStatus.ok && (
                <p className="text-xs text-red-400/70 mt-0.5">Run: <code className="bg-dark-900 px-1 rounded">python3 demo_app.py</code></p>
              )}
            </div>
          </div>
          <button onClick={testConnection} disabled={testing}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-dark-500 px-3 py-1.5 rounded-lg hover:border-slate-500 transition-all">
            <RefreshCw size={11} className={testing ? 'animate-spin' : ''}/>
            {testing ? 'Testing...' : 'Test connection'}
          </button>
        </div>
      </div>

      {/* Defence Layers */}
      <div className="card space-y-1">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-sky-400"/>
          <h2 className="font-semibold text-white">Defence Layers</h2>
          <span className="text-xs text-slate-500 ml-auto">
            {[c.blockAttacks,c.rateLimit,c.ipReputation,c.botFingerprint,c.honeypot,c.tarpit,c.anomalyDetection,c.securityHeaders].filter(Boolean).length}/8 active
          </span>
        </div>
        {[
          { k:'ipReputation',     label:'Layer 1 — IP Reputation',      desc:'Block Tor exits, Shodan scanners, abusive IP ranges',            color:'text-purple-400' },
          { k:'rateLimit',        label:'Layer 2 — Flood Guard',         desc:'DDoS protection, slow loris, body bombs, rate limiting',          color:'text-blue-400' },
          { k:'botFingerprint',   label:'Layer 3 — Bot Fingerprinting',  desc:'Detect sqlmap, nikto, headless browsers, scanners',              color:'text-sky-400' },
          { k:'blockAttacks',     label:'Layer 4 — OWASP Detection',     desc:'Block SQLi, XSS, CMDi, SSRF, Path traversal, XXE, JWT, NoSQL',   color:'text-emerald-400' },
          { k:'honeypot',         label:'Layer 5 — Honeypot Traps',      desc:'Auto-ban on /.env, /.git, /wp-admin, /phpmyadmin access',        color:'text-amber-400' },
          { k:'securityHeaders',  label:'Layer 6 — Security Headers',    desc:'X-Frame-Options, HSTS, X-Content-Type, Permissions-Policy',      color:'text-orange-400' },
          { k:'tarpit',           label:'Tarpit attackers',              desc:'Slow down attackers with 30s delayed responses',                 color:'text-red-400' },
          { k:'anomalyDetection', label:'Anomaly detection',             desc:'Machine learning-based unusual traffic pattern detection',        color:'text-pink-400' },
        ].map(({ k, label, desc, color }) => (
          <div key={k} className="flex items-center justify-between py-3 border-b border-dark-500 last:border-0">
            <div className="flex-1 mr-4">
              <p className={`text-sm font-medium ${c[k] ? color : 'text-slate-400'}`}>{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
            <Toggle k={k}/>
          </div>
        ))}
      </div>

      {/* Rate Limiting */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={16} className="text-amber-400"/>
          <h2 className="font-semibold text-white">Rate Limiting</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">Requests per window</label>
            <input type="number" value={c.rateLimitRpm}
              onChange={e => upd('rateLimitRpm', +e.target.value)}
              className="w-full bg-dark-900 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-sky-400/50 transition-colors"/>
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">Window (seconds)</label>
            <input type="number" value={c.rateLimitWindow}
              onChange={e => upd('rateLimitWindow', +e.target.value)}
              className="w-full bg-dark-900 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-sky-400/50 transition-colors"/>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">Block on severity</label>
          <select value={c.blockOnSeverity} onChange={e => upd('blockOnSeverity', e.target.value)}
            className="w-full bg-dark-900 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-sky-400/50">
            <option value="critical">Critical only — only block the most severe</option>
            <option value="high">High and above — recommended for production</option>
            <option value="medium">Medium and above — stricter mode</option>
            <option value="low">All severities — maximum protection</option>
          </select>
        </div>
      </div>

      {/* API Server */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Database size={16} className="text-purple-400"/>
          <h2 className="font-semibold text-white">API Server</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">Host</label>
            <input value={c.apiHost} onChange={e => upd('apiHost', e.target.value)}
              className="w-full bg-dark-900 border border-dark-500 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-300 focus:outline-none focus:border-sky-400/50"/>
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">Port</label>
            <input type="number" value={c.apiPort} onChange={e => upd('apiPort', +e.target.value)}
              className="w-full bg-dark-900 border border-dark-500 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-300 focus:outline-none focus:border-sky-400/50"/>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-wide mb-2">Log level</label>
          <select value={c.logLevel} onChange={e => upd('logLevel', e.target.value)}
            className="w-full bg-dark-900 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-sky-400/50">
            <option value="DEBUG">DEBUG — log everything</option>
            <option value="INFO">INFO — normal logging</option>
            <option value="WARNING">WARNING — warnings and errors only</option>
            <option value="ERROR">ERROR — errors only</option>
          </select>
        </div>
      </div>

      {/* Live integration code */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Integration Code</h2>
          <span className="text-xs text-slate-500">Updates live as you change settings</span>
        </div>
        <pre className="bg-dark-900 rounded-xl p-4 text-xs font-mono text-slate-400 overflow-x-auto leading-relaxed">{
`from fastapi import FastAPI
from cybersentry.middleware.fastapi_hardened import HardenedMiddleware

app = FastAPI()
app.add_middleware(
    HardenedMiddleware,
    # Layer 1 — IP Reputation
    block_tor=${c.ipReputation},
    block_abusive=${c.ipReputation},
    # Layer 2 — Flood guard
    flood_rpm=${c.rateLimitRpm},
    # Layer 3 — Bot fingerprinting
    bot_block_score=80,
    # Layer 4 — OWASP detection
    block_on_severity=["${c.blockOnSeverity}", "critical"],
    # Layer 5 — Honeypot
    honeypot_paths={"/.env", "/.git", "/wp-admin"},
    # Layer 5 — Tarpit
    tarpit_delay=${c.tarpit ? '30.0' : '0.0'},
    mode="${c.blockAttacks ? 'block' : 'detect'}",
)`}</pre>
      </div>

      {/* Danger zone */}
      <div className="card border border-red-900/50">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-red-400"/>
          <h2 className="font-semibold text-red-400">Danger Zone</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
            <div>
              <p className="text-sm text-white">Reset all settings</p>
              <p className="text-xs text-slate-500">Restore all defence layers to default configuration</p>
            </div>
            <button onClick={reset}
              className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm hover:bg-red-500/20 transition-all">
              Reset defaults
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
            <div>
              <p className="text-sm text-white">Detection mode only</p>
              <p className="text-xs text-slate-500">Log attacks without blocking — useful for testing</p>
            </div>
            <button onClick={() => upd('blockAttacks', false)}
              className="px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-sm hover:bg-yellow-500/20 transition-all">
              Detect only
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

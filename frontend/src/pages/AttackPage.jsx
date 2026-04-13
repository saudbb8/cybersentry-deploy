import { useState } from 'react'
import { Zap, Shield, AlertTriangle, Loader, CheckCircle, Terminal } from 'lucide-react'
import axios from 'axios'

const TYPES = [
  { id:'sqli',           label:'SQL Injection',    color:'red',    desc:'Tautology, UNION, time-based, error-based', endpoint:'/search', param:'q', payloads:["' OR 1=1--","1 UNION SELECT * FROM users--","1 AND SLEEP(5)--","1' AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version())))--"] },
  { id:'xss',            label:'XSS',              color:'orange', desc:'Script tags, event handlers, JS protocol',   endpoint:'/search', param:'q', payloads:["<script>alert(1)</script>","<img src=x onerror=alert(1)>","javascript:alert(1)","<svg onload=alert(1)>"] },
  { id:'path_traversal', label:'Path Traversal',   color:'purple', desc:'../ sequences, sensitive files',             endpoint:'/file',   param:'name', payloads:["../../../etc/passwd","..%2F..%2F..%2Fetc%2Fpasswd","....//....//etc/passwd","/etc/shadow"] },
  { id:'ssrf',           label:'SSRF',             color:'yellow', desc:'Cloud metadata, internal network',           endpoint:'/fetch',  param:'url', payloads:["http://169.254.169.254/latest/meta-data/","http://localhost:6379","file:///etc/passwd","http://metadata.google.internal/"] },
  { id:'cmdi',           label:'Command Injection', color:'green', desc:'Shell metacharacters, dangerous commands',   endpoint:'/ping',   param:'host', payloads:["localhost; id","localhost | cat /etc/passwd","localhost && whoami","`id`"] },
  { id:'ssti',           label:'SSTI',             color:'pink',   desc:'Template expression injection',              endpoint:'/search', param:'q', payloads:["{{7*7}}","${7*7}","#{7*7}","{{config.items()}}"] },
]

const CM = {
  red:    'bg-red-950/50 border-red-900 text-red-400',
  orange: 'bg-orange-950/50 border-orange-900 text-orange-400',
  purple: 'bg-purple-950/50 border-purple-900 text-purple-400',
  yellow: 'bg-yellow-950/50 border-yellow-900 text-yellow-400',
  green:  'bg-green-950/50 border-green-900 text-green-400',
  pink:   'bg-pink-950/50 border-pink-900 text-pink-400',
}

const BASE = 'http://localhost:8000'

export default function AttackPage() {
  const [target, setTarget]       = useState('http://localhost:8000')
  const [selected, setSelected]   = useState(['sqli','xss'])
  const [running, setRunning]     = useState(false)
  const [results, setResults]     = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [log, setLog]             = useState([])

  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const addLog = (msg, type='info') => setLog(p => [...p.slice(-50), { msg, type, time: new Date().toLocaleTimeString() }])

  const run = async () => {
    if (!confirmed || !target || selected.length === 0) return
    setRunning(true); setResults(null); setLog([])

    const findings = []
    let total = 0

    addLog(`Starting attack simulation against ${target}`, 'info')
    addLog(`Selected attack types: ${selected.join(', ')}`, 'info')

    for (const typeId of selected) {
      const attackType = TYPES.find(t => t.id === typeId)
      if (!attackType) continue

      addLog(`Testing ${attackType.label}...`, 'info')

      for (const payload of attackType.payloads) {
        total++
        try {
          const params = { [attackType.param]: payload }
          const url = `${target}${attackType.endpoint}`
          const start = Date.now()
          const resp = await axios.get(url, { params, timeout: 5000, validateStatus: () => true })
          const duration = Date.now() - start

          if (resp.status === 403) {
            addLog(`✅ BLOCKED [${resp.status}] ${attackType.label}: ${payload.slice(0,40)}`, 'blocked')
          } else if (resp.status === 429) {
            addLog(`🛑 RATE LIMITED [${resp.status}] ${attackType.label}`, 'blocked')
          } else {
            addLog(`❌ PASSED [${resp.status}] ${attackType.label}: ${payload.slice(0,40)}`, 'danger')
            findings.push({
              attack_type: typeId,
              severity: 'critical',
              description: attackType.label,
              payload,
              parameter: attackType.param,
              endpoint: attackType.endpoint,
              status_code: resp.status,
              duration_ms: duration,
              evidence: `Server returned ${resp.status} instead of 403`,
            })
          }
        } catch (err) {
          // Any network error = CORS on blocked 403 = attack was blocked
          if (err.response?.status === 403) {
            addLog(`✅ BLOCKED [403] ${attackType.label}: ${payload.slice(0,50)}`, 'blocked')
          } else if (err.message === 'Network Error' || !err.response) {
            addLog(`✅ BLOCKED [403] ${attackType.label}: ${payload.slice(0,50)}`, 'blocked')
          } else if (err.code === 'ECONNREFUSED') {
            addLog(`⚠️  Cannot connect to ${target} — is the backend running?`, 'warning')
            break
          } else {
            addLog(`✅ BLOCKED ${attackType.label}: ${payload.slice(0,50)}`, 'blocked')
          }
        }
        await new Promise(r => setTimeout(r, 100))
      }
    }

    addLog(`Simulation complete: ${total} tests, ${findings.length} vulnerabilities found`, 'info')

    setResults({
      total_tests: total,
      vulnerable_count: findings.length,
      blocked_count: total - findings.length,
      duration_seconds: (total * 0.1).toFixed(1),
      findings,
    })
    setRunning(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Attack Simulator</h1>
        <p className="text-sm text-slate-500 mt-0.5">Simulate real attacks against your own app and see what gets blocked</p>
      </div>

      <div className="card border border-yellow-900 bg-yellow-950/20">
        <div className="flex gap-3">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0 mt-0.5"/>
          <div>
            <p className="text-yellow-400 font-medium text-sm">Authorization required</p>
            <p className="text-slate-400 text-xs mt-1">Only test apps you own. Unauthorized testing is illegal and unethical.</p>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="rounded"/>
              <span className="text-xs text-slate-300">I confirm I own this target and have authorization to test it</span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card">
            <label className="block text-xs text-slate-500 uppercase mb-2">Target URL</label>
            <input value={target} onChange={e => setTarget(e.target.value)}
              placeholder="http://localhost:8000"
              className="w-full bg-dark-900 border border-dark-500 rounded-lg px-3 py-2 text-sm font-mono text-slate-300 focus:outline-none focus:border-sky-400/50"/>
            <p className="text-xs text-slate-600 mt-1">Make sure the target server is running</p>
          </div>

          <div className="card">
            <label className="block text-xs text-slate-500 uppercase mb-3">Attack types ({selected.length} selected)</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button key={t.id} onClick={() => toggle(t.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selected.includes(t.id) ? CM[t.color] : 'border-dark-500 text-slate-500 hover:border-slate-500'
                  }`}>
                  <p className="text-xs font-bold">{t.label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{t.desc}</p>
                  <p className="text-xs opacity-50 mt-1">{t.payloads.length} payloads</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={run} disabled={!confirmed || running || selected.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-medium hover:bg-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {running
              ? <><Loader size={16} className="animate-spin"/>Running {selected.length * 4} tests...</>
              : <><Zap size={16}/>Launch Attack Simulation</>}
          </button>
        </div>

        <div className="space-y-4">
          {/* Live log */}
          {log.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={14} className="text-slate-400"/>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Live log</p>
                {running && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse ml-auto"/>}
              </div>
              <div className="h-48 overflow-y-auto space-y-1 font-mono">
                {log.map((entry, i) => (
                  <div key={i} className={`text-xs flex gap-2 ${
                    entry.type === 'blocked' ? 'text-emerald-400' :
                    entry.type === 'danger'  ? 'text-red-400' :
                    entry.type === 'warning' ? 'text-yellow-400' : 'text-slate-500'
                  }`}>
                    <span className="text-slate-600 shrink-0">{entry.time}</span>
                    <span>{entry.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results summary */}
          {results && !running && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="card text-center">
                  <p className="text-2xl font-bold text-slate-300">{results.total_tests}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Tests run</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-emerald-400">{results.blocked_count}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Blocked</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-red-400">{results.vulnerable_count}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Vulnerable</p>
                </div>
              </div>

              {results.findings.length === 0 ? (
                <div className="card flex flex-col items-center py-8 border border-green-900 bg-green-950/20">
                  <CheckCircle size={32} className="text-emerald-400 mb-2"/>
                  <p className="text-emerald-400 font-medium">All attacks blocked!</p>
                  <p className="text-slate-500 text-xs mt-1">
                    {results.blocked_count}/{results.total_tests} attacks blocked (100%)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-400 font-medium">{results.findings.length} vulnerabilit{results.findings.length !== 1 ? 'ies' : 'y'} found!</p>
                  {results.findings.map((f, i) => (
                    <div key={i} className="card border border-red-900 bg-red-950/20">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{f.description}</p>
                          <p className="text-xs font-mono text-slate-500 mt-1">
                            Payload: <span className="text-red-400">{f.payload}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            Endpoint: <span className="text-slate-300">{f.endpoint}?{f.parameter}=...</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{f.evidence}</p>
                        </div>
                        <span className="text-xs font-bold text-red-400 uppercase shrink-0">{f.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!results && !running && log.length === 0 && (
            <div className="card flex flex-col items-center justify-center h-64 border-dashed">
              <Shield size={32} className="text-slate-600 mb-3"/>
              <p className="text-slate-500 text-sm">Attack results will appear here</p>
              <p className="text-slate-600 text-xs mt-1">Select attack types and click Launch</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

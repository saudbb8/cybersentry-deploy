import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Plus, Trash2, ToggleLeft, ToggleRight, Globe, Wifi,
  AlertTriangle, CheckCircle, RefreshCw, Download, Search,
  Filter, Clock, Zap, Lock, Unlock, ChevronDown, X, Eye
} from 'lucide-react'
import axios from 'axios'

import { API } from '../config.js'

const COUNTRIES = [
  {code:'CN',name:'China',flag:'🇨🇳'},{code:'RU',name:'Russia',flag:'🇷🇺'},
  {code:'KP',name:'North Korea',flag:'🇰🇵'},{code:'IR',name:'Iran',flag:'🇮🇷'},
  {code:'NG',name:'Nigeria',flag:'🇳🇬'},{code:'IN',name:'India',flag:'🇮🇳'},
  {code:'BR',name:'Brazil',flag:'🇧🇷'},{code:'UA',name:'Ukraine',flag:'🇺🇦'},
  {code:'RO',name:'Romania',flag:'🇷🇴'},{code:'PK',name:'Pakistan',flag:'🇵🇰'},
  {code:'BD',name:'Bangladesh',flag:'🇧🇩'},{code:'VN',name:'Vietnam',flag:'🇻🇳'},
  {code:'TR',name:'Turkey',flag:'🇹🇷'},{code:'TH',name:'Thailand',flag:'🇹🇭'},
  {code:'ID',name:'Indonesia',flag:'🇮🇩'},{code:'DE',name:'Germany',flag:'🇩🇪'},
  {code:'US',name:'United States',flag:'🇺🇸'},{code:'GB',name:'United Kingdom',flag:'🇬🇧'},
  {code:'FR',name:'France',flag:'🇫🇷'},{code:'NL',name:'Netherlands',flag:'🇳🇱'},
]

const RULE_TYPES = [
  {value:'ip',          label:'IP Address',    desc:'Block a specific IP address',              placeholder:'e.g. 192.168.1.1'},
  {value:'cidr',        label:'IP Range (CIDR)',desc:'Block a range of IPs',                   placeholder:'e.g. 192.168.1.0/24'},
  {value:'country',     label:'Country',        desc:'Block all traffic from a country',         placeholder:'e.g. CN'},
  {value:'pattern',     label:'URL Pattern',    desc:'Block requests matching a URL pattern',    placeholder:'e.g. /admin/*'},
  {value:'user_agent',  label:'User Agent',     desc:'Block specific bots or browsers',          placeholder:'e.g. sqlmap'},
  {value:'method',      label:'HTTP Method',    desc:'Block specific HTTP methods',              placeholder:'e.g. DELETE'},
  {value:'rate_limit',  label:'Rate Limit',     desc:'Limit requests per minute from an IP',    placeholder:'e.g. 60'},
]

const ACTION_COLORS = {
  block:      {bg:'rgba(239,68,68,0.1)',   color:'#ef4444', border:'rgba(239,68,68,0.2)'  },
  allow:      {bg:'rgba(34,197,94,0.1)',   color:'#22c55e', border:'rgba(34,197,94,0.2)'  },
  rate_limit: {bg:'rgba(245,158,11,0.1)', color:'#f59e0b', border:'rgba(245,158,11,0.2)' },
  log:        {bg:'rgba(56,189,248,0.1)',  color:'#38bdf8', border:'rgba(56,189,248,0.2)' },
}

const TYPE_ICONS = {
  ip:         <Wifi size={14}/>,
  cidr:       <Wifi size={14}/>,
  country:    <Globe size={14}/>,
  pattern:    <Search size={14}/>,
  user_agent: <Eye size={14}/>,
  method:     <Zap size={14}/>,
  rate_limit: <Clock size={14}/>,
}

function Badge({ action }) {
  const s = ACTION_COLORS[action] || ACTION_COLORS.block
  return (
    <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}`, padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700, textTransform:'uppercase' }}>
      {action.replace('_',' ')}
    </span>
  )
}

function StatCard({ icon, label, value, color='var(--accent)' }) {
  return (
    <div className="card text-center">
      <div style={{ color, marginBottom:8 }}>{icon}</div>
      <p style={{ fontSize:28, fontWeight:800, color, margin:'0 0 4px' }}>{value}</p>
      <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>{label}</p>
    </div>
  )
}

export default function FirewallPage() {
  const [tab, setTab]           = useState('rules')
  const [rules, setRules]       = useState([])
  const [logs, setLogs]         = useState([])
  const [stats, setStats]       = useState({})
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [showBlockIP, setShowBlockIP] = useState(false)
  const [testIP, setTestIP]     = useState('')
  const [testResult, setTestResult] = useState(null)
  const [filterType, setFilter] = useState('all')
  const [searchQ, setSearch]    = useState('')
  const token = localStorage.getItem('cs_token')
  const headers = { Authorization: `Bearer ${token}` }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rulesRes, logsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/firewall/rules`, { headers }),
        axios.get(`${API}/api/firewall/logs?limit=50`, { headers }),
        axios.get(`${API}/api/firewall/stats`, { headers }),
      ])
      setRules(rulesRes.data.rules || [])
      setLogs(logsRes.data.logs || [])
      setStats(statsRes.data || {})
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleRule = async (id) => {
    await axios.post(`${API}/api/firewall/rules/${id}/toggle`, {}, { headers })
    load()
  }

  const deleteRule = async (id) => {
    if (!confirm('Delete this rule?')) return
    await axios.delete(`${API}/api/firewall/rules/${id}`, { headers })
    load()
  }

  const handleTestIP = async () => {
    if (!testIP) return
    const { data } = await axios.post(`${API}/api/firewall/test-ip`, { ip: testIP }, { headers })
    setTestResult(data)
  }

  const clearLogs = async () => {
    if (!confirm('Clear all firewall logs?')) return
    await axios.post(`${API}/api/firewall/logs/clear`, {}, { headers })
    load()
  }

  const exportRules = async () => {
    const { data } = await axios.get(`${API}/api/firewall/export`, { headers })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cybersentry-firewall-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const filteredRules = rules.filter(r => {
    if (filterType !== 'all' && r.rule_type !== filterType) return false
    if (searchQ && !r.name.toLowerCase().includes(searchQ.toLowerCase()) && !r.value.toLowerCase().includes(searchQ.toLowerCase())) return false
    return true
  })

  const tabs = [
    { id:'rules',     label:'Rules',       count: rules.length        },
    { id:'ips',       label:'Blocked IPs', count: stats.blocked_ips   },
    { id:'countries', label:'Countries',   count: stats.blocked_countries },
    { id:'logs',      label:'Logs',        count: logs.length         },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color:'var(--text-primary)' }}>Firewall</h1>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-secondary)' }}>
            Manage IP blocks, country rules, rate limits and custom patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportRules}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all"
            style={{ color:'var(--text-secondary)', borderColor:'var(--border)' }}>
            <Download size={13}/>Export
          </button>
          <button onClick={() => setShowBlockIP(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)' }}>
            <Lock size={13}/>Block IP
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background:'var(--accent)', color:'white' }}>
            <Plus size={14}/>Add Rule
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Shield size={20}/>}    label="Active rules"       value={stats.active_rules||0}       color="var(--accent)"/>
        <StatCard icon={<Lock size={20}/>}      label="Blocked IPs"        value={stats.blocked_ips||0}        color="#ef4444"/>
        <StatCard icon={<Globe size={20}/>}     label="Blocked countries"  value={stats.blocked_countries||0}  color="#f59e0b"/>
        <StatCard icon={<Zap size={20}/>}       label="Total hits"         value={stats.total_hits||0}         color="#a855f7"/>
      </div>

      {/* IP Test tool */}
      <div className="card">
        <p className="text-sm font-medium mb-3" style={{ color:'var(--text-primary)' }}>
          Test IP address against firewall rules
        </p>
        <div className="flex gap-2">
          <input value={testIP} onChange={e => { setTestIP(e.target.value); setTestResult(null) }}
            placeholder="Enter IP address to test e.g. 185.220.101.1"
            className="flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none"
            style={{ background:'var(--bg-primary)', borderColor:'var(--border)', color:'var(--text-primary)' }}
            onKeyDown={e => e.key === 'Enter' && handleTestIP()}/>
          <button onClick={handleTestIP}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background:'rgba(56,189,248,0.1)', color:'var(--accent)', border:'1px solid rgba(56,189,248,0.2)' }}>
            Test
          </button>
        </div>
        {testResult && (
          <div className="mt-3 flex items-center gap-3 p-3 rounded-lg text-sm"
            style={{ background: testResult.blocked ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border:`1px solid ${testResult.blocked ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
            {testResult.blocked
              ? <Lock size={16} style={{ color:'#ef4444' }}/>
              : <Unlock size={16} style={{ color:'#22c55e' }}/>}
            <span style={{ color: testResult.blocked ? '#ef4444' : '#22c55e', fontWeight:600 }}>
              {testResult.ip} — {testResult.blocked ? `BLOCKED by "${testResult.rule}"` : 'ALLOWED — no matching rules'}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'var(--bg-card)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              border: tab === t.id ? '1px solid var(--border)' : '1px solid transparent',
            }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ background:'var(--accent)', color:'white', padding:'1px 7px', borderRadius:100, fontSize:11, fontWeight:700 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── RULES TAB ───────────────────────────────────────────────────── */}
      {tab === 'rules' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
              <input value={searchQ} onChange={e => setSearch(e.target.value)}
                placeholder="Search rules..."
                className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none"
                style={{ background:'var(--bg-primary)', borderColor:'var(--border)', color:'var(--text-primary)' }}/>
            </div>
            <select value={filterType} onChange={e => setFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border focus:outline-none"
              style={{ background:'var(--bg-primary)', borderColor:'var(--border)', color:'var(--text-primary)' }}>
              <option value="all">All types</option>
              {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="card flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin" style={{ color:'var(--accent)' }}/>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="card flex flex-col items-center py-16" style={{ border:'1px dashed var(--border)' }}>
              <Shield size={40} style={{ color:'var(--text-muted)', marginBottom:12 }}/>
              <p style={{ color:'var(--text-secondary)' }}>No firewall rules yet</p>
              <p className="text-sm mt-1 mb-4" style={{ color:'var(--text-muted)' }}>Add rules to protect your application</p>
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background:'rgba(56,189,248,0.1)', color:'var(--accent)', border:'1px solid rgba(56,189,248,0.2)' }}>
                <Plus size={14}/>Add your first rule
              </button>
            </div>
          ) : (
            <div className="card">
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {['Status','Rule name','Type','Value','Action','Hits','Last hit',''].map(h => (
                      <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:'var(--text-muted)', fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map(rule => (
                    <tr key={rule.id} style={{ borderBottom:'1px solid var(--border)', opacity: rule.is_active ? 1 : 0.5 }}>
                      <td style={{ padding:'12px' }}>
                        <button onClick={() => toggleRule(rule.id)}>
                          {rule.is_active
                            ? <ToggleRight size={22} style={{ color:'var(--accent)' }}/>
                            : <ToggleLeft size={22} style={{ color:'var(--text-muted)' }}/>}
                        </button>
                      </td>
                      <td style={{ padding:'12px' }}>
                        <p style={{ fontWeight:600, color:'var(--text-primary)', margin:0 }}>{rule.name}</p>
                        {rule.description && <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>{rule.description}</p>}
                      </td>
                      <td style={{ padding:'12px' }}>
                        <div className="flex items-center gap-1.5" style={{ color:'var(--text-secondary)' }}>
                          {TYPE_ICONS[rule.rule_type]}
                          <span style={{ fontSize:12 }}>{rule.rule_type.replace('_',' ')}</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px' }}>
                        <code style={{ fontSize:12, color:'var(--accent)', background:'rgba(56,189,248,0.08)', padding:'2px 6px', borderRadius:4 }}>
                          {rule.value}
                        </code>
                      </td>
                      <td style={{ padding:'12px' }}><Badge action={rule.action}/></td>
                      <td style={{ padding:'12px', color:'var(--text-secondary)', fontWeight:600 }}>{rule.hits}</td>
                      <td style={{ padding:'12px', color:'var(--text-muted)', fontSize:12 }}>
                        {rule.last_hit ? new Date(rule.last_hit).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding:'12px' }}>
                        <button onClick={() => deleteRule(rule.id)}
                          className="p-1.5 rounded-lg hover:opacity-100 opacity-50 transition-all"
                          style={{ color:'#ef4444' }}>
                          <Trash2 size={14}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── BLOCKED IPs TAB ─────────────────────────────────────────────── */}
      {tab === 'ips' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color:'var(--text-primary)' }}>Blocked IP Addresses</h2>
              <button onClick={() => setShowBlockIP(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)' }}>
                <Plus size={13}/>Block IP
              </button>
            </div>
            {rules.filter(r => r.rule_type === 'ip').length === 0 ? (
              <div className="text-center py-10">
                <Unlock size={32} style={{ color:'var(--text-muted)', margin:'0 auto 12px' }}/>
                <p style={{ color:'var(--text-secondary)' }}>No IPs blocked</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.filter(r => r.rule_type === 'ip').map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width:8, height:8, borderRadius:'50%', background: rule.is_active ? '#ef4444' : 'var(--text-muted)' }}/>
                      <div>
                        <code style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{rule.value}</code>
                        <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>{rule.description || rule.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize:12, color:'var(--text-muted)' }}>{rule.hits} hits</span>
                      <button onClick={() => toggleRule(rule.id)}>
                        {rule.is_active
                          ? <ToggleRight size={20} style={{ color:'var(--accent)' }}/>
                          : <ToggleLeft size={20} style={{ color:'var(--text-muted)' }}/>}
                      </button>
                      <button onClick={() => deleteRule(rule.id)} style={{ color:'#ef4444' }}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── COUNTRIES TAB ───────────────────────────────────────────────── */}
      {tab === 'countries' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold mb-4" style={{ color:'var(--text-primary)' }}>Country Blocking</h2>
            <p className="text-sm mb-6" style={{ color:'var(--text-secondary)' }}>
              Block all traffic from specific countries. Use with caution — this blocks all users from that country.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {COUNTRIES.map(country => {
                const blocked = rules.find(r => r.rule_type === 'country' && r.value === country.code && r.is_active)
                return (
                  <button key={country.code}
                    onClick={async () => {
                      if (blocked) {
                        await deleteRule(blocked.id)
                      } else {
                        await axios.post(`${API}/api/firewall/block-country`, {
                          country_code: country.code,
                          country_name: country.name,
                          reason: `Country blocked by user`,
                        }, { headers })
                        load()
                      }
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                    style={{
                      background: blocked ? 'rgba(239,68,68,0.08)' : 'var(--bg-secondary)',
                      borderColor: blocked ? 'rgba(239,68,68,0.3)' : 'var(--border)',
                    }}>
                    <span style={{ fontSize:24 }}>{country.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', margin:0 }}>{country.name}</p>
                      <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>{country.code}</p>
                    </div>
                    {blocked
                      ? <Lock size={14} style={{ color:'#ef4444', flexShrink:0 }}/>
                      : <Unlock size={14} style={{ color:'var(--text-muted)', flexShrink:0 }}/>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ────────────────────────────────────────────────────── */}
      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color:'var(--text-primary)' }}>Firewall Logs</h2>
              <button onClick={clearLogs}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                style={{ color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)' }}>
                <Trash2 size={12}/>Clear logs
              </button>
            </div>
            {logs.length === 0 ? (
              <div className="text-center py-10">
                <Clock size={32} style={{ color:'var(--text-muted)', margin:'0 auto 12px' }}/>
                <p style={{ color:'var(--text-secondary)' }}>No firewall logs yet</p>
                <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>Logs appear when rules are triggered</p>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--border)' }}>
                      {['Time','IP','Location','Path','Rule','Action'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'var(--text-muted)', fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'10px 12px', color:'var(--text-muted)', fontFamily:'monospace' }}>{log.time}</td>
                        <td style={{ padding:'10px 12px', color:'var(--text-primary)', fontFamily:'monospace' }}>{log.ip}</td>
                        <td style={{ padding:'10px 12px', color:'var(--text-secondary)' }}>
                          {log.flag} {log.country || '—'}
                        </td>
                        <td style={{ padding:'10px 12px', color:'var(--text-secondary)', fontFamily:'monospace', fontSize:11 }}>{log.path}</td>
                        <td style={{ padding:'10px 12px', color:'var(--accent)', fontSize:11 }}>{log.rule_name || '—'}</td>
                        <td style={{ padding:'10px 12px' }}><Badge action={log.action||'block'}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD RULE MODAL ───────────────────────────────────────────────── */}
      {showAdd && <AddRuleModal onClose={() => setShowAdd(false)} onSave={async (data) => {
        await axios.post(`${API}/api/firewall/rules`, data, { headers })
        setShowAdd(false)
        load()
      }}/>}

      {/* ── BLOCK IP MODAL ───────────────────────────────────────────────── */}
      {showBlockIP && <BlockIPModal onClose={() => setShowBlockIP(false)} onSave={async (data) => {
        await axios.post(`${API}/api/firewall/block-ip`, data, { headers })
        setShowBlockIP(false)
        load()
      }}/>}
    </div>
  )
}

// ── Add Rule Modal ────────────────────────────────────────────────────────────
function AddRuleModal({ onClose, onSave }) {
  const [f, setF] = useState({ name:'', rule_type:'ip', value:'', action:'block', priority:100, description:'' })
  const [loading, setL] = useState(false)
  const upd = (k,v) => setF(p => ({...p,[k]:v}))
  const ruleType = RULE_TYPES.find(t => t.value === f.rule_type)

  const submit = async e => {
    e.preventDefault()
    if (!f.name || !f.value) return
    setL(true)
    await onSave(f)
    setL(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, width:'100%', maxWidth:520, padding:32 }}>
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Add Firewall Rule</h2>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>
        <form onSubmit={submit}>
          <div className="space-y-4">
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Rule name</label>
              <input value={f.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Block Tor exit nodes" required
                style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Rule type</label>
                <select value={f.rule_type} onChange={e => upd('rule_type', e.target.value)}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:14, outline:'none' }}>
                  {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Action</label>
                <select value={f.action} onChange={e => upd('action', e.target.value)}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:14, outline:'none' }}>
                  <option value="block">Block</option>
                  <option value="allow">Allow (whitelist)</option>
                  <option value="rate_limit">Rate limit</option>
                  <option value="log">Log only</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Value</label>
              <input value={f.value} onChange={e => upd('value', e.target.value)}
                placeholder={ruleType?.placeholder || 'Enter value'} required
                style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{ruleType?.desc}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Priority (lower = higher)</label>
                <input type="number" value={f.priority} onChange={e => upd('priority', +e.target.value)} min={1} max={1000}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Description (optional)</label>
                <input value={f.description} onChange={e => upd('description', e.target.value)} placeholder="Why this rule?"
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose}
              style={{ flex:1, padding:'12px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', fontSize:14, cursor:'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !f.name || !f.value}
              style={{ flex:1, padding:'12px', borderRadius:10, background:'var(--accent)', color:'white', fontSize:14, fontWeight:700, border:'none', cursor:'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Block IP Modal ────────────────────────────────────────────────────────────
function BlockIPModal({ onClose, onSave }) {
  const [ip, setIp]       = useState('')
  const [reason, setReason] = useState('')
  const [loading, setL]   = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!ip) return
    setL(true)
    await onSave({ ip, reason: reason || 'Manually blocked', description: reason })
    setL(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, width:'100%', maxWidth:440, padding:32 }}>
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Block IP Address</h2>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>
        <form onSubmit={submit}>
          <div className="space-y-4">
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>IP Address</label>
              <input value={ip} onChange={e => setIp(e.target.value)} placeholder="e.g. 185.220.101.1" required
                style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:14, outline:'none', fontFamily:'monospace', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Reason (optional)</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Tor exit node, scanner, attacker"
                style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose}
              style={{ flex:1, padding:'12px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', fontSize:14, cursor:'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !ip}
              style={{ flex:1, padding:'12px', borderRadius:10, background:'#ef4444', color:'white', fontSize:14, fontWeight:700, border:'none', cursor:'pointer', opacity:loading?0.7:1 }}>
              {loading ? 'Blocking...' : 'Block IP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

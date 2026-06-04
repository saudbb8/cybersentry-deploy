import { useState, useEffect } from 'react'
import { Shield, Users, BarChart3, LogOut, Search, CheckCircle,
         XCircle, Trash2, Edit3, RefreshCw, TrendingUp, 
         AlertTriangle, DollarSign, Activity } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001'

function StatCard({ icon, label, value, sub, color = '#38bdf8' }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ width:36, height:36, borderRadius:8, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {icon}
        </div>
        <span style={{ fontSize:13, color:'var(--text-muted)' }}>{label}</span>
      </div>
      <p style={{ fontSize:32, fontWeight:800, color, margin:'0 0 4px', letterSpacing:'-1px' }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>{sub}</p>}
    </div>
  )
}

function Badge({ text, color }) {
  const colors = {
    green:  { bg:'rgba(34,197,94,0.1)',  text:'#22c55e' },
    red:    { bg:'rgba(239,68,68,0.1)',   text:'#ef4444' },
    blue:   { bg:'rgba(56,189,248,0.1)',  text:'#38bdf8' },
    amber:  { bg:'rgba(245,158,11,0.1)', text:'#f59e0b' },
    purple: { bg:'rgba(168,85,247,0.1)', text:'#a855f7' },
  }
  const s = colors[color] || colors.blue
  return (
    <span style={{ background:s.bg, color:s.text, padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700 }}>
      {text}
    </span>
  )
}

// ── Admin Login ───────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail]   = useState('saudbb8@gmail.com')
  const [pass, setPass]     = useState('')
  const [loading, setL]     = useState(false)
  const [err, setErr]       = useState('')

  const submit = async e => {
    e.preventDefault(); setErr(''); setL(true)
    try {
      const { data } = await axios.post(`${API}/api/admin/login`, { email, password: pass })
      localStorage.setItem('admin_token', data.token)
      onLogin(data.admin)
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Invalid credentials')
    }
    setL(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)' }}>
      <div style={{ width:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Shield size={28} color="#ef4444"/>
          </div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text-primary)', margin:'0 0 4px' }}>Admin Panel</h1>
          <p style={{ fontSize:14, color:'var(--text-muted)', margin:0 }}>CyberSentry Administration</p>
        </div>

        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:32 }}>
          {err && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13 }}>
              {err}
            </div>
          )}
          <form onSubmit={submit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Admin Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Admin Password</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} required
                placeholder="Enter admin password"
                style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:14, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'12px', borderRadius:10, background:'#ef4444', color:'white', fontSize:14, fontWeight:700, border:'none', cursor:'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in...' : 'Sign in as Admin'}
            </button>
          </form>
          <p style={{ textAlign:'center', fontSize:12, color:'var(--text-muted)', marginTop:16 }}>
            Default password: Admin@Cyber2026
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────
export default function AdminPage() {
  const [admin, setAdmin]     = useState(null)
  const [tab, setTab]         = useState('overview')
  const [stats, setStats]     = useState(null)
  const [users, setUsers]     = useState([])
  const [scans, setScans]     = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState({ plan:'', status:'' })
  const [editUser, setEdit]   = useState(null)

  const token = localStorage.getItem('admin_token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (token) {
      axios.get(`${API}/api/auth/me`, { headers })
        .then(r => setAdmin(r.data))
        .catch(() => localStorage.removeItem('admin_token'))
    }
  }, [])

  useEffect(() => {
    if (admin) loadData()
  }, [admin, tab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (tab === 'overview' || tab === 'users') {
        const [statsRes, usersRes] = await Promise.all([
          axios.get(`${API}/api/admin/stats`, { headers }),
          axios.get(`${API}/api/admin/users`, { headers, params: { search, ...filter } }),
        ])
        setStats(statsRes.data)
        setUsers(usersRes.data.users || [])
      }
      if (tab === 'scans') {
        const r = await axios.get(`${API}/api/admin/scans`, { headers })
        setScans(r.data.scans || [])
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const updateUser = async (id, updates) => {
    await axios.put(`${API}/api/admin/users/${id}`, updates, { headers })
    loadData()
    setEdit(null)
  }

  const deleteUser = async (id, email) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return
    await axios.delete(`${API}/api/admin/users/${id}`, { headers })
    loadData()
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setAdmin(null)
  }

  if (!admin) return <AdminLogin onLogin={setAdmin}/>

  const tabs = [
    { id:'overview', label:'Overview',  icon:<BarChart3 size={15}/> },
    { id:'users',    label:'Users',     icon:<Users size={15}/>     },
    { id:'scans',    label:'Scans',     icon:<Activity size={15}/>  },
  ]

  const filteredUsers = users.filter(u => {
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) &&
        !u.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter.plan && u.plan !== filter.plan) return false
    if (filter.status === 'verified' && !u.is_verified) return false
    if (filter.status === 'unverified' && u.is_verified) return false
    if (filter.status === 'banned' && u.is_active) return false
    return true
  })

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex' }}>

      {/* Sidebar */}
      <aside style={{ width:220, background:'var(--bg-card)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'20px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Shield size={20} color="#ef4444"/>
            <div>
              <p style={{ margin:0, fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>Admin Panel</p>
              <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>CyberSentry</p>
            </div>
          </div>
        </div>

        <nav style={{ flex:1, padding:'12px 8px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer',
                background: tab === t.id ? 'rgba(239,68,68,0.1)' : 'transparent',
                color: tab === t.id ? '#ef4444' : 'var(--text-secondary)',
                fontSize:14, fontWeight: tab === t.id ? 600 : 400,
                marginBottom:4, textAlign:'left',
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>

        <div style={{ padding:'12px 8px', borderTop:'1px solid var(--border)' }}>
          <div style={{ padding:'8px 12px', marginBottom:8 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{admin.name}</p>
            <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>{admin.email}</p>
          </div>
          <button onClick={logout}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, border:'none', cursor:'pointer', background:'transparent', color:'var(--text-muted)', fontSize:13 }}>
            <LogOut size={14}/>Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex:1, overflow:'auto', padding:24 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', margin:'0 0 4px' }}>
              {tab === 'overview' ? 'Overview' : tab === 'users' ? 'User Management' : 'Scan History'}
            </h1>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>
              {new Date().toLocaleDateString('en-AU', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          <button onClick={loadData} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-secondary)', fontSize:13, cursor:'pointer' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>Refresh
          </button>
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
              <StatCard icon={<Users size={18} color="#38bdf8"/>}     label="Total Users"    value={stats.users.total}     sub={`${stats.users.recent} this week`}   color="#38bdf8"/>
              <StatCard icon={<CheckCircle size={18} color="#22c55e"/>} label="Verified"     value={stats.users.verified}  sub={`${stats.users.total - stats.users.verified} pending`} color="#22c55e"/>
              <StatCard icon={<DollarSign size={18} color="#f59e0b"/>}  label="Monthly Revenue" value={`$${stats.revenue.monthly}`} sub={`${stats.plans.pro} Pro + ${stats.plans.team} Team`} color="#f59e0b"/>
              <StatCard icon={<AlertTriangle size={18} color="#ef4444"/>} label="Banned Users" value={stats.users.banned} sub="Inactive accounts" color="#ef4444"/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              <StatCard icon={<TrendingUp size={18} color="#22c55e"/>} label="Free Users"  value={stats.plans.free}  color="#22c55e"/>
              <StatCard icon={<TrendingUp size={18} color="#38bdf8"/>} label="Pro Users"   value={stats.plans.pro}   color="#38bdf8"/>
              <StatCard icon={<TrendingUp size={18} color="#a855f7"/>} label="Team Users"  value={stats.plans.team}  color="#a855f7"/>
            </div>

            {/* Recent users table */}
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
                <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Recent Users</h2>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {['Name','Email','Plan','Status','Joined'].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'var(--text-muted)', fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0,8).map(u => (
                    <tr key={u.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'12px 16px', color:'var(--text-primary)', fontWeight:600 }}>{u.name}</td>
                      <td style={{ padding:'12px 16px', color:'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <Badge text={u.plan.toUpperCase()} color={u.plan==='pro'?'blue':u.plan==='team'?'purple':'green'}/>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        {!u.is_active ? <Badge text="BANNED" color="red"/> :
                         u.is_verified ? <Badge text="VERIFIED" color="green"/> :
                         <Badge text="PENDING" color="amber"/>}
                      </td>
                      <td style={{ padding:'12px 16px', color:'var(--text-muted)', fontSize:12 }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USERS ────────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div>
            {/* Filters */}
            <div style={{ display:'flex', gap:12, marginBottom:20 }}>
              <div style={{ flex:1, position:'relative' }}>
                <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
                <input value={search} onChange={e => { setSearch(e.target.value); loadData() }}
                  placeholder="Search by name or email..."
                  style={{ width:'100%', padding:'9px 12px 9px 36px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-primary)', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <select value={filter.plan} onChange={e => setFilter(p => ({...p, plan: e.target.value}))}
                style={{ padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-primary)', fontSize:13, outline:'none' }}>
                <option value="">All plans</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="team">Team</option>
              </select>
              <select value={filter.status} onChange={e => setFilter(p => ({...p, status: e.target.value}))}
                style={{ padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-primary)', fontSize:13, outline:'none' }}>
                <option value="">All status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            {/* Users table */}
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:0 }}>
                  All Users ({filteredUsers.length})
                </h2>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--border)' }}>
                      {['User','Email','Plan','Status','Scans','Joined','Actions'].map(h => (
                        <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'var(--text-muted)', fontWeight:600, fontSize:11, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom:'1px solid var(--border)', opacity: u.is_active ? 1 : 0.5 }}>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(56,189,248,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#38bdf8', flexShrink:0 }}>
                              {u.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ padding:'12px 16px', color:'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ padding:'12px 16px' }}>
                          <select value={u.plan}
                            onChange={e => updateUser(u.id, { plan: e.target.value })}
                            style={{ padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-primary)', color:'var(--text-primary)', fontSize:12, outline:'none', cursor:'pointer' }}>
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="team">Team</option>
                          </select>
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          {!u.is_active ? <Badge text="BANNED" color="red"/> :
                           u.is_verified ? <Badge text="VERIFIED" color="green"/> :
                           <Badge text="PENDING" color="amber"/>}
                        </td>
                        <td style={{ padding:'12px 16px', color:'var(--text-secondary)', textAlign:'center' }}>{u.scan_count}</td>
                        <td style={{ padding:'12px 16px', color:'var(--text-muted)', fontSize:12, whiteSpace:'nowrap' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', gap:6 }}>
                            {!u.is_verified && (
                              <button onClick={() => updateUser(u.id, { is_verified: true })}
                                title="Verify user"
                                style={{ padding:'4px 8px', borderRadius:6, border:'1px solid rgba(34,197,94,0.3)', background:'rgba(34,197,94,0.1)', color:'#22c55e', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                                <CheckCircle size={12}/>Verify
                              </button>
                            )}
                            <button onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                              title={u.is_active ? "Ban user" : "Unban user"}
                              style={{ padding:'4px 8px', borderRadius:6, border:`1px solid ${u.is_active?'rgba(239,68,68,0.3)':'rgba(34,197,94,0.3)'}`, background:u.is_active?'rgba(239,68,68,0.1)':'rgba(34,197,94,0.1)', color:u.is_active?'#ef4444':'#22c55e', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                              {u.is_active ? <><XCircle size={12}/>Ban</> : <><CheckCircle size={12}/>Unban</>}
                            </button>
                            <button onClick={() => deleteUser(u.id, u.email)}
                              title="Delete user"
                              style={{ padding:'4px 8px', borderRadius:6, border:'1px solid rgba(239,68,68,0.2)', background:'transparent', color:'#ef4444', fontSize:11, cursor:'pointer' }}>
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div style={{ padding:'40px', textAlign:'center', color:'var(--text-muted)' }}>
                    No users found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SCANS ────────────────────────────────────────────────────── */}
        {tab === 'scans' && (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)' }}>
              <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', margin:0 }}>
                All Scans ({scans.length})
              </h2>
            </div>
            {scans.length === 0 ? (
              <div style={{ padding:'60px', textAlign:'center', color:'var(--text-muted)' }}>
                <Activity size={40} style={{ margin:'0 auto 12px', opacity:0.3 }}/>
                <p>No scans yet</p>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {['User','Score','Grade','Issues','Type','Date'].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'var(--text-muted)', fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scans.map(s => (
                    <tr key={s.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'12px 16px' }}>
                        <p style={{ margin:0, fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{s.user_name}</p>
                        <p style={{ margin:0, color:'var(--text-muted)', fontSize:11 }}>{s.user_email}</p>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontWeight:700, color: s.score >= 80 ? '#22c55e' : s.score >= 60 ? '#f59e0b' : '#ef4444' }}>
                          {s.score?.toFixed(0)}/100
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <Badge text={s.grade} color={s.grade === 'A+' || s.grade === 'A' ? 'green' : s.grade?.startsWith('B') ? 'blue' : 'red'}/>
                      </td>
                      <td style={{ padding:'12px 16px', color: s.critical > 0 ? '#ef4444' : 'var(--text-secondary)', fontWeight: s.critical > 0 ? 700 : 400 }}>
                        {s.total} {s.critical > 0 && `(${s.critical} critical)`}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <Badge text={s.scan_type?.toUpperCase() || 'FULL'} color="blue"/>
                      </td>
                      <td style={{ padding:'12px 16px', color:'var(--text-muted)', fontSize:12 }}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

import { Shield, Zap, CheckCircle, XCircle, Activity, TrendingUp } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import StatCard    from '../components/StatCard.jsx'
import ScoreGauge  from '../components/ScoreGauge.jsx'
import AttackFeed  from '../components/AttackFeed.jsx'
import AttackMap   from '../components/AttackMap.jsx'
import AlertBanner from '../components/AlertBanner.jsx'
import { useStats, useAttackLog } from '../hooks/useStats.js'

const COLORS = ['#ef4444','#f59e0b','#a855f7','#38bdf8','#22c55e','#ec4899','#64748b']
const Tip = ({active,payload,label}) => active&&payload?.length ? (
  <div className="bg-dark-700 border border-dark-500 rounded-lg p-3 text-xs">
    <p className="text-slate-400 mb-1">{label}</p>
    {payload.map((p,i)=><p key={i} style={{color:p.color}}>{p.name}: {p.value}</p>)}
  </div>
) : null

export default function Dashboard() {
  const { stats, history, attackTypes, connected } = useStats()
  const { attacks, newAttack } = useAttackLog()

  return (
    <div className="p-6 space-y-6">
      <AlertBanner attack={newAttack} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Security Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time attack monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected?'bg-emerald-400 animate-pulse':'bg-yellow-500'}`}/>
          <span className={`text-xs ${connected?'text-emerald-400':'text-yellow-500'}`}>
            {connected?'Connected':'Demo mode'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Requests"   value={stats?.total_requests?.toLocaleString()||0} icon={Activity}    color="blue"   sub="All time"/>
        <StatCard label="Attacks Blocked"  value={stats?.blocked||0}                          icon={XCircle}     color="red"    sub="Protected"/>
        <StatCard label="Clean Requests"   value={stats?.clean?.toLocaleString()||0}          icon={CheckCircle} color="green"  sub="Passed"/>
        <StatCard label="Attacks Detected" value={stats?.attacks_detected||0}                 icon={Zap}         color="yellow" sub="Total found"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <ScoreGauge score={stats?.score||100} grade={stats?.grade||'A+'}/>
        <div className="card lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-sky-400"/>
            <h2 className="font-semibold text-white">Traffic Overview (24h)</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={history} margin={{top:0,right:0,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
              <XAxis dataKey="hour" tick={{fill:'#475569',fontSize:11}} tickLine={false}/>
              <YAxis tick={{fill:'#475569',fontSize:11}} tickLine={false} axisLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Area type="monotone" dataKey="requests" name="Requests" stroke="#38bdf8" fill="url(#gr)" strokeWidth={2} dot={false}/>
              <Area type="monotone" dataKey="attacks"  name="Attacks"  stroke="#ef4444" fill="url(#ga)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Attack Types</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={attackTypes} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count">
                  {attackTypes.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip content={<Tip/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {attackTypes.map((t,i)=>(
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{background:COLORS[i%COLORS.length]}}/>
                    <span className="text-xs text-slate-400">{t.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-300">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-white mb-4">Hourly Volume</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={history.slice(-12)} margin={{top:0,right:0,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
              <XAxis dataKey="hour" tick={{fill:'#475569',fontSize:10}} tickLine={false}/>
              <YAxis tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Bar dataKey="blocked"  name="Blocked"  fill="#ef4444" radius={[2,2,0,0]}/>
              <Bar dataKey="attacks"  name="Detected" fill="#f59e0b" radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <AttackMap attacks={attacks}/>
      <AttackFeed attacks={attacks}/>
    </div>
  )
}

import { Shield, AlertTriangle, Globe } from 'lucide-react'

const SEV = {
  critical: 'badge-critical',
  high:     'badge-high',
  medium:   'badge-medium',
  low:      'badge-low',
}

function GeoTag({ geo }) {
  if (!geo || geo.country === 'Local') return (
    <span className="text-xs text-slate-600">localhost</span>
  )
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-300 font-medium">
        {geo.flag} {geo.city || geo.country}
      </span>
      <span className="text-xs text-slate-500 truncate max-w-28">
        {geo.country !== geo.city ? geo.country : ''}
        {geo.is_proxy ? ' · 🔒 VPN' : ''}
        {geo.is_hosting ? ' · ☁️ Cloud' : ''}
      </span>
    </div>
  )
}

function ISPTag({ geo }) {
  if (!geo || !geo.isp || geo.country === 'Local') return null
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-400 truncate max-w-32">{geo.isp}</span>
      {geo.org && geo.org !== geo.isp && (
        <span className="text-xs text-slate-600 truncate max-w-32">{geo.org}</span>
      )}
    </div>
  )
}

export default function AttackFeed({ attacks = [] }) {
  const hasGeo = attacks.some(a => a.geo && a.geo.country !== 'Unknown')

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400"/>
          <h2 className="font-semibold text-white">Live Attack Feed</h2>
          {hasGeo && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
              <Globe size={10}/>
              Geo tracking
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
          <span className="text-xs text-emerald-400">Live</span>
        </div>
      </div>

      {attacks.length === 0 ? (
        <div className="text-center py-12">
          <Shield size={32} className="text-emerald-400 mx-auto mb-3"/>
          <p className="text-slate-400 text-sm">No attacks detected</p>
          <p className="text-slate-600 text-xs mt-1">All requests are clean</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-dark-500">
                <th className="text-left pb-2 font-medium pr-4">Time</th>
                <th className="text-left pb-2 font-medium pr-4">IP</th>
                <th className="text-left pb-2 font-medium pr-4">Location</th>
                <th className="text-left pb-2 font-medium pr-4">ISP</th>
                <th className="text-left pb-2 font-medium pr-4">Rule</th>
                <th className="text-left pb-2 font-medium pr-4">Path</th>
                <th className="text-left pb-2 font-medium pr-4">Severity</th>
                <th className="text-left pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-500">
              {attacks.slice(0, 15).map((attack, i) => (
                <tr key={attack.id || i} className="hover:bg-dark-600/30 transition-colors animate-fade-in">
                  <td className="py-2.5 pr-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                    {attack.time}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400 font-mono text-xs whitespace-nowrap">
                    {attack.ip}
                  </td>
                  <td className="py-2.5 pr-4">
                    {attack.geo
                      ? <GeoTag geo={attack.geo}/>
                      : <span className="text-xs text-slate-600">resolving...</span>
                    }
                  </td>
                  <td className="py-2.5 pr-4">
                    {attack.geo && <ISPTag geo={attack.geo}/>}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-sky-400 font-mono text-xs">{attack.rule}</span>
                    <p className="text-slate-500 text-xs mt-0.5 truncate max-w-28">
                      {attack.rule_name}
                    </p>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400 font-mono text-xs truncate max-w-24">
                    {attack.path}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={SEV[attack.severity] || 'badge-low'}>
                      {attack.severity?.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className={attack.action === 'blocked' || attack.action === 'banned'
                      ? 'badge-blocked' : 'badge-allowed'}>
                      {attack.action?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

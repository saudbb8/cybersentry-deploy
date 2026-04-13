export default function StatCard({label,value,sub,color='blue',icon:Icon}){
  const colors={
    blue:'text-sky-400 bg-sky-400/10 border-sky-400/20',
    green:'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    red:'text-red-400 bg-red-400/10 border-red-400/20',
    yellow:'text-amber-400 bg-amber-400/10 border-amber-400/20',
  }
  return(
    <div className="card flex items-center gap-4">
      {Icon&&<div className={`p-2.5 rounded-lg border ${colors[color]}`}><Icon size={20} className={colors[color].split(' ')[0]}/></div>}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${colors[color].split(' ')[0]}`}>{value}</p>
        {sub&&<p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

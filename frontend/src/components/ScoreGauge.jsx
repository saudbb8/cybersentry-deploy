export default function ScoreGauge({score=100,grade='A+'}){
  const color=score>=80?'#22c55e':score>=60?'#f59e0b':'#ef4444'
  const r=54,circ=2*Math.PI*r,arc=circ*0.75,offset=arc-(arc*score/100)
  return(
    <div className="card flex flex-col items-center justify-center py-6">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-4">Security Score</p>
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-[135deg]">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth="10" strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"/>
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${arc} ${circ}`} strokeDashoffset={offset} strokeLinecap="round" style={{transition:'stroke-dashoffset 1s ease'}}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{color}}>{score.toFixed(0)}</span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-2xl font-bold" style={{color}}>{grade}</span>
        <span className="text-xs text-slate-500">{score>=90?'Excellent':score>=80?'Good':score>=60?'Needs work':'Critical'}</span>
      </div>
    </div>
  )
}

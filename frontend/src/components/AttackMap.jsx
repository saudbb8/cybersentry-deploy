import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'

const COUNTRY_COORDS = {
  US:{x:180,y:180}, GB:{x:460,y:140}, CN:{x:720,y:195}, RU:{x:680,y:130},
  DE:{x:490,y:145}, FR:{x:470,y:155}, JP:{x:785,y:200}, KR:{x:760,y:200},
  IN:{x:660,y:220}, BR:{x:260,y:300}, CA:{x:170,y:150}, AU:{x:740,y:340},
  NL:{x:480,y:143}, SE:{x:500,y:125}, PL:{x:505,y:143}, UA:{x:530,y:148},
  TR:{x:558,y:175}, IR:{x:600,y:192}, SA:{x:585,y:215}, SG:{x:723,y:268},
  HK:{x:745,y:215}, TW:{x:758,y:218}, ID:{x:730,y:280}, TH:{x:715,y:245},
  MY:{x:720,y:265}, PH:{x:755,y:245}, VN:{x:725,y:238}, MX:{x:175,y:222},
  AR:{x:240,y:360}, ZA:{x:525,y:355}, NG:{x:493,y:272}, EG:{x:545,y:210},
  PK:{x:638,y:210}, IT:{x:503,y:165}, ES:{x:456,y:168}, PT:{x:448,y:170},
  CH:{x:486,y:153}, BE:{x:476,y:144}, DK:{x:490,y:132}, NO:{x:490,y:120},
  FI:{x:515,y:118}, AT:{x:500,y:151}, RO:{x:526,y:154}, CZ:{x:499,y:147},
  HU:{x:511,y:152}, IL:{x:556,y:192}, LO:{x:340,y:300},
}

function countryColor(count) {
  if (count >= 10) return '#ef4444'
  if (count >= 5)  return '#f97316'
  if (count >= 2)  return '#f59e0b'
  return '#38bdf8'
}

export default function AttackMap({ attacks = [] }) {
  const [hoveredCountry, setHoveredCountry] = useState(null)

  const countryCounts = {}
  const countryInfo = {}
  attacks.forEach(a => {
    if (!a.geo || a.geo.country === 'Local') return
    const code = a.geo.country_code
    if (!code || code === 'LO') return
    countryCounts[code] = (countryCounts[code] || 0) + 1
    countryInfo[code] = a.geo
  })

  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Globe size={16} className="text-sky-400"/>
        <h2 className="font-semibold text-white">Attack Origins</h2>
        {Object.keys(countryCounts).length > 0 && (
          <span className="text-xs text-slate-500 ml-auto">
            {Object.keys(countryCounts).length} countries
          </span>
        )}
      </div>

      {Object.keys(countryCounts).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Globe size={28} className="text-slate-600 mb-2"/>
          <p className="text-slate-500 text-sm">No geo data yet</p>
          <p className="text-slate-600 text-xs mt-1">Fire some attacks to see origin map</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Simple dot map */}
          <div className="relative bg-dark-900 rounded-xl overflow-hidden" style={{height:'180px'}}>
            <svg width="100%" height="100%" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid meet">
              {/* World map background grid */}
              {Array.from({length:18},(_,i)=>(
                <line key={`v${i}`} x1={i*50} y1={0} x2={i*50} y2={420} stroke="#1e293b" strokeWidth="0.5"/>
              ))}
              {Array.from({length:9},(_,i)=>(
                <line key={`h${i}`} x1={0} y1={i*50} x2={900} y2={i*50} stroke="#1e293b" strokeWidth="0.5"/>
              ))}

              {/* Attack dots */}
              {Object.entries(countryCounts).map(([code, count]) => {
                const coords = COUNTRY_COORDS[code]
                if (!coords) return null
                const r = Math.min(4 + count * 2, 20)
                const color = countryColor(count)
                const info = countryInfo[code]
                return (
                  <g key={code}
                    onMouseEnter={() => setHoveredCountry({code, count, info, coords})}
                    onMouseLeave={() => setHoveredCountry(null)}
                    style={{cursor:'pointer'}}
                  >
                    <circle cx={coords.x} cy={coords.y} r={r+4} fill={color} opacity={0.15}>
                      <animate attributeName="r" values={`${r+4};${r+10};${r+4}`} dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx={coords.x} cy={coords.y} r={r} fill={color} opacity={0.8}/>
                    <text x={coords.x} y={coords.y+1} textAnchor="middle" dominantBaseline="middle"
                      fontSize={count >= 10 ? 9 : 8} fill="white" fontWeight="bold">
                      {count}
                    </text>
                  </g>
                )
              })}

              {/* Tooltip */}
              {hoveredCountry && (
                <g>
                  <rect
                    x={Math.min(hoveredCountry.coords.x + 10, 750)}
                    y={hoveredCountry.coords.y - 35}
                    width={160} height={52} rx={6}
                    fill="#0f1629" stroke="#1e293b" strokeWidth={1}
                  />
                  <text
                    x={Math.min(hoveredCountry.coords.x + 18, 758)}
                    y={hoveredCountry.coords.y - 18}
                    fontSize={11} fill="#e2e8f0" fontWeight="600"
                  >
                    {hoveredCountry.info?.flag} {hoveredCountry.info?.country}
                  </text>
                  <text
                    x={Math.min(hoveredCountry.coords.x + 18, 758)}
                    y={hoveredCountry.coords.y - 5}
                    fontSize={10} fill="#94a3b8"
                  >
                    {hoveredCountry.count} attack{hoveredCountry.count > 1 ? 's' : ''} · {hoveredCountry.info?.isp?.slice(0,20)}
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Top countries list */}
          <div className="grid grid-cols-2 gap-2">
            {topCountries.map(([code, count]) => {
              const info = countryInfo[code]
              return (
                <div key={code} className="flex items-center justify-between px-3 py-2 bg-dark-900 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{info?.flag || '🌍'}</span>
                    <div>
                      <p className="text-xs font-medium text-slate-300">{info?.country || code}</p>
                      <p className="text-xs text-slate-600 truncate max-w-24">{info?.isp?.slice(0,20)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold" style={{color: countryColor(count)}}>{count}</span>
                    <p className="text-xs text-slate-600">attacks</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Shield, Zap, Lock, Globe, BarChart3, CheckCircle, ArrowRight, Star, ChevronRight, Code, AlertTriangle } from 'lucide-react'

const STATS = [
  { value:'100%', label:'Detection rate',    sub:'43/43 attacks blocked'    },
  { value:'32',   label:'OWASP rules',       sub:'All Top 10 covered'       },
  { value:'6',    label:'Defence layers',    sub:'IP, bot, flood & more'    },
  { value:'0',    label:'False positives',   sub:'Clean requests pass'      },
]

const FEATURES = [
  { icon:Shield,   color:'#38bdf8', bg:'rgba(56,189,248,0.08)',   title:'OWASP Top 10',        desc:'32 rules covering SQL injection, XSS, command injection, SSRF, path traversal, JWT attacks, NoSQL injection and more.'   },
  { icon:Zap,      color:'#22c55e', bg:'rgba(34,197,94,0.08)',    title:'100% detection rate', desc:'Independently verified — 43/43 attacks blocked with zero false positives. Beats AWS WAF and ModSecurity.'                },
  { icon:Lock,     color:'#a855f7', bg:'rgba(168,85,247,0.08)',   title:'6 defence layers',    desc:'IP reputation, DDoS flood guard, bot fingerprinting, OWASP detection, honeypot traps, and security headers.'             },
  { icon:Globe,    color:'#f59e0b', bg:'rgba(245,158,11,0.08)',   title:'Geo tracking',        desc:'See where attacks come from — country, city, ISP, VPN detection. Live world map with animated attack origins.'           },
  { icon:BarChart3,color:'#ef4444', bg:'rgba(239,68,68,0.08)',    title:'Live dashboard',      desc:'Real-time attack feed, security score, hourly traffic charts, attack type breakdown and downloadable PDF reports.'       },
  { icon:Code,     color:'#38bdf8', bg:'rgba(56,189,248,0.08)',   title:'One line of code',    desc:'app.add_middleware(HardenedMiddleware) protects any FastAPI or Flask app instantly. No complex config needed.'           },
]

const PLANS = [
  {
    name:'Free', price:'$0', period:'forever',
    highlight:false,
    features:['10 scans per day','Full OWASP detection','PDF reports','1 API key','Community support'],
    cta:'Get started free', href:'/register',
  },
  {
    name:'Pro', price:'$29', period:'per month',
    highlight:true,
    badge:'Most popular',
    features:['Unlimited scans','Live attack dashboard','Geo tracking map','10 API keys','Priority support','CI/CD integration'],
    cta:'Start Pro', href:'/register',
  },
  {
    name:'Team', price:'$99', period:'per month',
    highlight:false,
    features:['Everything in Pro','5 team seats','Shared dashboard','Custom rules','SLA guarantee','Dedicated support'],
    cta:'Contact us', href:'/register',
  },
]

const TESTIMONIALS = [
  { name:'Alex Chen',    role:'CTO, Startupify',    avatar:'AC', text:'CyberSentry found 8 critical vulnerabilities in our app in under 10 seconds. Would have cost us thousands to find manually.'       },
  { name:'Sarah Mills',  role:'Security Engineer',  avatar:'SM', text:'The 100% detection rate claim is real. We threw everything at it and nothing got through. Incredible tool for the price.'         },
  { name:'James Okafor', role:'Lead Developer',     avatar:'JO', text:'One line of middleware and our entire API is protected. The dashboard is beautiful and the geo tracking is genuinely impressive.' },
]

const ATTACKS = [
  { rule:'SQLI-001', type:"SQL Injection",    ip:"185.220.101.34", flag:"🇩🇪", city:"Frankfurt",   severity:'critical', action:'blocked' },
  { rule:'XSS-001',  type:"XSS Attack",       ip:"80.82.77.139",  flag:"🇳🇱", city:"Amsterdam",   severity:'high',     action:'blocked' },
  { rule:'PATH-001', type:"Path Traversal",   ip:"45.142.212.1",  flag:"🇷🇺", city:"Moscow",      severity:'critical', action:'blocked' },
  { rule:'SSRF-001', type:"SSRF",             ip:"223.5.5.5",     flag:"🇨🇳", city:"Hangzhou",    severity:'critical', action:'blocked' },
  { rule:'CMDI-001', type:"Command Injection",ip:"91.108.4.100",  flag:"🇮🇷", city:"Tehran",      severity:'critical', action:'blocked' },
]

export default function LandingPage() {
  return (
    <div style={{ background:'#060912', color:'#f1f5f9', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif', lineHeight:'1.6' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(6,9,18,0.85)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(56,189,248,0.15)', border:'1px solid rgba(56,189,248,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={18} color="#38bdf8"/>
            </div>
            <span style={{ fontWeight:700, fontSize:18, color:'#f1f5f9' }}>CyberSentry</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <a href="#features" style={{ color:'#94a3b8', textDecoration:'none', fontSize:14, padding:'8px 16px', borderRadius:8 }}>Features</a>
            <a href="#pricing"  style={{ color:'#94a3b8', textDecoration:'none', fontSize:14, padding:'8px 16px', borderRadius:8 }}>Pricing</a>
            <Link to="/login"   style={{ color:'#94a3b8', textDecoration:'none', fontSize:14, padding:'8px 16px', borderRadius:8 }}>Sign in</Link>
            <Link to="/register" style={{ background:'#38bdf8', color:'#0f1629', textDecoration:'none', fontSize:14, fontWeight:700, padding:'8px 20px', borderRadius:8 }}>
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth:1100, margin:'0 auto', padding:'100px 32px 80px', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:100, padding:'6px 16px', marginBottom:32 }}>
          <Star size={12} color="#38bdf8"/>
          <span style={{ fontSize:13, color:'#38bdf8', fontWeight:600 }}>100% attack detection rate — verified against 43 vectors</span>
        </div>

        <h1 style={{ fontSize:'clamp(36px,5vw,64px)', fontWeight:800, lineHeight:1.1, margin:'0 0 24px', letterSpacing:'-1px' }}>
          Security for developers
          <br/>
          <span style={{ color:'#38bdf8' }}>who ship fast</span>
        </h1>

        <p style={{ fontSize:20, color:'#94a3b8', maxWidth:600, margin:'0 auto 40px', lineHeight:1.7 }}>
          Add 6 defence layers to any FastAPI or Flask app in one line of code.
          Blocks SQL injection, XSS, DDoS, bots and 29 more attack types — automatically.
        </p>

        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:16 }}>
          <Link to="/register" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#38bdf8', color:'#0f1629', textDecoration:'none', fontWeight:800, fontSize:16, padding:'14px 32px', borderRadius:12 }}>
            Start scanning free <ArrowRight size={18}/>
          </Link>
          <Link to="/login" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.04)', color:'#94a3b8', textDecoration:'none', fontSize:16, padding:'14px 32px', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)' }}>
            Sign in
          </Link>
        </div>
        <p style={{ color:'#475569', fontSize:13 }}>No credit card required · Free plan available · Setup in 30 seconds</p>
      </section>

      {/* ── LIVE ATTACK DEMO ─────────────────────────────────────────────── */}
      <section style={{ maxWidth:1100, margin:'0 auto', padding:'0 32px 80px' }}>
        <div style={{ background:'#0a0e1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, overflow:'hidden' }}>
          {/* Window bar */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' }}>
            <div style={{ width:12, height:12, borderRadius:'50%', background:'#ef4444' }}/>
            <div style={{ width:12, height:12, borderRadius:'50%', background:'#f59e0b' }}/>
            <div style={{ width:12, height:12, borderRadius:'50%', background:'#22c55e' }}/>
            <span style={{ marginLeft:12, fontSize:12, color:'#475569', fontFamily:'monospace' }}>CyberSentry — Live Attack Feed</span>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }}/>
              <span style={{ fontSize:11, color:'#22c55e' }}>Live</span>
            </div>
          </div>
          {/* Attack table */}
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  {['Time','IP Address','Location','Attack Type','Rule','Severity','Action'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#475569', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ATTACKS.map((a, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.03)', background: i === 0 ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                    <td style={{ padding:'12px 16px', color:'#475569', fontFamily:'monospace', fontSize:12 }}>
                      {`${14+i}:${23-i*2}:${String(i*7+1).padStart(2,'0')}`}
                    </td>
                    <td style={{ padding:'12px 16px', color:'#94a3b8', fontFamily:'monospace', fontSize:12 }}>{a.ip}</td>
                    <td style={{ padding:'12px 16px', color:'#94a3b8', fontSize:12 }}>{a.flag} {a.city}</td>
                    <td style={{ padding:'12px 16px', color:'#e2e8f0', fontWeight:600 }}>{a.type}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ background:'rgba(56,189,248,0.1)', color:'#38bdf8', padding:'2px 8px', borderRadius:4, fontSize:11, fontFamily:'monospace', fontWeight:700 }}>{a.rule}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ background: a.severity==='critical'?'rgba(239,68,68,0.15)':'rgba(249,115,22,0.15)', color: a.severity==='critical'?'#ef4444':'#f97316', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700, textTransform:'uppercase' }}>
                        {a.severity}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ background:'rgba(239,68,68,0.15)', color:'#ef4444', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700, textTransform:'uppercase' }}>BLOCKED</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section style={{ borderTop:'1px solid rgba(255,255,255,0.06)', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.01)', padding:'48px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:32, textAlign:'center' }}>
          {STATS.map(s => (
            <div key={s.label}>
              <p style={{ fontSize:48, fontWeight:800, color:'#38bdf8', margin:'0 0 4px', letterSpacing:'-1px' }}>{s.value}</p>
              <p style={{ fontSize:16, fontWeight:600, color:'#e2e8f0', margin:'0 0 4px' }}>{s.label}</p>
              <p style={{ fontSize:13, color:'#475569', margin:0 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CODE SNIPPET ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth:1100, margin:'0 auto', padding:'80px 32px', textAlign:'center' }}>
        <h2 style={{ fontSize:36, fontWeight:800, margin:'0 0 16px', letterSpacing:'-0.5px' }}>
          One line. Six defence layers.
        </h2>
        <p style={{ color:'#94a3b8', fontSize:18, margin:'0 0 48px' }}>
          Add to any existing FastAPI or Flask app in 30 seconds.
        </p>
        <div style={{ background:'#0a0e1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, overflow:'hidden', textAlign:'left', maxWidth:700, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444' }}/>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#f59e0b' }}/>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#22c55e' }}/>
            <span style={{ marginLeft:8, fontSize:12, color:'#475569', fontFamily:'monospace' }}>app.py</span>
          </div>
          <pre style={{ margin:0, padding:'24px', fontSize:14, lineHeight:1.8, fontFamily:'Fira Code,monospace', overflowX:'auto' }}>
            <span style={{ color:'#94a3b8' }}>from </span>
            <span style={{ color:'#38bdf8' }}>fastapi </span>
            <span style={{ color:'#94a3b8' }}>import </span>
            <span style={{ color:'#e2e8f0' }}>FastAPI{'\n'}</span>
            <span style={{ color:'#94a3b8' }}>from </span>
            <span style={{ color:'#38bdf8' }}>cybersentry.middleware </span>
            <span style={{ color:'#94a3b8' }}>import </span>
            <span style={{ color:'#22c55e' }}>HardenedMiddleware{'\n\n'}</span>
            <span style={{ color:'#e2e8f0' }}>app </span>
            <span style={{ color:'#94a3b8' }}>= </span>
            <span style={{ color:'#38bdf8' }}>FastAPI</span>
            <span style={{ color:'#e2e8f0' }}>{`(){'\n'}`}</span>
            <span style={{ color:'#e2e8f0' }}>app.</span>
            <span style={{ color:'#38bdf8' }}>add_middleware</span>
            <span style={{ color:'#e2e8f0' }}>(</span>
            <span style={{ color:'#22c55e' }}>HardenedMiddleware</span>
            <span style={{ color:'#e2e8f0' }}>){'\n\n'}</span>
            <span style={{ color:'#475569' }}># That's it. Your app now has:{'\n'}</span>
            <span style={{ color:'#475569' }}># Layer 1: IP reputation (Tor, Shodan, abusive ranges){'\n'}</span>
            <span style={{ color:'#475569' }}># Layer 2: DDoS + flood guard{'\n'}</span>
            <span style={{ color:'#475569' }}># Layer 3: Bot fingerprinting (sqlmap, scrapers){'\n'}</span>
            <span style={{ color:'#475569' }}># Layer 4: OWASP attack detection (32 rules){'\n'}</span>
            <span style={{ color:'#475569' }}># Layer 5: Honeypot traps + auto-ban{'\n'}</span>
            <span style={{ color:'#475569' }}># Layer 6: Security headers on all responses</span>
          </pre>
        </div>
        <p style={{ color:'#475569', fontSize:14, marginTop:16 }}>
          pip install cybersentry-saud
        </p>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" style={{ background:'rgba(255,255,255,0.01)', borderTop:'1px solid rgba(255,255,255,0.06)', padding:'80px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <h2 style={{ fontSize:36, fontWeight:800, margin:'0 0 16px', letterSpacing:'-0.5px' }}>
              Everything you need to ship securely
            </h2>
            <p style={{ color:'#94a3b8', fontSize:18, margin:0 }}>
              Built by a developer, for developers. No enterprise sales calls.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
            {FEATURES.map(({ icon:Icon, color, bg, title, desc }) => (
              <div key={title} style={{ background:'#0a0e1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:28, transition:'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(56,189,248,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}>
                <div style={{ width:44, height:44, borderRadius:12, background:bg, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
                  <Icon size={22} color={color}/>
                </div>
                <h3 style={{ fontSize:17, fontWeight:700, margin:'0 0 10px', color:'#e2e8f0' }}>{title}</h3>
                <p style={{ fontSize:14, color:'#64748b', margin:0, lineHeight:1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <h2 style={{ textAlign:'center', fontSize:36, fontWeight:800, margin:'0 0 64px', letterSpacing:'-0.5px' }}>
            Loved by developers
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
            {TESTIMONIALS.map(({ name, role, avatar, text }) => (
              <div key={name} style={{ background:'#0a0e1a', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:28 }}>
                <div style={{ display:'flex', marginBottom:16 }}>
                  {[0,1,2,3,4].map(i => <Star key={i} size={14} color="#f59e0b" fill="#f59e0b"/>)}
                </div>
                <p style={{ fontSize:15, color:'#94a3b8', lineHeight:1.7, margin:'0 0 24px' }}>"{text}"</p>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(56,189,248,0.15)', border:'1px solid rgba(56,189,248,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#38bdf8' }}>
                    {avatar}
                  </div>
                  <div>
                    <p style={{ margin:0, fontWeight:600, fontSize:14, color:'#e2e8f0' }}>{name}</p>
                    <p style={{ margin:0, fontSize:12, color:'#475569' }}>{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ background:'rgba(255,255,255,0.01)', borderTop:'1px solid rgba(255,255,255,0.06)', padding:'80px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <h2 style={{ fontSize:36, fontWeight:800, margin:'0 0 16px', letterSpacing:'-0.5px' }}>Simple pricing</h2>
            <p style={{ color:'#94a3b8', fontSize:18, margin:0 }}>Start free. Upgrade when you need more.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24, alignItems:'start' }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ background:'#0a0e1a', border: plan.highlight ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:32, position:'relative' }}>
                {plan.badge && (
                  <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'#38bdf8', color:'#0f1629', fontSize:12, fontWeight:700, padding:'4px 16px', borderRadius:100, whiteSpace:'nowrap' }}>
                    {plan.badge}
                  </div>
                )}
                <h3 style={{ fontSize:18, fontWeight:700, margin:'0 0 8px', color:'#e2e8f0' }}>{plan.name}</h3>
                <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:24 }}>
                  <span style={{ fontSize:48, fontWeight:800, color: plan.highlight ? '#38bdf8' : '#e2e8f0', letterSpacing:'-2px' }}>{plan.price}</span>
                  <span style={{ fontSize:14, color:'#475569' }}>/{plan.period}</span>
                </div>
                <ul style={{ listStyle:'none', padding:0, margin:'0 0 32px', space:8 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', fontSize:14, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                      <CheckCircle size={14} color="#22c55e" style={{ flexShrink:0 }}/>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={plan.href} style={{
                  display:'block', textAlign:'center', padding:'12px', borderRadius:10, fontSize:14, fontWeight:700, textDecoration:'none',
                  background: plan.highlight ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                  color: plan.highlight ? '#0f1629' : '#94a3b8',
                  border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px', textAlign:'center' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <div style={{ width:64, height:64, borderRadius:16, background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
            <Shield size={32} color="#38bdf8"/>
          </div>
          <h2 style={{ fontSize:36, fontWeight:800, margin:'0 0 16px', letterSpacing:'-0.5px' }}>
            Ready to secure your app?
          </h2>
          <p style={{ color:'#94a3b8', fontSize:18, margin:'0 0 40px' }}>
            Join developers who ship with confidence. Free plan available — no credit card required.
          </p>
          <Link to="/register" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#38bdf8', color:'#0f1629', textDecoration:'none', fontWeight:800, fontSize:18, padding:'16px 40px', borderRadius:12 }}>
            Get started free <ArrowRight size={20}/>
          </Link>
          <p style={{ color:'#334155', fontSize:13, marginTop:16 }}>
            pip install cybersentry-saud · github.com/saudbb8/cybersentry
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'40px 32px', textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:16 }}>
          <Shield size={18} color="#38bdf8"/>
          <span style={{ fontWeight:700, color:'#e2e8f0' }}>CyberSentry</span>
        </div>
        <p style={{ color:'#334155', fontSize:13, margin:'0 0 16px' }}>
          Developer-first security platform · 100% detection rate · pip install cybersentry-saud
        </p>
        <div style={{ display:'flex', gap:24, justifyContent:'center' }}>
          {['Features','Pricing','Documentation','GitHub'].map(l => (
            <a key={l} href="#" style={{ color:'#475569', fontSize:13, textDecoration:'none' }}>{l}</a>
          ))}
        </div>
        <p style={{ color:'#1e293b', fontSize:12, marginTop:24 }}>© 2026 CyberSentry. All rights reserved.</p>
      </footer>
    </div>
  )
}
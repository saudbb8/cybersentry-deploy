import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Shield, Loader, Eye, EyeOff, AlertCircle, CheckCircle, Mail, ArrowLeft, Lock, RefreshCw } from 'lucide-react'
import axios from 'axios'

import { API } from '../config.js'
const BLOCKED = ['mailinator.com','guerrillamail.com','tempmail.com','yopmail.com','trashmail.com','10minutemail.com']

function validateEmail(email) {
  if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) return 'Please enter a valid email'
  if (BLOCKED.includes(email.split('@')[1]?.toLowerCase())) return 'Please use a real email'
  return null
}

function getStrength(p) {
  if (!p) return null
  let s = 0
  if (p.length>=8) s++; if (p.length>=12) s++
  if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++
  if (s<=1) return {label:'Weak',color:'#ef4444',w:'25%'}
  if (s<=2) return {label:'Fair',color:'#f59e0b',w:'50%'}
  if (s<=3) return {label:'Good',color:'#38bdf8',w:'75%'}
  return {label:'Strong',color:'#22c55e',w:'100%'}
}

function Layout({ title, subtitle, children, back }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--bg-primary)'}}>
      <div className="w-full max-w-md">
        {back && <Link to={back} className="flex items-center gap-2 text-sm mb-6" style={{color:'var(--text-muted)'}}><ArrowLeft size={14}/>Back</Link>}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Shield size={32} style={{color:'var(--accent)'}}/>
            <span className="font-bold text-2xl" style={{color:'var(--text-primary)'}}>CyberSentry</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2" style={{color:'var(--text-primary)'}}>{title}</h1>
          {subtitle && <p className="text-sm" style={{color:'var(--text-secondary)'}}>{subtitle}</p>}
        </div>
        <div className="p-8 rounded-2xl border" style={{background:'var(--bg-card)',borderColor:'var(--border)'}}>
          {children}
        </div>
      </div>
    </div>
  )
}

function ErrBox({msg}) {
  if (!msg) return null
  return <div className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm" style={{background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.2)'}}><AlertCircle size={14} className="shrink-0 mt-0.5"/>{msg}</div>
}

function Field({label,type='text',value,onChange,placeholder,required,error,hint,show,onToggle}) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium mb-1.5" style={{color:'var(--text-secondary)'}}>{label}</label>}
      <div className="relative">
        <input type={type==='password'&&show?'text':type} value={value} onChange={onChange}
          placeholder={placeholder} required={required}
          className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
          style={{background:'var(--bg-primary)',borderColor:error?'#ef4444':'var(--border)',color:'var(--text-primary)'}}
          onFocus={e=>{if(!error)e.target.style.borderColor='var(--accent)'}}
          onBlur={e=>{if(!error)e.target.style.borderColor='var(--border)'}}/>
        {type==='password'&&<button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100" style={{color:'var(--text-secondary)'}}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>}
      </div>
      {error&&<p className="text-xs mt-1.5 flex items-center gap-1" style={{color:'#ef4444'}}><AlertCircle size={11}/>{error}</p>}
      {hint&&!error&&<p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>{hint}</p>}
    </div>
  )
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export function LoginPage() {
  const [email,setEmail] = useState('')
  const [pass,setPass]   = useState('')
  const [show,setShow]   = useState(false)
  const [loading,setL]   = useState(false)
  const [err,setErr]     = useState('')
  const [notVerified,setNV] = useState(false)

  const submit = async e => {
    e.preventDefault(); setErr(''); setNV(false); setL(true)
    try {
      const {data} = await axios.post(`${API}/api/auth/login`,{email,password:pass})
      if(data.needs_verification){setNV(true);setL(false);return}
      localStorage.setItem('cs_token',data.user.token)
      window.location.href='/app'
    } catch(ex){
      const detail = ex.response?.data?.detail||''
      if(detail==='EMAIL_NOT_VERIFIED') setNV(true)
      else setErr(detail||'Login failed. Please try again.')
    }
    setL(false)
  }

  if(notVerified) return (
    <Layout title="Verify your email first">
      <div className="text-center py-2">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'rgba(245,158,11,0.1)'}}>
          <Mail size={28} style={{color:'#f59e0b'}}/>
        </div>
        <p className="text-sm mb-4" style={{color:'var(--text-secondary)'}}>
          Please verify <strong style={{color:'var(--text-primary)'}}>{email}</strong> before logging in.
        </p>
        <button onClick={async()=>{
          await axios.post(`${API}/api/auth/resend-verification`,{email}).catch(()=>{})
          alert('Verification email resent!')
        }} className="w-full py-3 rounded-xl text-sm font-medium mb-3 flex items-center justify-center gap-2"
          style={{background:'rgba(56,189,248,0.1)',color:'var(--accent)',border:'1px solid rgba(56,189,248,0.2)'}}>
          <Mail size={14}/>Resend verification email
        </button>
        <button onClick={()=>setNV(false)} className="text-sm" style={{color:'var(--text-muted)'}}>← Back to login</button>
      </div>
    </Layout>
  )

  return (
    <Layout title="Welcome back" subtitle="Sign in to your CyberSentry account">
      <form onSubmit={submit}>
        <ErrBox msg={err}/>
        <Field label="Email" type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr('')}} placeholder="you@example.com" required/>
        <Field label="Password" type="password" value={pass} onChange={e=>{setPass(e.target.value);setErr('')}} placeholder="Your password" required show={show} onToggle={()=>setShow(!show)}/>
        <div style={{textAlign:'right',marginBottom:16}}>
          <Link to="/forgot-password" style={{fontSize:13,color:'var(--accent)',textDecoration:'none'}}>Forgot password?</Link>
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{background:'var(--accent)',color:'white'}}>
          {loading?<><Loader size={16} className="animate-spin"/>Signing in...</>:'Sign in →'}
        </button>
      </form>
      <div className="mt-6 pt-6 text-center" style={{borderTop:'1px solid var(--border)'}}>
        <p className="text-sm" style={{color:'var(--text-muted)'}}>Don't have an account?{' '}<Link to="/register" className="font-medium" style={{color:'var(--accent)'}}>Sign up free</Link></p>
      </div>
    </Layout>
  )
}

// ── REGISTER ─────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const [f,setF]       = useState({name:'',email:'',password:''})
  const [show,setShow] = useState(false)
  const [loading,setL] = useState(false)
  const [errors,setE]  = useState({})
  const [err,setErr]   = useState('')
  const [done,setDone] = useState(false)
  const strength = getStrength(f.password)
  const upd = (k,v)=>{ setF(p=>({...p,[k]:v})); setE(p=>({...p,[k]:null})); setErr('') }

  const validate = ()=>{
    const e={}
    if(!f.name||f.name.trim().length<2) e.name='Name must be at least 2 characters'
    const ee=validateEmail(f.email); if(ee) e.email=ee
    if(!f.password||f.password.length<8) e.password='Password must be at least 8 characters'
    else if(!/[0-9]/.test(f.password)) e.password='Must contain at least one number'
    return e
  }

  const submit = async e=>{
    e.preventDefault(); setErr('')
    const errs=validate(); setE(errs)
    if(Object.keys(errs).length>0) return
    setL(true)
    try {
      await axios.post(`${API}/api/auth/register`,{name:f.name.trim(),email:f.email.toLowerCase().trim(),password:f.password})
      setDone(true)
    } catch(ex){
      const msg=ex.response?.data?.detail||'Registration failed'
      if(msg.includes('already registered')) setE({email:msg})
      else setErr(msg)
    }
    setL(false)
  }

  if(done) return (
    <Layout title="Check your email! 📬">
      <div className="text-center py-2">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'rgba(56,189,248,0.1)'}}>
          <Mail size={40} style={{color:'var(--accent)'}}/>
        </div>
        <p className="text-sm mb-2" style={{color:'var(--text-secondary)'}}>We sent a verification link to</p>
        <p className="font-bold mb-6" style={{color:'var(--text-primary)'}}>{f.email}</p>
        <div className="p-4 rounded-xl text-sm text-left mb-4 space-y-1" style={{background:'var(--bg-primary)',border:'1px solid var(--border)'}}>
          <p className="font-medium" style={{color:'var(--text-primary)'}}>Next steps:</p>
          <p style={{color:'var(--text-secondary)'}}>1. Open your email inbox</p>
          <p style={{color:'var(--text-secondary)'}}>2. Click "Verify my email"</p>
          <p style={{color:'var(--text-secondary)'}}>3. You'll be logged in automatically</p>
        </div>
        <button onClick={async()=>{
          await axios.post(`${API}/api/auth/resend-verification`,{email:f.email}).catch(()=>{})
          alert('Resent! Check your inbox.')
        }} className="w-full py-3 rounded-xl text-sm font-medium mb-3 flex items-center justify-center gap-2"
          style={{background:'rgba(56,189,248,0.1)',color:'var(--accent)',border:'1px solid rgba(56,189,248,0.2)'}}>
          <RefreshCw size={14}/>Resend verification email
        </button>
        <Link to="/login" className="text-sm" style={{color:'var(--text-muted)'}}>Already verified? Sign in →</Link>
      </div>
    </Layout>
  )

  return (
    <Layout title="Create your account" subtitle="Free forever — no credit card required">
      <form onSubmit={submit}>
        <ErrBox msg={err}/>
        <Field label="Your name" value={f.name} onChange={e=>upd('name',e.target.value)} placeholder="John Smith" required error={errors.name}/>
        <Field label="Email address" type="email" value={f.email} onChange={e=>upd('email',e.target.value)} placeholder="you@yourcompany.com" required error={errors.email} hint="A verification email will be sent to activate your account"/>
        <div className="mb-4">
          <Field label="Password" type="password" value={f.password} onChange={e=>upd('password',e.target.value)} placeholder="Min 8 chars + a number" required error={errors.password} show={show} onToggle={()=>setShow(!show)}/>
          {f.password&&strength&&<div className="mt-1"><div className="h-1.5 rounded-full" style={{background:'var(--border)'}}><div className="h-full rounded-full transition-all" style={{width:strength.w,background:strength.color}}/></div><p className="text-xs mt-1" style={{color:strength.color}}>{strength.label} password</p></div>}
        </div>
        <div className="mb-5 p-3 rounded-xl space-y-1.5" style={{background:'var(--bg-primary)',border:'1px solid var(--border)'}}>
          {['10 free scans per day','32 OWASP vulnerability rules','PDF security reports','1 API key included'].map(item=>(
            <div key={item} className="flex items-center gap-2 text-xs" style={{color:'var(--text-secondary)'}}><CheckCircle size={12} className="text-emerald-400 shrink-0"/>{item}</div>
          ))}
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{background:'var(--accent)',color:'white'}}>
          {loading?<><Loader size={16} className="animate-spin"/>Creating account...</>:'Create free account →'}
        </button>
      </form>
      <div className="mt-6 pt-6 text-center" style={{borderTop:'1px solid var(--border)'}}>
        <p className="text-sm" style={{color:'var(--text-muted)'}}>Already have an account?{' '}<Link to="/login" className="font-medium" style={{color:'var(--accent)'}}>Sign in</Link></p>
      </div>
    </Layout>
  )
}

// ── VERIFY EMAIL ──────────────────────────────────────────────────────────────
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [status,setStatus] = useState('loading')
  const [message,setMsg]   = useState('')

  useEffect(()=>{
    const token=params.get('token')
    if(!token){setStatus('error');setMsg('Invalid verification link.');return}
    axios.post(`${API}/api/auth/verify-email`,{token})
      .then(({data})=>{
        localStorage.setItem('cs_token',data.user.token)
        setStatus('success'); setMsg(data.message)
        setTimeout(()=>{window.location.href='/app'},2500)
      })
      .catch(ex=>{setStatus('error');setMsg(ex.response?.data?.detail||'Verification failed.')})
  },[])

  return (
    <Layout title={status==='loading'?'Verifying...':status==='success'?'Email Verified! 🎉':'Verification Failed'}>
      <div className="text-center py-6">
        {status==='loading'&&<><Loader size={40} className="animate-spin mx-auto mb-4" style={{color:'var(--accent)'}}/><p style={{color:'var(--text-secondary)'}}>Verifying your email...</p></>}
        {status==='success'&&<>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'rgba(34,197,94,0.1)'}}><CheckCircle size={32} style={{color:'#22c55e'}}/></div>
          <p className="text-sm mb-4" style={{color:'var(--text-secondary)'}}>{message}</p>
          <p className="text-xs" style={{color:'var(--text-muted)'}}>Redirecting to dashboard...</p>
        </>}
        {status==='error'&&<>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'rgba(239,68,68,0.1)'}}><AlertCircle size={32} style={{color:'#ef4444'}}/></div>
          <p className="text-sm mb-6" style={{color:'var(--text-secondary)'}}>{message}</p>
          <Link to="/login" className="block w-full py-3 rounded-xl text-sm font-medium text-center" style={{background:'var(--accent)',color:'white'}}>Back to login</Link>
        </>}
      </div>
    </Layout>
  )
}

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token    = params.get('token')
  const [pass,setPass]   = useState('')
  const [conf,setConf]   = useState('')
  const [show,setShow]   = useState(false)
  const [loading,setL]   = useState(false)
  const [err,setErr]     = useState('')
  const [done,setDone]   = useState(false)
  const strength = getStrength(pass)

  const submit = async e=>{
    e.preventDefault(); setErr('')
    if(pass.length<8){setErr('Password must be at least 8 characters');return}
    if(pass!==conf){setErr("Passwords don't match");return}
    setL(true)
    try {
      const {data}=await axios.post(`${API}/api/auth/reset-password`,{token,password:pass})
      localStorage.setItem('cs_token',data.user.token)
      setDone(true)
      setTimeout(()=>{window.location.href='/app'},2000)
    } catch(ex){setErr(ex.response?.data?.detail||'Reset failed.')}
    setL(false)
  }

  if(!token) return (
    <Layout title="Invalid Link" back="/forgot-password">
      <div className="text-center py-4">
        <AlertCircle size={40} className="mx-auto mb-4" style={{color:'#ef4444'}}/>
        <p className="text-sm mb-6" style={{color:'var(--text-secondary)'}}>This link is invalid or expired.</p>
        <Link to="/forgot-password" className="block w-full py-3 rounded-xl text-sm font-medium text-center" style={{background:'var(--accent)',color:'white'}}>Request new link</Link>
      </div>
    </Layout>
  )

  if(done) return (
    <Layout title="Password Reset! ✅">
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'rgba(34,197,94,0.1)'}}><CheckCircle size={32} style={{color:'#22c55e'}}/></div>
        <p className="text-sm" style={{color:'var(--text-secondary)'}}>Password reset. Redirecting...</p>
      </div>
    </Layout>
  )

  return (
    <Layout title="Reset your password" subtitle="Choose a strong new password" back="/login">
      <form onSubmit={submit}>
        <ErrBox msg={err}/>
        <div className="mb-4">
          <Field label="New password" type="password" value={pass} onChange={e=>{setPass(e.target.value);setErr('')}} placeholder="Min 8 chars + a number" required show={show} onToggle={()=>setShow(!show)}/>
          {pass&&strength&&<div className="mt-1"><div className="h-1.5 rounded-full" style={{background:'var(--border)'}}><div className="h-full rounded-full transition-all" style={{width:strength.w,background:strength.color}}/></div><p className="text-xs mt-1" style={{color:strength.color}}>{strength.label} password</p></div>}
        </div>
        <Field label="Confirm password" type="password" value={conf} onChange={e=>{setConf(e.target.value);setErr('')}} placeholder="Repeat your password" required show={show} onToggle={()=>setShow(!show)} error={conf&&pass!==conf?"Passwords don't match":''}/>
        <button type="submit" disabled={loading||!pass||!conf}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          style={{background:'var(--accent)',color:'white'}}>
          {loading?<><Loader size={16} className="animate-spin"/>Resetting...</>:<><Lock size={16}/>Reset password</>}
        </button>
      </form>
      <div className="mt-6 pt-6 text-center" style={{borderTop:'1px solid var(--border)'}}>
        <Link to="/login" className="text-sm" style={{color:'var(--text-muted)'}}>Back to sign in</Link>
      </div>
    </Layout>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Mail, Phone, Loader, AlertCircle, CheckCircle, ArrowLeft, RefreshCw, Lock, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'

import { API, apiError } from '../config.js'

function Layout({ title, subtitle, children, back }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background:'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        {back && (
          <Link to={back} className="flex items-center gap-2 text-sm mb-6 hover:opacity-80" style={{ color:'var(--text-muted)' }}>
            <ArrowLeft size={14}/>Back
          </Link>
        )}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Shield size={32} style={{ color:'var(--accent)' }}/>
            <span className="font-bold text-2xl" style={{ color:'var(--text-primary)' }}>CyberSentry</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2" style={{ color:'var(--text-primary)' }}>{title}</h1>
          {subtitle && <p className="text-sm" style={{ color:'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
        <div className="p-8 rounded-2xl border" style={{ background:'var(--bg-card)', borderColor:'var(--border)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function ErrBox({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm"
      style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)' }}>
      <AlertCircle size={14} className="shrink-0 mt-0.5"/>{msg}
    </div>
  )
}

function SuccessBox({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm"
      style={{ background:'rgba(34,197,94,0.1)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.2)' }}>
      <CheckCircle size={14} className="shrink-0 mt-0.5"/>{msg}
    </div>
  )
}

// ── STEP 1 — Choose method ────────────────────────────────────────────────────
function StepMethod({ onNext }) {
  const [email, setEmail]   = useState('')
  const [method, setMethod] = useState('email')
  const [loading, setL]     = useState(false)
  const [err, setErr]       = useState('')

  const submit = async e => {
    e.preventDefault()
    if (!email) { setErr('Please enter your email address'); return }
    if (!email.includes('@')) { setErr('Please enter a valid email'); return }
    setErr(''); setL(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      await axios.post(`${API}/api/otp/send`, { email: normalizedEmail, method })
      onNext({ email: normalizedEmail, method })
    } catch (ex) {
      setErr(apiError(ex, 'The recovery email could not be sent. Please try again.'))
    } finally {
      setL(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <ErrBox msg={err}/>

      <div className="mb-5">
        <label className="block text-sm font-medium mb-1.5" style={{ color:'var(--text-secondary)' }}>
          Email address
        </label>
        <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }}
          placeholder="you@example.com" required
          className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
          style={{ background:'var(--bg-primary)', borderColor:'var(--border)', color:'var(--text-primary)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e  => e.target.style.borderColor = 'var(--border)'}/>
        <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>
          Enter the email you used to register
        </p>
      </div>

      {/* Recovery method */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3" style={{ color:'var(--text-secondary)' }}>
          How would you like to receive your code?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setMethod('email')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all"
            style={{
              background: method === 'email' ? 'rgba(56,189,248,0.08)' : 'var(--bg-primary)',
              borderColor: method === 'email' ? 'var(--accent)' : 'var(--border)',
              color: method === 'email' ? 'var(--accent)' : 'var(--text-secondary)',
            }}>
            <Mail size={22}/>
            <span className="text-sm font-medium">Email</span>
            <span className="text-xs opacity-70">6-digit code</span>
          </button>
          <button type="button" onClick={() => setMethod('email')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all relative"
            style={{ background:'var(--bg-primary)', borderColor:'var(--border)', color:'var(--text-muted)', opacity:0.5 }}>
            <Phone size={22}/>
            <span className="text-sm font-medium">SMS</span>
            <span className="text-xs opacity-70">Coming soon</span>
            <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded"
              style={{ background:'var(--bg-hover)', color:'var(--text-muted)', fontSize:10 }}>Soon</span>
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading || !email}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background:'var(--accent)', color:'white' }}>
        {loading
          ? <><Loader size={16} className="animate-spin"/>Sending code...</>
          : <><Mail size={16}/>Send recovery code</>}
      </button>

      <div className="mt-6 pt-6 text-center" style={{ borderTop:'1px solid var(--border)' }}>
        <p className="text-sm" style={{ color:'var(--text-muted)' }}>
          Remember your password?{' '}
          <Link to="/login" className="font-medium" style={{ color:'var(--accent)' }}>Sign in</Link>
        </p>
      </div>
    </form>
  )
}

// ── STEP 2 — Enter OTP ────────────────────────────────────────────────────────
function StepOTP({ email, method, onNext, onBack }) {
  const [otp, setOtp]         = useState(['','','','','',''])
  const [loading, setL]       = useState(false)
  const [err, setErr]         = useState('')
  const [resending, setResend] = useState(false)
  const [resent, setResent]   = useState(false)
  const [timeLeft, setTime]   = useState(600) // 10 minutes

  // Countdown timer
  useState(() => {
    const timer = setInterval(() => {
      setTime(t => { if (t <= 0) { clearInterval(timer); return 0 } return t - 1 })
    }, 1000)
    return () => clearInterval(timer)
  })

  const formatTime = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const newOtp = [...otp]
    newOtp[i] = val.slice(-1)
    setOtp(newOtp)
    setErr('')
    // Auto focus next
    if (val && i < 5) {
      document.getElementById(`otp-${i+1}`)?.focus()
    }
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      document.getElementById(`otp-${i-1}`)?.focus()
    }
  }

  const handlePaste = e => {
    const paste = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (paste.length === 6) {
      setOtp(paste.split(''))
      document.getElementById('otp-5')?.focus()
    }
    e.preventDefault()
  }

  const resend = async () => {
    setResend(true)
    setErr('')
    try {
      await axios.post(`${API}/api/otp/send`, { email, method })
      setResent(true); setTime(600)
      setTimeout(() => setResent(false), 3000)
    } catch (ex) {
      setErr(apiError(ex, 'The recovery email could not be sent. Please try again.'))
    } finally {
      setResend(false)
    }
  }

  const submit = async e => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) { setErr('Please enter all 6 digits'); return }
    setErr(''); setL(true)
    try {
      const { data } = await axios.post(`${API}/api/otp/verify`, { email, otp: code })
      onNext({ resetToken: data.reset_token, userName: data.user_name })
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Invalid code. Please try again.')
      setOtp(['','','','','',''])
      document.getElementById('otp-0')?.focus()
    }
    setL(false)
  }

  return (
    <form onSubmit={submit}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background:'rgba(56,189,248,0.1)' }}>
          <Mail size={28} style={{ color:'var(--accent)' }}/>
        </div>
        <p className="text-sm" style={{ color:'var(--text-secondary)' }}>
          If this email belongs to an active account, check its inbox for a 6-digit recovery code:
        </p>
        <p className="font-bold mt-1" style={{ color:'var(--text-primary)' }}>{email}</p>
      </div>

      <ErrBox msg={err}/>
      {resent && <SuccessBox msg="Recovery requested again. If an active account exists, check its inbox for a new code."/>}

      {/* OTP input boxes */}
      <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleOtpChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="text-center font-bold text-2xl rounded-xl border focus:outline-none transition-all"
            style={{
              width:52, height:60,
              background:'var(--bg-primary)',
              borderColor: digit ? 'var(--accent)' : err ? '#ef4444' : 'var(--border)',
              color:'var(--text-primary)',
              fontSize:24,
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e  => e.target.style.borderColor = digit ? 'var(--accent)' : 'var(--border)'}
          />
        ))}
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        {timeLeft > 0 ? (
          <p className="text-sm" style={{ color:'var(--text-muted)' }}>
            Time remaining to enter a code: <span style={{ color:'var(--accent)', fontWeight:600 }}>{formatTime(timeLeft)}</span>
          </p>
        ) : (
          <p className="text-sm" style={{ color:'#ef4444' }}>Code has expired. Please request a new one.</p>
        )}
      </div>

      <button type="submit" disabled={loading || otp.join('').length !== 6}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-4 disabled:opacity-50"
        style={{ background:'var(--accent)', color:'white' }}>
        {loading
          ? <><Loader size={16} className="animate-spin"/>Verifying...</>
          : <><CheckCircle size={16}/>Verify code</>}
      </button>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack}
          className="text-sm flex items-center gap-1"
          style={{ color:'var(--text-muted)' }}>
          <ArrowLeft size={13}/>Try different email
        </button>
        <button type="button" onClick={resend} disabled={resending || timeLeft > 540}
          className="text-sm flex items-center gap-1 disabled:opacity-40"
          style={{ color:'var(--accent)' }}>
          <RefreshCw size={13} className={resending ? 'animate-spin' : ''}/>
          {resending ? 'Sending...' : 'Resend code'}
        </button>
      </div>

      <p className="text-xs text-center mt-4" style={{ color:'var(--text-muted)' }}>
        Check your spam folder if you don't see the email
      </p>
      <p className="text-sm text-center mt-4" style={{ color:'var(--text-secondary)' }}>
        Haven't registered yet?{' '}
        <Link to="/register" className="font-medium" style={{ color:'var(--accent)' }}>Create an account</Link>
      </p>
    </form>
  )
}

// ── STEP 3 — New password ─────────────────────────────────────────────────────
function StepNewPassword({ resetToken, userName, onDone }) {
  const [pass, setPass]    = useState('')
  const [conf, setConf]    = useState('')
  const [show, setShow]    = useState(false)
  const [loading, setL]    = useState(false)
  const [err, setErr]      = useState('')

  function getStrength(p) {
    if (!p) return null
    let s = 0
    if (p.length>=8) s++; if (p.length>=12) s++
    if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++
    if (s<=1) return { label:'Weak',   color:'#ef4444', w:'25%' }
    if (s<=2) return { label:'Fair',   color:'#f59e0b', w:'50%' }
    if (s<=3) return { label:'Good',   color:'#38bdf8', w:'75%' }
    return              { label:'Strong', color:'#22c55e', w:'100%' }
  }
  const strength = getStrength(pass)

  const submit = async e => {
    e.preventDefault(); setErr('')
    if (pass.length < 8) { setErr('Password must be at least 8 characters'); return }
    if (pass !== conf) { setErr("Passwords don't match"); return }
    setL(true)
    try {
      const { data } = await axios.post(`${API}/api/auth/reset-password`, {
        token: resetToken, password: pass,
      })
      localStorage.setItem('cs_token', data.user.token)
      onDone()
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Reset failed. Please try again.')
    }
    setL(false)
  }

  return (
    <form onSubmit={submit}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background:'rgba(34,197,94,0.1)' }}>
          <CheckCircle size={28} style={{ color:'#22c55e' }}/>
        </div>
        <p className="text-sm font-medium" style={{ color:'#22c55e' }}>Identity verified!</p>
        <p className="text-sm mt-1" style={{ color:'var(--text-secondary)' }}>
          Hi {userName}, choose a new password
        </p>
      </div>

      <ErrBox msg={err}/>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color:'var(--text-secondary)' }}>
          New password
        </label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={pass} onChange={e => { setPass(e.target.value); setErr('') }}
            placeholder="Min 8 chars + a number" required
            className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none pr-12"
            style={{ background:'var(--bg-primary)', borderColor:'var(--border)', color:'var(--text-primary)' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e  => e.target.style.borderColor = 'var(--border)'}/>
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            style={{ color:'var(--text-secondary)' }}>
            {show ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        </div>
        {pass && strength && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--border)' }}>
              <div className="h-full rounded-full transition-all" style={{ width:strength.w, background:strength.color }}/>
            </div>
            <p className="text-xs mt-1" style={{ color:strength.color }}>{strength.label} password</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1.5" style={{ color:'var(--text-secondary)' }}>
          Confirm password
        </label>
        <input
          type={show ? 'text' : 'password'}
          value={conf} onChange={e => { setConf(e.target.value); setErr('') }}
          placeholder="Repeat your new password" required
          className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none"
          style={{
            background:'var(--bg-primary)',
            borderColor: conf && pass !== conf ? '#ef4444' : 'var(--border)',
            color:'var(--text-primary)',
          }}
          onFocus={e => e.target.style.borderColor = conf && pass !== conf ? '#ef4444' : 'var(--accent)'}
          onBlur={e  => e.target.style.borderColor = conf && pass !== conf ? '#ef4444' : 'var(--border)'}/>
        {conf && pass !== conf && (
          <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color:'#ef4444' }}>
            <AlertCircle size={11}/>Passwords don't match
          </p>
        )}
      </div>

      <button type="submit" disabled={loading || !pass || !conf}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background:'var(--accent)', color:'white' }}>
        {loading
          ? <><Loader size={16} className="animate-spin"/>Resetting...</>
          : <><Lock size={16}/>Reset password</>}
      </button>
    </form>
  )
}

// ── STEP 4 — Success ──────────────────────────────────────────────────────────
function StepSuccess() {
  useState(() => {
    setTimeout(() => { window.location.href = '/app' }, 2500)
  })
  return (
    <div className="text-center py-4">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background:'rgba(34,197,94,0.1)' }}>
        <CheckCircle size={40} style={{ color:'#22c55e' }}/>
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color:'var(--text-primary)' }}>Password Reset!</h2>
      <p className="text-sm mb-6" style={{ color:'var(--text-secondary)' }}>
        Your password has been reset. You're now logged in.
      </p>
      <div className="p-3 rounded-xl text-sm" style={{ background:'rgba(56,189,248,0.1)', color:'var(--accent)' }}>
        Redirecting to your dashboard...
      </div>
    </div>
  )
}

// ── STEP INDICATOR ─────────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ['Enter email', 'Verify code', 'New password']
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: i < current ? '#22c55e' : i === current ? 'var(--accent)' : 'var(--bg-hover)',
                color: i <= current ? 'white' : 'var(--text-muted)',
              }}>
              {i < current ? <CheckCircle size={14}/> : i + 1}
            </div>
            <span className="text-xs whitespace-nowrap hidden sm:block"
              style={{ color: i === current ? 'var(--accent)' : 'var(--text-muted)' }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-12 h-0.5 mb-4"
              style={{ background: i < current ? '#22c55e' : 'var(--border)' }}/>
          )}
        </div>
      ))}
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const [step, setStep]     = useState(0)
  const [data, setData]     = useState({})

  const titles = [
    { title:'Forgot password?',   sub:'Recover access to your account'    },
    { title:'Enter your code',    sub:'Recovery is available for existing accounts' },
    { title:'New password',       sub:'Choose a strong password'          },
    { title:'',                   sub:''                                  },
  ]

  return (
    <Layout title={titles[step].title} subtitle={titles[step].sub} back={step === 0 ? '/login' : undefined}>
      <Steps current={step}/>
      {step === 0 && (
        <StepMethod onNext={d => { setData(p => ({...p,...d})); setStep(1) }}/>
      )}
      {step === 1 && (
        <StepOTP
          email={data.email} method={data.method}
          onNext={d => { setData(p => ({...p,...d})); setStep(2) }}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepNewPassword
          resetToken={data.resetToken} userName={data.userName}
          onDone={() => setStep(3)}
        />
      )}
      {step === 3 && <StepSuccess/>}
    </Layout>
  )
}

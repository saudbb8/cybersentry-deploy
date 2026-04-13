import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { Shield, LayoutDashboard, Search, FileText, Settings, Zap, LogOut } from 'lucide-react'
import { useAuth } from './hooks/useAuth.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import LandingPage from './pages/LandingPage.jsx'
import { LoginPage, RegisterPage, VerifyEmailPage, ResetPasswordPage } from './pages/AuthPages.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ScanPage from './pages/ScanPage.jsx'
import AttackPage from './pages/AttackPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import FirewallPage from './pages/FirewallPage.jsx'

const nav = [
  { to:'/app',          icon:LayoutDashboard, label:'Dashboard', end:true },
  { to:'/app/scan',     icon:Search,          label:'Scan'             },
  { to:'/app/attack',   icon:Zap,             label:'Attack Sim'       },
  { to:'/app/reports',  icon:FileText,        label:'Reports'          },
  { to:'/app/settings', icon:Settings,        label:'Settings'         },
]

function Protected({ children }) {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'var(--bg-primary)' }}>
      <Shield size={24} style={{ color:'var(--accent)' }} className="animate-pulse"/>
    </div>
  )
  return isLoggedIn ? children : <Navigate to="/login" replace/>
}

function AppLayout() {
  const { user, logout } = useAuth()
  return (
    <div className="flex h-screen overflow-hidden" style={{ background:'var(--bg-primary)' }}>
      <aside className="w-56 flex flex-col flex-shrink-0 sidebar">
        <div className="px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Shield size={22} style={{ color:'var(--accent)' }}/>
            <span className="font-bold text-lg" style={{ color:'var(--text-primary)' }}>CyberSentry</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
            style={{ background:'rgba(100,116,139,0.15)', color:'var(--text-muted)' }}>
            {user?.plan?.toUpperCase()||'FREE'}
          </span>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {nav.map(({to,icon:Icon,label,end})=>(
            <NavLink key={to} to={to} end={end}
              className={({isActive})=>`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all nav-item ${isActive?'active':''}`}>
              <Icon size={16}/>{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 space-y-2" style={{ borderTop:'1px solid var(--border)' }}>
          <ThemeToggle/>
          <NavLink to="/app/profile" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm nav-item w-full">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background:'var(--accent)', color:'white' }}>
              {user?.name?.[0]?.toUpperCase()||'U'}
            </div>
            <span className="truncate text-xs" style={{ color:'var(--text-secondary)' }}>{user?.name||'Profile'}</span>
          </NavLink>
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm nav-item w-full">
            <LogOut size={14}/>
            <span className="text-xs" style={{ color:'var(--text-muted)' }}>Sign out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto" style={{ background:'var(--bg-primary)' }}>
        <Routes>
          <Route path="/"         element={<Dashboard/>}/>
          <Route path="/scan"     element={<ScanPage/>}/>
          <Route path="/attack"   element={<AttackPage/>}/>
          <Route path="/reports"  element={<ReportsPage/>}/>
          <Route path="/settings" element={<SettingsPage/>}/>
          <Route path="/firewall" element={<FirewallPage/>}/>
          <Route path="/profile"  element={<ProfilePage/>}/>
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const { isLoggedIn } = useAuth()
  return (
    <Routes>
      <Route path="/"                element={isLoggedIn ? <Navigate to="/app"/> : <LandingPage/>}/>
      <Route path="/login"           element={isLoggedIn ? <Navigate to="/app"/> : <LoginPage/>}/>
      <Route path="/register"        element={isLoggedIn ? <Navigate to="/app"/> : <RegisterPage/>}/>
      <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
      <Route path="/reset-password"  element={<ResetPasswordPage/>}/>
      <Route path="/verify-email"    element={<VerifyEmailPage/>}/>
      <Route path="/app/*"           element={<Protected><AppLayout/></Protected>}/>
      <Route path="*"                element={<Navigate to="/"/>}/>
    </Routes>
  )
}

import { useState, useEffect } from 'react'
import { User, Key, Copy, Trash2, Plus, CheckCircle, Shield, Save, RefreshCw } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth.jsx'

export default function ProfilePage() {
  const { user, API } = useAuth()
  const [apiKeys, setApiKeys]   = useState([])
  const [name, setName]         = useState(user?.name || '')
  const [saved, setSaved]       = useState(false)
  const [copied, setCopied]     = useState(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    axios.get(`${API}/api/users/api-keys`)
      .then(r => setApiKeys(r.data.api_keys || []))
      .catch(() => {})
  }, [])

  const saveProfile = async () => {
    setLoading(true)
    try {
      await axios.put(`${API}/api/users/profile`, { name })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setLoading(false)
  }

  const createKey = async () => {
    try {
      const { data } = await axios.post(`${API}/api/users/api-keys`, { name: 'My API Key' })
      setApiKeys(prev => [...prev, data.api_key])
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create key')
    }
  }

  const deleteKey = async (id) => {
    try {
      await axios.delete(`${API}/api/users/api-keys/${id}`)
      setApiKeys(prev => prev.filter(k => k.id !== id))
    } catch {}
  }

  const copyKey = (key, id) => {
    navigator.clipboard.writeText(key)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Profile</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Manage your account and API keys</p>
      </div>

      {/* Plan banner */}
      <div className="card" style={{
        background: user?.plan === 'pro' ? 'rgba(56,189,248,0.05)' : 'var(--bg-card)',
        borderColor: user?.plan === 'pro' ? 'rgba(56,189,248,0.3)' : 'var(--border)',
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} style={{ color: 'var(--accent)' }}/>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {user?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {user?.plan === 'free'
                  ? `10 scans per day · 1 API key`
                  : 'Unlimited scans · 10 API keys'}
              </p>
            </div>
          </div>
          {user?.plan === 'free' && (
            <button className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--accent)', color: 'white' }}>
              Upgrade to Pro — coming soon
            </button>
          )}
        </div>
      </div>

      {/* Profile */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} style={{ color: 'var(--accent)' }}/>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Account Details</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}/>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Email</label>
            <input value={user?.email || ''} disabled
              className="w-full px-3 py-2.5 rounded-xl text-sm border opacity-60"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}/>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Member since</label>
            <input value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''} disabled
              className="w-full px-3 py-2.5 rounded-xl text-sm border opacity-60"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}/>
          </div>
          <button onClick={saveProfile} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: saved ? 'rgba(34,197,94,0.2)' : 'rgba(56,189,248,0.2)', color: saved ? '#22c55e' : 'var(--accent)', border: `1px solid ${saved ? 'rgba(34,197,94,0.3)' : 'rgba(56,189,248,0.3)'}` }}>
            {loading ? <RefreshCw size={14} className="animate-spin"/> : saved ? <CheckCircle size={14}/> : <Save size={14}/>}
            {saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* API Keys */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key size={16} style={{ color: 'var(--accent)' }}/>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>API Keys</h2>
          </div>
          <button onClick={createKey}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <Plus size={12}/>New key
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Use API keys to send attack events from your app to CyberSentry dashboard.
        </p>

        {apiKeys.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <Key size={24} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">No API keys yet</p>
            <button onClick={createKey} className="text-xs mt-2" style={{ color: 'var(--accent)' }}>
              Create your first key
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map(key => (
              <div key={key.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{key.name}</p>
                  <p className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                    {key.key.slice(0, 20)}...
                  </p>
                </div>
                <button onClick={() => copyKey(key.key, key.id)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: copied === key.id ? '#22c55e' : 'var(--text-muted)' }}>
                  {copied === key.id ? <CheckCircle size={14}/> : <Copy size={14}/>}
                </button>
                <button onClick={() => deleteKey(key.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-300 transition-all">
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
          <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Usage example:</p>
          <code>X-CyberSentry-Key: your_api_key_here</code>
        </div>
      </div>
    </div>
  )
}

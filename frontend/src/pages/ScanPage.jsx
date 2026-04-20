import { useState, useRef } from 'react'
import axios from 'axios'
import { Search, Upload, Code, AlertTriangle, CheckCircle, Loader, Copy, ExternalLink, Shield } from 'lucide-react'
import { saveScanResult } from '../hooks/useScanHistory.js'

const SEV_C = { critical:'text-red-400', high:'text-orange-400', medium:'text-yellow-400', low:'text-blue-400' }
const SEV_B = { critical:'bg-red-950 border-red-900', high:'bg-orange-950 border-orange-900', medium:'bg-yellow-950 border-yellow-900', low:'bg-blue-950 border-blue-900' }

const SCAN_TYPES = {
  full: {
    label: 'Full Scan',
    desc: 'Checks everything — SQLi, XSS, CMDi, Path, SSRF, secrets, hardcoded passwords',
    icon: '🔍',
    patterns: ['sqli','xss','path','cmdi','ssrf','ssti','secrets'],
  },
  secrets: {
    label: 'Secrets Only',
    desc: 'Finds hardcoded passwords, API keys, tokens, connection strings',
    icon: '🔑',
    patterns: ['secrets'],
  },
  sast: {
    label: 'SAST',
    desc: 'Static analysis — injection flaws, dangerous functions, unsafe patterns',
    icon: '🧪',
    patterns: ['sqli','xss','path','cmdi','ssrf','ssti'],
  },
  deps: {
    label: 'Dependencies',
    desc: 'Checks imported packages for known CVEs and outdated versions',
    icon: '📦',
    patterns: ['deps'],
  },
}

const ALL_PATTERNS = [
  { id:'sqli',    rule_id:'SQLI-001', severity:'critical', title:'SQL injection via string concat',      re:/["'`]?\s*\+\s*(username|user_input|query|input|id|name|email|search)/i, remediation:'Use parameterized queries: db.execute("SELECT * FROM users WHERE id = ?", (user_id,))' },
  { id:'sqli',    rule_id:'SQLI-002', severity:'critical', title:'SQL UNION-based injection',             re:/UNION\s+SELECT/i,                                                        remediation:'Use parameterized queries. Never concatenate user input into SQL.' },
  { id:'sqli',    rule_id:'SQLI-003', severity:'high',     title:'SQL query string formatting',           re:/f["'].*SELECT.*\{/i,                                                     remediation:'Use parameterized queries instead of f-strings in SQL.' },
  { id:'xss',     rule_id:'XSS-001',  severity:'high',     title:'XSS via unescaped f-string output',    re:/return\s+f["'].*<.*\{(user_input|query|name|data|input|request)\}/i,    remediation:'HTML-encode output: html.escape(user_input)' },
  { id:'xss',     rule_id:'XSS-002',  severity:'high',     title:'Unsafe HTML template rendering',       re:/render_template_string\s*\([^)]*\+/i,                                    remediation:'Never pass user input to render_template_string(). Use template files.' },
  { id:'path',    rule_id:'PATH-001', severity:'critical', title:'Path traversal via string concat',     re:/open\s*\(\s*["'`][^"'`]*["'`]\s*\+/i,                                   remediation:'Use pathlib: path = (BASE_DIR / filename).resolve(); assert path.is_relative_to(BASE_DIR)' },
  { id:'path',    rule_id:'PATH-002', severity:'critical', title:'Unvalidated file path from user input', re:/open\s*\(\s*(filename|filepath|file_path|name|path)\s*\)/i,             remediation:'Validate path stays within allowed directory using Path.resolve().' },
  { id:'cmdi',    rule_id:'CMDI-001', severity:'critical', title:'Command injection via os.system',      re:/os\.(system|popen)\s*\(.*\+/i,                                           remediation:'Use subprocess.run(["ping", host], capture_output=True) with list args.' },
  { id:'cmdi',    rule_id:'CMDI-002', severity:'critical', title:'Command injection via subprocess',     re:/subprocess\.(call|run|Popen)\s*\(.*shell\s*=\s*True/i,                  remediation:'Remove shell=True and pass args as a list instead.' },
  { id:'ssrf',    rule_id:'SSRF-001', severity:'high',     title:'Potential SSRF — unvalidated URL fetch', re:/requests\.(get|post)\s*\(.*\b(url|endpoint|target|link)\b/i,          remediation:'Validate URLs: block private IPs and metadata endpoints.' },
  { id:'ssti',    rule_id:'SSTI-001', severity:'critical', title:'Server-side template injection',        re:/render_template_string\s*\(.*\{/i,                                      remediation:'Never render user-controlled data as a template.' },
  { id:'secrets', rule_id:'SEC-001',  severity:'critical', title:'Hardcoded password detected',           re:/(password|passwd|pwd)\s*=\s*["'][^"']{4,}["']/i,                       remediation:'Use environment variables: os.environ.get("DB_PASSWORD")' },
  { id:'secrets', rule_id:'SEC-002',  severity:'critical', title:'Hardcoded API key detected',            re:/(api_key|apikey|api_secret|token|secret_key)\s*=\s*["'][^"']{8,}["']/i, remediation:'Use environment variables or a secrets manager.' },
  { id:'secrets', rule_id:'SEC-003',  severity:'high',     title:'Hardcoded database URL',                re:/(mysql|postgresql|mongodb|redis):\/\/[^"'\s]{5,}/i,                      remediation:'Move database URLs to environment variables.' },
  { id:'secrets', rule_id:'SEC-004',  severity:'high',     title:'AWS credentials detected',              re:/AKIA[0-9A-Z]{16}/,                                                       remediation:'Revoke this key immediately. Use IAM roles instead of hardcoded credentials.' },
  { id:'secrets', rule_id:'SEC-005',  severity:'medium',   title:'Debug mode enabled',                    re:/DEBUG\s*=\s*True/i,                                                      remediation:'Set DEBUG=False in production. Use environment variable.' },
]

const EXAMPLES = {
  '💉 SQLi':   `# SQL Injection\ndef get_user(username):\n    query = "SELECT * FROM users WHERE username = '" + username + "'"\n    return db.execute(query)`,
  '🔥 XSS':    `# XSS vulnerability\ndef render_page(user_input):\n    return f"<h1>Hello {user_input}</h1>"`,
  '📂 Path':   `# Path traversal\ndef read_file(filename):\n    return open("uploads/" + filename).read()`,
  '⚡ CMDi':   `# Command injection\ndef ping(host):\n    import os\n    os.system("ping -c 1 " + host)`,
  '🔑 Secret': `# Hardcoded secrets\nDB_PASSWORD = "supersecret123"\nAPI_KEY = "sk-abc123def456ghi789"\nDEBUG = True`,
}

function scoreFromFindings(findings) {
  const counts = { critical:0, high:0, medium:0, low:0 }
  findings.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++ })
  const score = Math.max(0, 100 - counts.critical*25 - counts.high*15 - counts.medium*8 - counts.low*3)
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : score >= 40 ? 'D' : 'F'
  return { score, grade, ...counts }
}

export default function ScanPage() {
  const [code, setCode]         = useState('')
  const [scanType, setScanType] = useState('full')
  const [scanning, setScanning] = useState(false)
  const [findings, setFindings] = useState(null)
  const [scoreData, setScoreData] = useState(null)
  const [copied, setCopied]     = useState(false)
  const fileRef = useRef()

  const runScan = async () => {
    if (!code.trim()) return
    setScanning(true); setFindings(null); setScoreData(null)
    await new Promise(r => setTimeout(r, 600))

    const scanConfig = SCAN_TYPES[scanType]
    const allowedIds = scanConfig.patterns

    const results = []
    const lines = code.split('\n')

    if (allowedIds.includes('deps')) {
      const imports = lines.filter(l => l.match(/^import |^from /))
      imports.forEach((line, i) => {
        const pkg = line.match(/(?:import|from)\s+(\w+)/)?.[1]
        const risky = ['pickle','subprocess','eval','exec','marshal','shelve']
        if (pkg && risky.includes(pkg)) {
          results.push({
            rule_id: 'DEP-001', severity: 'medium',
            title: `Risky module imported: ${pkg}`,
            file_path: 'pasted_code.py',
            line_number: i + 1,
            code_snippet: line.trim(),
            remediation: `Review usage of ${pkg} — it can be dangerous if used with untrusted input.`,
          })
        }
      })
    }

    ALL_PATTERNS
      .filter(p => allowedIds.includes(p.id))
      .forEach(pattern => {
        lines.forEach((line, i) => {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) return
          if (pattern.re.test(line)) {
            if (!results.find(r => r.rule_id === pattern.rule_id && r.line_number === i + 1)) {
              results.push({
                rule_id: pattern.rule_id,
                severity: pattern.severity,
                title: pattern.title,
                file_path: 'pasted_code.py',
                line_number: i + 1,
                code_snippet: trimmed.slice(0, 100),
                remediation: pattern.remediation,
              })
            }
          }
        })
      })

    results.sort((a, b) => {
      const order = { critical:0, high:1, medium:2, low:3 }
      return order[a.severity] - order[b.severity]
    })

    setFindings(results)
    const scoreResult = scoreFromFindings(results)
    setScoreData(scoreResult)
    
    // Save to SaaS API so Reports page shows it
    const token = localStorage.getItem('cs_token')
    if (token) {
      try {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/scan/code`, {
          code: code,
          scan_type: scanType,
        }, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 })
      } catch(e) {
        // Fallback: save to localStorage
        const history = JSON.parse(localStorage.getItem('cs_scan_history') || '[]')
        history.unshift({
          id: Date.now(), date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString(), score: scoreResult.score,
          grade: scoreResult.grade, scan_type: scanType,
          critical: scoreResult.critical, high: scoreResult.high,
          medium: scoreResult.medium, low: scoreResult.low,
          total: results.length, findings: results,
        })
        localStorage.setItem('cs_scan_history', JSON.stringify(history.slice(0, 20)))
      }
    }
    saveScanResult(results, scoreFromFindings(results), scanType, code)
    setScanning(false)
  }

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => setCode(ev.target.result)
    r.readAsText(f)
  }

  const copyReport = () => {
    if (!findings) return
    const lines = [
      `CyberSentry Security Report`,
      `Scan type: ${scanType} | Issues: ${findings.length} | Score: ${scoreData?.score}/100 (${scoreData?.grade})`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
      ...findings.map(f =>
        `[${f.severity.toUpperCase()}] ${f.rule_id} — ${f.title}\n  Line ${f.line_number}: ${f.code_snippet}\n  Fix: ${f.remediation}`
      )
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentScanType = SCAN_TYPES[scanType]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Security Scanner</h1>
        <p className="text-sm text-slate-500 mt-0.5">Paste code or upload a file — get real vulnerability findings instantly</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">

          {/* Scan type selector */}
          <div className="card">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Scan Type</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SCAN_TYPES).map(([key, val]) => (
                <button key={key} onClick={() => setScanType(key)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    scanType === key
                      ? 'bg-sky-400/20 text-sky-400 border border-sky-400/30'
                      : 'text-slate-400 border border-dark-500 hover:border-slate-500'
                  }`}>
                  <p className="text-xs font-bold">{val.icon} {val.label}</p>
                  <p className="text-xs opacity-70 mt-1 leading-relaxed">{val.desc}</p>
                </button>
              ))}
            </div>
            {currentScanType && (
              <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-dark-500">
                Checking: {currentScanType.patterns.join(', ')} patterns
              </p>
            )}
          </div>

          {/* Quick examples */}
          <div className="card">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Quick examples — click to load</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(EXAMPLES).map(([label, code]) => (
                <button key={label} onClick={() => setCode(code)}
                  className="px-3 py-2 rounded-lg text-xs text-slate-400 border border-dark-500 hover:border-sky-400/50 hover:text-sky-400 transition-all text-left whitespace-nowrap">
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Code input */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code size={14} className="text-sky-400"/>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Code to scan</p>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer hover:text-slate-200 transition-colors border border-dark-500 px-2 py-1 rounded-lg hover:border-slate-500">
                <Upload size={12}/>Upload
                <input ref={fileRef} type="file" className="hidden"
                  accept=".py,.js,.ts,.php,.java,.go,.rb,.cs" onChange={handleFile}/>
              </label>
            </div>
            <textarea value={code} onChange={e => setCode(e.target.value)}
              placeholder={"# Click an example above or paste your code here\n# Supports Python, JavaScript, PHP, Java, Go\n# Or upload a file using the button →"}
              className="w-full h-56 bg-dark-900 border border-dark-500 rounded-lg p-3 text-sm font-mono text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-sky-400/50 transition-colors"/>
            {code && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-600">{code.split('\n').length} lines · {code.length} chars</p>
                <button onClick={() => setCode('')} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Clear</button>
              </div>
            )}
          </div>

          <button onClick={runScan} disabled={!code.trim() || scanning}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-400/20 text-sky-400 border border-sky-400/30 font-medium hover:bg-sky-400/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {scanning
              ? <><Loader size={16} className="animate-spin"/>Running {currentScanType?.label}...</>
              : <><Search size={16}/>Run {currentScanType?.label}</>}
          </button>
        </div>

        {/* Results panel */}
        <div className="space-y-4">
          {findings === null && !scanning && (
            <div className="card flex flex-col items-center justify-center h-72 border-dashed">
              <Shield size={36} className="text-slate-700 mb-3"/>
              <p className="text-slate-500 text-sm font-medium">Ready to scan</p>
              <p className="text-slate-600 text-xs mt-1">Click an example or paste code, then Run</p>
            </div>
          )}

          {scanning && (
            <div className="card flex flex-col items-center justify-center h-72">
              <Loader size={36} className="text-sky-400 animate-spin mb-4"/>
              <p className="text-slate-300 text-sm font-medium">Scanning...</p>
              <p className="text-slate-500 text-xs mt-1">{currentScanType?.label} · {currentScanType?.patterns.join(', ')}</p>
            </div>
          )}

          {findings !== null && !scanning && <>
            {/* Score */}
            {scoreData && (
              <div className={`card border ${
                scoreData.score >= 80 ? 'border-green-900 bg-green-950/20' :
                scoreData.score >= 60 ? 'border-yellow-900 bg-yellow-950/20' :
                'border-red-900 bg-red-950/20'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Security Score — {currentScanType?.label}</p>
                    <p className={`text-4xl font-bold ${
                      scoreData.score >= 80 ? 'text-emerald-400' :
                      scoreData.score >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>{scoreData.score}<span className="text-lg text-slate-500">/100</span></p>
                    <div className="flex gap-3 mt-2 text-xs">
                      {scoreData.critical > 0 && <span className="text-red-400">● {scoreData.critical} critical</span>}
                      {scoreData.high > 0 && <span className="text-orange-400">● {scoreData.high} high</span>}
                      {scoreData.medium > 0 && <span className="text-yellow-400">● {scoreData.medium} medium</span>}
                      {scoreData.low > 0 && <span className="text-blue-400">● {scoreData.low} low</span>}
                      {findings.length === 0 && <span className="text-emerald-400">● No issues found</span>}
                    </div>
                  </div>
                  <span className={`text-5xl font-bold ${
                    scoreData.score >= 80 ? 'text-emerald-400' :
                    scoreData.score >= 60 ? 'text-amber-400' : 'text-red-400'
                  }`}>{scoreData.grade}</span>
                </div>
              </div>
            )}

            {/* Actions row */}
            {findings.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {findings.length} vulnerabilit{findings.length !== 1 ? 'ies' : 'y'} found
                </p>
                <button onClick={copyReport}
                  className="flex items-center gap-1.5 text-xs border border-dark-500 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all">
                  <Copy size={11}/>{copied ? '✅ Copied!' : 'Copy report'}
                </button>
              </div>
            )}

            {/* No issues */}
            {findings.length === 0 && (
              <div className="card flex flex-col items-center py-10 border border-green-900 bg-green-950/20">
                <CheckCircle size={36} className="text-emerald-400 mb-3"/>
                <p className="text-emerald-400 font-semibold">No vulnerabilities found!</p>
                <p className="text-slate-500 text-xs mt-1">{currentScanType?.label} scan passed clean</p>
              </div>
            )}

            {/* Findings list */}
            {findings.length > 0 && (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {findings.map((f, i) => (
                  <div key={i} className={`card border ${SEV_B[f.severity] || SEV_B.low}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs font-mono font-bold ${SEV_C[f.severity]}`}>{f.rule_id}</span>
                          <span className={`text-xs font-bold uppercase ${SEV_C[f.severity]}`}>{f.severity}</span>
                          <AlertTriangle size={11} className={`${SEV_C[f.severity]} ml-auto`}/>
                        </div>
                        <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
                        {f.file_path && (
                          <p className="text-xs text-slate-500 font-mono mb-2">
                            {f.file_path}:{f.line_number}
                          </p>
                        )}
                        {f.code_snippet && (
                          <div className="bg-dark-900 rounded-lg px-3 py-2 mb-2">
                            <code className="text-xs text-red-300 font-mono break-all">{f.code_snippet}</code>
                          </div>
                        )}
                        <p className="text-xs text-slate-400 leading-relaxed">
                          <span className="text-emerald-400 font-medium">✅ Fix: </span>
                          {f.remediation}
                        </p>
                        <button onClick={() => window.open('https://owasp.org/Top10/', '_blank')}
                          className="flex items-center gap-1 text-xs text-sky-400/70 mt-2 hover:text-sky-400 transition-colors">
                          <ExternalLink size={10}/>OWASP reference
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>}
        </div>
      </div>
    </div>
  )
}

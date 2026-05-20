// Stores scan history in localStorage so Reports page shows real results

export function saveScanResult(findings, score, scanType, code) {
  try {
    const history = getScanHistory()
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      score: score?.score || 0,
      grade: score?.grade || 'F',
      scanType,
      critical: findings.filter(f => f.severity === 'critical').length,
      high:     findings.filter(f => f.severity === 'high').length,
      medium:   findings.filter(f => f.severity === 'medium').length,
      low:      findings.filter(f => f.severity === 'low').length,
      secrets:  findings.filter(f => f.rule_id?.startsWith('SEC')).length,
      cves: 0,
      findings,
      codeSnippet: code?.slice(0, 200) || '',
    }
    history.unshift(newEntry)
    // Keep last 20 scans only
    localStorage.setItem('cs_scan_history', JSON.stringify(history.slice(0, 20)))
    return newEntry
  } catch(e) {
    console.error('Failed to save scan:', e)
  }
}

export function getScanHistory() {
  try {
    return JSON.parse(localStorage.getItem('cs_scan_history') || '[]')
  } catch {
    return []
  }
}

export function clearScanHistory() {
  localStorage.removeItem('cs_scan_history')
}

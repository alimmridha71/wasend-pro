import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function SetupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setMsg('')
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Setup failed'); return }
      setMsg('✅ Admin created! Redirecting to login...')
      setTimeout(() => router.push('/'), 2000)
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  return (
    <>
      <Head><title>Wasend-Pro — Setup Admin</title></Head>
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>
            <span style={{ fontSize: 40 }}>🔐</span>
            <div>
              <div style={styles.logoTitle}>First-Time Setup</div>
              <div style={styles.logoSub}>Create your admin account</div>
            </div>
          </div>
          <form onSubmit={handleSetup} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Admin Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@yourdomain.com" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password (min 8 chars)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={8} />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            {msg && <div style={styles.success}>{msg}</div>}
            <button type="submit" style={loading ? styles.btnLoading : styles.btn} disabled={loading}>
              {loading ? 'Creating...' : 'Create Admin Account'}
            </button>
          </form>
          <div style={{ marginTop: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
            Already have an account? <a href="/">Login</a>
          </div>
        </div>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' },
  card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow)' },
  logo: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 },
  logoTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)' },
  logoSub: { fontSize: 12, color: 'var(--text3)' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: 'var(--text2)', fontWeight: 600 },
  error: { background: 'rgba(255,77,79,0.12)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: 13 },
  success: { background: 'rgba(37,211,102,0.12)', border: '1px solid var(--green)', borderRadius: 8, padding: '10px 14px', color: 'var(--green)', fontSize: 13 },
  btn: { background: 'linear-gradient(135deg, #25d366, #128c7e)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 0', fontWeight: 700, fontSize: 14 },
  btnLoading: { background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 0', fontWeight: 700, fontSize: 14 },
}

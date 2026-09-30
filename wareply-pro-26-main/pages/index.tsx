import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('admin_email', data.email)
      router.push('/admin')
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  return (
    <>
      <Head><title>Wasend-Pro — Admin Login</title></Head>
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>💬</span>
            <div>
              <div style={styles.logoTitle}>Wasend-Pro</div>
              <div style={styles.logoSub}>Admin Panel</div>
            </div>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com" required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={loading ? styles.btnLoading : styles.btn} disabled={loading}>
              {loading ? 'Logging in...' : 'Login →'}
            </button>
          </form>

          <div style={styles.setupHint}>
            First time? <a href="/setup" style={{ color: 'var(--green)' }}>Create admin account</a>
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
  logoIcon: { fontSize: 40 },
  logoTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)' },
  logoSub: { fontSize: 12, color: 'var(--text3)' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: 'var(--text2)', fontWeight: 600, letterSpacing: 0.5 },
  error: { background: 'rgba(255,77,79,0.12)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: 13 },
  btn: { background: 'linear-gradient(135deg, #25d366, #128c7e)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 0', fontWeight: 700, fontSize: 14, marginTop: 4 },
  btnLoading: { background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 0', fontWeight: 700, fontSize: 14, marginTop: 4 },
  setupHint: { marginTop: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 12 },
}

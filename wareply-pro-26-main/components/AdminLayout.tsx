import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

const NAV = [
  { href: '/admin', label: '📊 Dashboard' },
  { href: '/admin/payments', label: '💳 Payments' },
  { href: '/admin/licenses', label: '🔑 Licenses' },
  { href: '/admin/settings', label: '⚙️ Settings' },
]

export default function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    setEmail(localStorage.getItem('admin_email') || '')
  }, [router])

  function logout() {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_email')
    router.push('/')
  }

  return (
    <>
      <Head><title>{title ? `${title} — WaReply Admin` : 'WaReply Pro Admin'}</title></Head>
      <div style={s.root}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <div style={s.sideHeader}>
            <span style={{ fontSize: 28 }}>💬</span>
            <div>
              <div style={s.sideTitle}>WaReply Pro</div>
              <div style={s.sideSub}>Admin Panel</div>
            </div>
          </div>
          <nav style={s.nav}>
            {NAV.map(n => (
              <a key={n.href} href={n.href}
                style={{ ...s.navLink, ...(router.pathname === n.href ? s.navActive : {}) }}>
                {n.label}
              </a>
            ))}
          </nav>
          <div style={s.sideFooter}>
            <div style={s.adminBadge}>{email}</div>
            <button onClick={logout} style={s.logoutBtn}>🚪 Logout</button>
          </div>
        </aside>

        {/* Main content */}
        <main style={s.main}>
          {children}
        </main>
      </div>
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  root: { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },
  sidebar: { width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 },
  sideHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' },
  sideTitle: { fontWeight: 700, fontSize: 15, color: 'var(--text)' },
  sideSub: { fontSize: 11, color: 'var(--text3)' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 10px', gap: 4 },
  navLink: { display: 'block', padding: '10px 14px', borderRadius: 8, color: 'var(--text2)', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' },
  navActive: { background: 'rgba(37,211,102,0.12)', color: 'var(--green)', fontWeight: 600 },
  sideFooter: { padding: '16px 16px 20px', borderTop: '1px solid var(--border)' },
  adminBadge: { fontSize: 11, color: 'var(--text3)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logoutBtn: { background: 'rgba(255,77,79,0.1)', border: '1px solid rgba(255,77,79,0.2)', color: 'var(--red)', borderRadius: 7, padding: '7px 12px', fontSize: 12, fontWeight: 600, width: '100%' },
  main: { flex: 1, padding: 32, overflowY: 'auto' },
}

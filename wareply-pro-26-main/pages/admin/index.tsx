import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'

type Stats = { total_licenses: number; active_licenses: number; pending_payments: number; approved_payments: number }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ total_licenses: 0, active_licenses: 0, pending_payments: 0, approved_payments: 0 })
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function apiGet(url: string) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) throw new Error('Auth failed')
    return res.json()
  }

  async function loadStats() {
    try {
      const [licenses, payments] = await Promise.all([
        apiGet('/api/licenses'),
        apiGet('/api/payments'),
      ])
      setStats({
        total_licenses: licenses.length,
        active_licenses: licenses.filter((l: any) => l.status === 'active').length,
        pending_payments: payments.filter((p: any) => p.status === 'pending').length,
        approved_payments: payments.filter((p: any) => p.status === 'approved').length,
      })
      setRecentPayments(payments.slice(0, 8))
    } catch { window.location.href = '/' }
    finally { setLoading(false) }
  }

  const statCards = [
    { label: 'Total Licenses', value: stats.total_licenses, color: '#4c6ef5', icon: '🔑' },
    { label: 'Active Licenses', value: stats.active_licenses, color: '#25d366', icon: '✅' },
    { label: 'Pending Payments', value: stats.pending_payments, color: '#faad14', icon: '⏳' },
    { label: 'Approved Payments', value: stats.approved_payments, color: '#9c5cf7', icon: '💳' },
  ]

  const statusColor: Record<string, string> = { pending: '#faad14', approved: '#25d366', rejected: '#ff4d4f' }
  const planColor: Record<string, string> = { monthly: '#4c6ef5', yearly: '#9c5cf7', lifetime: '#25d366' }

  return (
    <AdminLayout title="Dashboard">
      <div style={s.pageHeader}>
        <h1 style={s.h1}>Dashboard</h1>
        <span style={s.subtitle}>Welcome back, Admin</span>
      </div>

      {loading ? (
        <div style={s.loading}>Loading...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={s.statsGrid}>
            {statCards.map(card => (
              <div key={card.label} style={s.statCard}>
                <div style={{ ...s.statIcon, background: card.color + '22', color: card.color }}>{card.icon}</div>
                <div>
                  <div style={{ ...s.statValue, color: card.color }}>{card.value}</div>
                  <div style={s.statLabel}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Payments */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <h2 style={s.h2}>Recent Payment Submissions</h2>
              <a href="/admin/payments" style={s.viewAll}>View all →</a>
            </div>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Customer', 'Phone', 'Plan', 'Method', 'TXN ID', 'Status', 'Date'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.length === 0 ? (
                    <tr><td colSpan={7} style={s.empty}>No payments yet</td></tr>
                  ) : recentPayments.map(p => (
                    <tr key={p.id} style={s.tr}>
                      <td style={s.td}><div style={s.tdMain}>{p.customer_name}</div><div style={s.tdSub}>{p.business_name}</div></td>
                      <td style={s.td}>{p.phone}</td>
                      <td style={s.td}><span style={{ ...s.badge, background: (planColor[p.plan] || '#666') + '22', color: planColor[p.plan] || '#aaa' }}>{p.plan}</span></td>
                      <td style={s.td}>{p.method}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>{p.txn_id}</td>
                      <td style={s.td}><span style={{ ...s.badge, background: (statusColor[p.status] || '#666') + '22', color: statusColor[p.status] || '#aaa' }}>{p.status}</span></td>
                      <td style={{ ...s.td, color: 'var(--text3)', fontSize: 12 }}>{new Date(p.submitted_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}

const s: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: 28 },
  h1: { fontSize: 24, fontWeight: 700, color: 'var(--text)' },
  h2: { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  subtitle: { color: 'var(--text3)', fontSize: 13 },
  loading: { textAlign: 'center', color: 'var(--text3)', padding: 60 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 },
  statCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 },
  statIcon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  statValue: { fontSize: 28, fontWeight: 800, lineHeight: 1 },
  statLabel: { color: 'var(--text3)', fontSize: 12, marginTop: 4 },
  section: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' },
  viewAll: { color: 'var(--green)', fontSize: 13, textDecoration: 'none' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '13px 16px', color: 'var(--text)', fontSize: 13, verticalAlign: 'middle' },
  tdMain: { fontWeight: 500 },
  tdSub: { fontSize: 11, color: 'var(--text3)', marginTop: 2 },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  empty: { textAlign: 'center', padding: 40, color: 'var(--text3)' },
}

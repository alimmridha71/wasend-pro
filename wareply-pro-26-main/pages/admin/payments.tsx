import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'

function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `WRP-${seg()}-${seg()}-${seg()}`
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [licenseKey, setLicenseKey] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsMsg, setSmsMsg] = useState('')
  const [isApproved, setIsApproved] = useState(false)

  useEffect(() => { load() }, [])
  useEffect(() => { applyFilter() }, [payments, filter, search])

  async function apiCall(url: string, method = 'GET', body?: any) {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(url, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) { window.location.href = '/'; return null }
    return res.json()
  }

  async function load() {
    setLoading(true)
    const data = await apiCall('/api/payments')
    if (data) { setPayments(data); setFiltered(data) }
    setLoading(false)
  }

  function applyFilter() {
    let result = [...payments]
    if (filter !== 'all') result = result.filter(p => p.status === filter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.customer_name?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.txn_id?.toLowerCase().includes(q) ||
        p.business_name?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }

  function openModal(payment: any) {
    setSelected(payment)
    setLicenseKey(payment.license_key || generateKey())
    setAdminNote(payment.admin_note || '')
    setMsg('')
    setSmsMsg('')
    setIsApproved(payment.status === 'approved')
  }

  async function approveWithAutoLicense() {
    if (!selected) return
    let key = licenseKey.trim()
    if (!key) key = generateKey()

    setSaving(true)
    setMsg('⏳ Creating license & approving...')

    // Step 1: Create license key in DB via /api/licenses
    const planDays: Record<string, number> = { monthly: 30, yearly: 365, lifetime: 99999 }
    const days = planDays[selected.plan] || 30

    try {
      await apiCall('/api/licenses', 'POST', {
        plan: selected.plan,
        duration_days: days,
        note: `Auto for payment ${selected.id}. Customer: ${selected.customer_name}`,
        count: 1,
        key_override: key,
      })
    } catch (e) {
      // If key already exists or error, continue with the key anyway
    }

    // Step 2: Update payment as approved with license key
    const data = await apiCall('/api/payments', 'PUT', {
      id: selected.id,
      status: 'approved',
      license_key: key,
      admin_note: adminNote,
    })

    if (data?.success) {
      setMsg(`✅ Approved! License key: ${key}`)
      setLicenseKey(key)
      setIsApproved(true)
      setSelected((prev: any) => ({ ...prev, status: 'approved', license_key: key }))
      await load()
    } else {
      setMsg('❌ Failed to approve')
    }
    setSaving(false)
  }

  async function updateStatus(status: string) {
    if (!selected) return
    setSaving(true)
    const data = await apiCall('/api/payments', 'PUT', {
      id: selected.id, status, license_key: licenseKey, admin_note: adminNote,
    })
    if (data?.success) {
      setMsg(`✅ Marked as ${status}`)
      setIsApproved(status === 'approved')
      await load()
      setSelected((prev: any) => ({ ...prev, status, license_key: licenseKey }))
    } else {
      setMsg('❌ Failed to update')
    }
    setSaving(false)
  }

  async function sendWhatsAppSMS() {
    const key = licenseKey.trim() || selected?.license_key
    if (!key) { setSmsMsg('❌ No license key set'); return }
    if (!selected?.phone) { setSmsMsg('❌ No phone number'); return }

    setSmsSending(true)
    setSmsMsg('⏳ Fetching license details...')

    // Fetch from licenses to get expiry date
    const licenses = await apiCall('/api/licenses')
    const lic = licenses?.find((l: any) => l.key === key)

    let expiryStr = '—'
    if (lic?.expiry_date) {
      expiryStr = new Date(lic.expiry_date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    } else if (selected.plan === 'lifetime') {
      expiryStr = 'Never (Lifetime)'
    }

    const planLabel: Record<string, string> = {
      monthly: 'Monthly Plan (30 days)',
      yearly: 'Yearly Plan (365 days)',
      lifetime: 'Lifetime Plan (Forever)'
    }

    const waMessage =
      ` *WaReply Pro — Payment Approved!*\n\n` +
      ` Hello *${selected.customer_name}*! Your payment has been verified.\n\n` +
      ` *Plan:* ${planLabel[selected.plan] || selected.plan}\n` +
      ` *Expiry Date:* ${expiryStr}\n` +
      ` *License Key:*\n\n` +
      `\`${key}\`\n\n` +
      `*How to activate:*\n` +
      `1. Open WaReply Pro extension\n` +
      `2. Go to Account tab\n` +
      `3. Enter your license key\n` +
      `4. Click Activate \n\n` +
      `Thank you for choosing WaReply Pro!`

    const rawPhone = selected.phone.replace(/\D/g, '')
    const phone = rawPhone.startsWith('880') ? rawPhone : '880' + rawPhone.replace(/^0/, '')
    
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`
    
    window.open(waUrl, '_blank')
    setSmsMsg('✅ WhatsApp opened! Click Send in WhatsApp to deliver.')
    setSmsSending(false)
  }

  const statusColor: Record<string, string> = { pending: '#faad14', approved: '#25d366', rejected: '#ff4d4f' }
  const planColor: Record<string, string> = { monthly: '#4c6ef5', yearly: '#9c5cf7', lifetime: '#25d366' }
  const methodIcon: Record<string, string> = { bkash: '🩷', nagad: '🟠', rocket: '🚀', bank: '🏦' }

  return (
    <AdminLayout title="Payments">
      <div style={s.header}>
        <h1 style={s.h1}>Payment Submissions</h1>
        <button onClick={load} style={s.refreshBtn}>🔄 Refresh</button>
      </div>

      <div style={s.filterBar}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, phone, TXN ID..." style={s.searchInput} />
        <div style={s.tabs}>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...s.tab, ...(filter === f ? s.tabActive : {}) }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && <span style={{ ...s.tabBadge, background: (statusColor[f] || '#666') + '33', color: statusColor[f] || '#aaa' }}>
                {payments.filter(p => p.status === f).length}
              </span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div style={s.loading}>Loading...</div> : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>{['Customer', 'Phone', 'Plan', 'Method', 'TXN ID', 'Amount', 'Status', 'Date', 'Action'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={s.empty}>No submissions found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.tdMain}>{p.customer_name}</div>
                    <div style={s.tdSub}>{p.business_name}</div>
                  </td>
                  <td style={s.td}>{p.phone}</td>
                  <td style={s.td}><span style={{ ...s.badge, background: (planColor[p.plan] || '#666') + '22', color: planColor[p.plan] || '#ccc' }}>{p.plan}</span></td>
                  <td style={s.td}>{methodIcon[p.method] || '💳'} {p.method}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>{p.txn_id}</td>
                  <td style={s.td}>{p.amount ? `৳${p.amount}` : '—'}</td>
                  <td style={s.td}><span style={{ ...s.badge, background: (statusColor[p.status] || '#666') + '22', color: statusColor[p.status] || '#ccc' }}>{p.status}</span></td>
                  <td style={{ ...s.td, fontSize: 12, color: 'var(--text3)' }}>{new Date(p.submitted_at).toLocaleDateString('en-GB')}</td>
                  <td style={s.td}><button onClick={() => openModal(p)} style={s.actionBtn}>Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Review Payment</h2>
              <button onClick={() => setSelected(null)} style={s.closeBtn}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.infoGrid}>
                {[
                  ['Customer', selected.customer_name],
                  ['Business', selected.business_name],
                  ['Phone', selected.phone],
                  ['Plan', selected.plan],
                  ['Method', selected.method],
                  ['TXN ID', selected.txn_id],
                  ['Amount', selected.amount ? `৳${selected.amount}` : '—'],
                  ['Status', selected.status],
                  ['Submitted', new Date(selected.submitted_at).toLocaleString()],
                ].map(([label, val]) => (
                  <div key={label} style={s.infoRow}>
                    <span style={s.infoLabel}>{label}</span>
                    <span style={s.infoVal}>{val}</span>
                  </div>
                ))}
              </div>

              {/* License Key — Auto-generated */}
              <div style={s.field}>
                <label style={s.label}>
                  License Key
                  <span style={{ color: '#25d366', marginLeft: 8, fontSize: 10, fontWeight: 400 }}>✨ Auto-generated — edit if needed</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={licenseKey} onChange={e => setLicenseKey(e.target.value)}
                    placeholder="WRP-XXXX-XXXX-XXXX"
                    style={{ ...s.input, flex: 1, fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.05em' }} />
                  <button onClick={() => setLicenseKey(generateKey())}
                    title="Generate new key"
                    style={{ padding: '8px 12px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', color: '#25d366', borderRadius: 8, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    🔄 New
                  </button>
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Admin Note</label>
                <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                  rows={2} placeholder="Optional note..." style={{ ...s.input, resize: 'vertical' } as any} />
              </div>

              {msg && <div style={{ ...s.msg, color: msg.startsWith('✅') ? 'var(--green)' : msg.startsWith('⏳') ? '#faad14' : 'var(--red)' }}>{msg}</div>}

              {/* ✅ Approve with Auto License — primary action */}
              <button onClick={approveWithAutoLicense} disabled={saving}
                style={{ ...s.wideBtn, background: 'rgba(37,211,102,0.15)', color: 'var(--green)', border: '1px solid var(--green)' }}>
                ✅ Approve + Create License
              </button>

              {/* 📱 WhatsApp SMS — shown after approval */}
              {(isApproved || selected.status === 'approved') && (
                <div>
                  <button onClick={sendWhatsAppSMS} disabled={smsSending}
                    style={{ ...s.wideBtn, background: 'rgba(37,211,102,0.06)', color: '#25d366', border: '1px solid rgba(37,211,102,0.35)' }}>
                    📱 Send WhatsApp SMS (Plan + Expiry + License Key)
                  </button>
                  {smsMsg && <div style={{ ...s.msg, marginTop: 8, color: smsMsg.startsWith('✅') ? 'var(--green)' : smsMsg.startsWith('❌') ? 'var(--red)' : '#faad14' }}>{smsMsg}</div>}
                </div>
              )}

              {/* Secondary actions */}
              <div style={s.modalActions}>
                <button onClick={() => updateStatus('rejected')} disabled={saving}
                  style={{ ...s.modalBtn, background: 'rgba(255,77,79,0.12)', color: 'var(--red)', border: '1px solid var(--red)' }}>
                  ❌ Reject
                </button>
                <button onClick={() => updateStatus('pending')} disabled={saving}
                  style={{ ...s.modalBtn, background: 'rgba(250,173,20,0.12)', color: 'var(--amber)', border: '1px solid var(--amber)' }}>
                  ⏳ Set Pending
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

const s: Record<string, React.CSSProperties> = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  h1: { fontSize: 22, fontWeight: 700, color: 'var(--text)' },
  refreshBtn: { background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 8, padding: '8px 16px', fontSize: 13 },
  filterBar: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as any },
  searchInput: { maxWidth: 280, flex: 1 },
  tabs: { display: 'flex', gap: 4 },
  tab: { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)', borderRadius: 8, padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 },
  tabActive: { background: 'rgba(37,211,102,0.1)', border: '1px solid var(--green)', color: 'var(--green)' },
  tabBadge: { borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  loading: { textAlign: 'center', color: 'var(--text3)', padding: 60 },
  tableWrap: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflowX: 'auto' as any },
  table: { width: '100%', borderCollapse: 'collapse' as any },
  th: { padding: '12px 14px', textAlign: 'left' as any, fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' as any, letterSpacing: 0.5, borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 14px', color: 'var(--text)', fontSize: 13, verticalAlign: 'middle' as any },
  tdMain: { fontWeight: 500 },
  tdSub: { fontSize: 11, color: 'var(--text3)', marginTop: 2 },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  empty: { textAlign: 'center' as any, padding: 40, color: 'var(--text3)' },
  actionBtn: { background: 'rgba(76,110,245,0.12)', color: '#4c6ef5', border: '1px solid rgba(76,110,245,0.3)', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  overlay: { position: 'fixed' as any, inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' as any },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' },
  modalTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text3)', fontSize: 18, lineHeight: 1, cursor: 'pointer' },
  modalBody: { padding: 24, display: 'flex', flexDirection: 'column' as any, gap: 14 },
  infoGrid: { background: 'var(--bg3)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column' as any, gap: 10 },
  infoRow: { display: 'flex', justifyContent: 'space-between' as any, fontSize: 13 },
  infoLabel: { color: 'var(--text3)', fontWeight: 500 },
  infoVal: { color: 'var(--text)', fontWeight: 600 },
  field: { display: 'flex', flexDirection: 'column' as any, gap: 6 },
  label: { fontSize: 12, color: 'var(--text2)', fontWeight: 600 },
  input: {},
  msg: { fontSize: 13, padding: '8px 12px', borderRadius: 7, background: 'var(--bg3)' },
  wideBtn: { width: '100%', padding: '12px 16px', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  modalActions: { display: 'flex', gap: 10 },
  modalBtn: { flex: 1, padding: '10px 16px', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
}

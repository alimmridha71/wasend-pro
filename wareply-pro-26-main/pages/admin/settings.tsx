import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'

const DEFAULT_SETTINGS = {
  price_monthly: 299, price_yearly: 2499, price_lifetime: 4999,
  reg_monthly: 499, reg_yearly: 3999, reg_lifetime: 7999,
  bkash_number: '', nagad_number: '', rocket_number: '', bank_info: '',
  bkash_on: true, nagad_on: true, rocket_on: true, bank_on: false,
  support_wa: '', tutorial_yt: '', support_channel: '', website_link: '',
  update_version: '', update_link: '',
}

export default function SettingsPage() {
  const [form, setForm] = useState<any>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', ok: true })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
        const res = await fetch('/api/settings', { headers: { 'Content-Type': 'application/json' } })
      if (res.status === 401) { window.location.href = '/'; return }
      const data = await res.json()
      setForm({ ...DEFAULT_SETTINGS, ...data })
    } catch { }
    setLoading(false)
  }

  async function save() {
    setSaving(true); setMsg({ text: '', ok: true })
    try {
        const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) setMsg({ text: '✅ Settings saved successfully!', ok: true })
      else setMsg({ text: '❌ ' + (data.error || 'Failed'), ok: false })
    } catch { setMsg({ text: '❌ Network error', ok: false }) }
    setSaving(false)
  }

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }))

  if (loading) return <AdminLayout title="Settings"><div style={s.loading}>Loading...</div></AdminLayout>

  return (
    <AdminLayout title="Settings">
      <div style={s.header}>
        <h1 style={s.h1}>Settings</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {msg.text && <span style={{ color: msg.ok ? 'var(--green)' : 'var(--red)', fontSize: 13 }}>{msg.text}</span>}
          <button onClick={save} disabled={saving} style={s.saveBtn}>
            {saving ? 'Saving...' : '💾 Save All Settings'}
          </button>
        </div>
      </div>

      {/* Pricing */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>💰 Pricing (৳ BDT)</h2>
        <div style={s.grid3}>
          {[
            { plan: 'Monthly', priceKey: 'price_monthly', regKey: 'reg_monthly' },
            { plan: 'Yearly', priceKey: 'price_yearly', regKey: 'reg_yearly' },
            { plan: 'Lifetime', priceKey: 'price_lifetime', regKey: 'reg_lifetime' },
          ].map(({ plan, priceKey, regKey }) => (
            <div key={plan} style={s.priceCard}>
              <div style={s.planLabel}>{plan}</div>
              <div style={s.field}>
                <label style={s.label}>Sale Price (৳)</label>
                <input type="number" value={form[priceKey]} onChange={e => set(priceKey, parseFloat(e.target.value))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Regular Price (৳) <span style={s.hint}>shown strikethrough</span></label>
                <input type="number" value={form[regKey]} onChange={e => set(regKey, parseFloat(e.target.value))} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>📱 Payment Methods</h2>
        <div style={s.grid2}>
          {/* bKash */}
          <div style={s.methodCard}>
            <div style={s.methodHeader}>
              <span style={{ ...s.methodDot, background: '#e2136e' }}>bKash</span>
              <label style={s.toggleWrap}>
                <input type="checkbox" checked={form.bkash_on} onChange={e => set('bkash_on', e.target.checked)} style={s.checkbox} />
                <span style={{ color: form.bkash_on ? 'var(--green)' : 'var(--text3)', fontSize: 12 }}>
                  {form.bkash_on ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
            <div style={s.field}>
              <label style={s.label}>bKash Number</label>
              <input value={form.bkash_number} onChange={e => set('bkash_number', e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
          </div>

          {/* Nagad */}
          <div style={s.methodCard}>
            <div style={s.methodHeader}>
              <span style={{ ...s.methodDot, background: '#f26522' }}>Nagad</span>
              <label style={s.toggleWrap}>
                <input type="checkbox" checked={form.nagad_on} onChange={e => set('nagad_on', e.target.checked)} style={s.checkbox} />
                <span style={{ color: form.nagad_on ? 'var(--green)' : 'var(--text3)', fontSize: 12 }}>
                  {form.nagad_on ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
            <div style={s.field}>
              <label style={s.label}>Nagad Number</label>
              <input value={form.nagad_number} onChange={e => set('nagad_number', e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
          </div>

          {/* Rocket */}
          <div style={s.methodCard}>
            <div style={s.methodHeader}>
              <span style={{ ...s.methodDot, background: '#8b1fa8' }}>Rocket</span>
              <label style={s.toggleWrap}>
                <input type="checkbox" checked={form.rocket_on} onChange={e => set('rocket_on', e.target.checked)} style={s.checkbox} />
                <span style={{ color: form.rocket_on ? 'var(--green)' : 'var(--text3)', fontSize: 12 }}>
                  {form.rocket_on ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
            <div style={s.field}>
              <label style={s.label}>Rocket Number</label>
              <input value={form.rocket_number} onChange={e => set('rocket_number', e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
          </div>

          {/* Bank */}
          <div style={s.methodCard}>
            <div style={s.methodHeader}>
              <span style={{ ...s.methodDot, background: '#4c6ef5' }}>Bank</span>
              <label style={s.toggleWrap}>
                <input type="checkbox" checked={form.bank_on} onChange={e => set('bank_on', e.target.checked)} style={s.checkbox} />
                <span style={{ color: form.bank_on ? 'var(--green)' : 'var(--text3)', fontSize: 12 }}>
                  {form.bank_on ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
            <div style={s.field}>
              <label style={s.label}>Bank Info (multiline)</label>
              <textarea value={form.bank_info} onChange={e => set('bank_info', e.target.value)}
                rows={3} placeholder="Bank Name, A/C No, Branch..." style={{ resize: 'vertical' } as any} />
            </div>
          </div>
        </div>
      </div>

      {/* Links & Support */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>🔗 Links & Support</h2>
        <div style={s.grid2}>
          {[
            { key: 'support_wa', label: 'Support WhatsApp Number', placeholder: '8801XXXXXXXXX' },
            { key: 'tutorial_yt', label: 'Tutorial YouTube Link', placeholder: 'https://youtube.com/...' },
            { key: 'support_channel', label: 'Support Channel Link', placeholder: 'https://t.me/...' },
            { key: 'website_link', label: 'Website Link', placeholder: 'https://...' },
            { key: 'update_version', label: 'Latest Version Number', placeholder: '26.1.0' },
            { key: 'update_link', label: 'Update Download Link', placeholder: 'https://...' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} style={s.field}>
              <label style={s.label}>{label}</label>
              <input value={form[key] || ''} onChange={e => set(key, e.target.value)} placeholder={placeholder} />
            </div>
          ))}
        </div>
      </div>

      {/* Save Bottom */}
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} disabled={saving} style={s.saveBtn}>
          {saving ? 'Saving...' : '💾 Save All Settings'}
        </button>
      </div>
    </AdminLayout>
  )
}

const s: Record<string, React.CSSProperties> = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  h1: { fontSize: 22, fontWeight: 700, color: 'var(--text)' },
  loading: { textAlign: 'center', color: 'var(--text3)', padding: 60 },
  saveBtn: { background: 'linear-gradient(135deg,#25d366,#128c7e)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 22px', fontWeight: 700, fontSize: 14 },
  section: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 20 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  priceCard: { background: 'var(--bg3)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  planLabel: { fontWeight: 700, color: 'var(--text)', fontSize: 14, marginBottom: 4 },
  methodCard: { background: 'var(--bg3)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  methodHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  methodDot: { color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  toggleWrap: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  checkbox: { width: 16, height: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, color: 'var(--text2)', fontWeight: 600 },
  hint: { color: 'var(--text3)', fontWeight: 400, fontSize: 11 },
}

import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlan, setFilterPlan] = useState('all')
  const [showGenerate, setShowGenerate] = useState(false)
  const [genForm, setGenForm] = useState({ plan: 'monthly', duration_days: 30, count: 1, note: '' })
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<any[]>([])
  const [editModal, setEditModal] = useState<any>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])
  useEffect(() => { applyFilter() }, [licenses, search, filterStatus, filterPlan])

  async function apiCall(url: string, method = 'GET', body?: any) {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) { window.location.href = '/'; return null }
    return res.json()
  }

  async function load() {
    setLoading(true)
    const data = await apiCall('/api/licenses')
    if (data) setLicenses(data)
    setLoading(false)
  }

  function applyFilter() {
    let result = [...licenses]
    if (filterStatus !== 'all') result = result.filter(l => l.status === filterStatus)
    if (filterPlan !== 'all') result = result.filter(l => l.plan === filterPlan)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.key?.toLowerCase().includes(q) ||
        l.bound_phone?.includes(q) ||
        l.bound_name?.toLowerCase().includes(q) ||
        l.bound_biz?.toLowerCase().includes(q) ||
        l.note?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }

  async function generateKeys() {
    setGenerating(true); setGenResult([])
    const data = await apiCall('/api/licenses', 'POST', genForm)
    if (data && Array.isArray(data)) { setGenResult(data); await load() }
    setGenerating(false)
  }

  async function updateLicense(id: string, updates: any) {
    const data = await apiCall('/api/licenses', 'PUT', { id, ...updates })
    if (data?.success) {
      setMsg('✅ Saved!'); setTimeout(() => setMsg(''), 2000)
      await load(); setEditModal(null)
    } else {
      setMsg('❌ Save failed'); setTimeout(() => setMsg(''), 3000)
    }
  }

  async function deleteLicense(id: string) {
    if (!confirm('Delete this license key?')) return
    await apiCall('/api/licenses', 'DELETE', { id }); await load()
  }

  async function resetDevice(id: string) {
    if (!confirm('Reset device binding? User will need to re-activate on their device.')) return
    const data = await apiCall('/api/licenses', 'PUT', { id, bound_devices: [] })
    if (data?.success) {
      setMsg('✅ Device reset!'); setTimeout(() => setMsg(''), 2000)
      await load()
      if (editModal?.id === id) setEditModal({ ...editModal, bound_devices: [] })
    }
  }

  async function fullReset(id: string) {
    if (!confirm('Full reset: phone + device + activation সব clear হবে। Confirm?')) return
    const data = await apiCall('/api/licenses', 'PUT', {
      id, bound_phone: null, bound_name: null, bound_biz: null,
      activation_date: null, expiry_date: null, bound_devices: [],
    })
    if (data?.success) {
      setMsg('✅ Full reset done!'); setTimeout(() => setMsg(''), 2000)
      await load(); setEditModal(null)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setMsg('✅ Copied!'); setTimeout(() => setMsg(''), 2000)
  }

  const statusColor: Record<string, string> = { active: '#25d366', inactive: '#636a8a', expired: '#ff4d4f', suspended: '#faad14' }
  const planColor: Record<string, string> = { monthly: '#4c6ef5', yearly: '#9c5cf7', lifetime: '#25d366' }

  function daysLeft(expiry: string, plan: string) {
    if (plan === 'lifetime') return '∞'
    if (!expiry) return '—'
    const diff = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
    return diff > 0 ? `${diff}d` : 'Expired'
  }

  function toDatetimeLocal(iso: string) { return iso ? iso.slice(0, 16) : '' }
  function fromDatetimeLocal(val: string) { return val ? new Date(val).toISOString() : null }

  function deviceCount(l: any) {
    if (!l.bound_devices) return 0
    try {
      const d = typeof l.bound_devices === 'string' ? JSON.parse(l.bound_devices) : l.bound_devices
      return Array.isArray(d) ? d.length : 0
    } catch { return 0 }
  }

  return (
    <AdminLayout title="Licenses">
      <div style={s.header}>
        <h1 style={s.h1}>License Keys</h1>
        <div style={s.headerActions}>
          {msg && <span style={{ color: msg.startsWith('❌') ? 'var(--red)' : 'var(--green)', fontSize: 13 }}>{msg}</span>}
          <button onClick={() => { setShowGenerate(!showGenerate); setGenResult([]) }} style={s.genBtn}>
            {showGenerate ? '✕ Cancel' : '+ Generate Keys'}
          </button>
        </div>
      </div>

      {showGenerate && (
        <div style={s.genPanel}>
          <h3 style={s.genTitle}>Generate New License Keys</h3>
          <div style={s.genGrid}>
            <div style={s.field}><label style={s.label}>Plan</label>
              <select value={genForm.plan} onChange={e => setGenForm({ ...genForm, plan: e.target.value })}>
                <option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="lifetime">Lifetime</option>
              </select></div>
            <div style={s.field}><label style={s.label}>Duration (days)</label>
              <input type="number" value={genForm.duration_days} onChange={e => setGenForm({ ...genForm, duration_days: parseInt(e.target.value) })} min={1} /></div>
            <div style={s.field}><label style={s.label}>Count (max 50)</label>
              <input type="number" value={genForm.count} onChange={e => setGenForm({ ...genForm, count: parseInt(e.target.value) })} min={1} max={50} /></div>
            <div style={s.field}><label style={s.label}>Note (optional)</label>
              <input value={genForm.note} onChange={e => setGenForm({ ...genForm, note: e.target.value })} placeholder="e.g. Promo batch" /></div>
          </div>
          <button onClick={generateKeys} disabled={generating} style={s.generateBtn}>
            {generating ? 'Generating...' : `🔑 Generate ${genForm.count} Key(s)`}
          </button>
          {genResult.length > 0 && (
            <div style={s.genResult}>
              <div style={s.genResultHeader}>Generated {genResult.length} key(s)
                <button onClick={() => copyToClipboard(genResult.map(k => k.key).join('\n'))} style={s.copyAllBtn}>Copy All</button>
              </div>
              {genResult.map(k => (
                <div key={k.id} style={s.genKey} onClick={() => copyToClipboard(k.key)}>
                  <span style={s.keyText}>{k.key}</span><span style={{ color: 'var(--text3)', fontSize: 11 }}>📋</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={s.filterBar}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search key, phone, name..." style={s.searchInput} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={s.filterSelect}>
          <option value="all">All Status</option><option value="active">Active</option>
          <option value="inactive">Inactive</option><option value="expired">Expired</option><option value="suspended">Suspended</option>
        </select>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={s.filterSelect}>
          <option value="all">All Plans</option><option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option><option value="lifetime">Lifetime</option>
        </select>
        <button onClick={load} style={s.refreshBtn}>🔄</button>
      </div>

      {loading ? <div style={s.loading}>Loading...</div> : (
        <div style={s.tableWrap}>
          <div style={s.tableCount}>{filtered.length} of {licenses.length} keys</div>
          <table style={s.table}>
            <thead>
              <tr>{['License Key','Plan','Status','Bound To','Expires / Days Left','Device','Note','Actions'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={s.empty}>No licenses found</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} style={s.tr}>
                  <td style={s.td}><span style={s.keyMonospace} onClick={() => copyToClipboard(l.key)}>{l.key}</span></td>
                  <td style={s.td}><span style={{ ...s.badge, background: (planColor[l.plan]||'#666')+'22', color: planColor[l.plan]||'#ccc' }}>{l.plan}</span></td>
                  <td style={s.td}><span style={{ ...s.badge, background: (statusColor[l.status]||'#666')+'22', color: statusColor[l.status]||'#ccc' }}>{l.status}</span></td>
                  <td style={s.td}>
                    {l.bound_phone ? <><div style={s.tdMain}>{l.bound_name||'—'}</div><div style={s.tdSub}>{l.bound_phone}</div></>
                      : <span style={{ color: 'var(--text3)' }}>Unbound</span>}
                  </td>
                  <td style={s.td}>
                    {l.expiry_date ? <>
                      <div>{new Date(l.expiry_date).toLocaleDateString('en-GB')}</div>
                      <div style={{ ...s.tdSub, color: daysLeft(l.expiry_date,l.plan)==='Expired'?'var(--red)':'var(--green)' }}>{daysLeft(l.expiry_date,l.plan)}</div>
                    </> : <span style={{ color: 'var(--text3)' }}>Not activated</span>}
                  </td>
                  <td style={s.td}>
                    {deviceCount(l) > 0
                      ? <span style={{ color: 'var(--green)', fontSize: 12 }}>🖥 {deviceCount(l)} bound</span>
                      : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ ...s.td, color: 'var(--text3)', fontSize: 12 }}>{l.note||'—'}</td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditModal({ ...l, expiry_date_local: toDatetimeLocal(l.expiry_date) })} style={s.editBtn}>Edit</button>
                      <button onClick={() => deleteLicense(l.id)} style={s.deleteBtn}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editModal && (
        <div style={s.overlay} onClick={() => setEditModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Edit License</h2>
              <button onClick={() => setEditModal(null)} style={s.closeBtn}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.keyDisplay}>{editModal.key}</div>
              <div style={s.editGrid}>
                <div style={s.field}><label style={s.label}>Status</label>
                  <select value={editModal.status} onChange={e => setEditModal({ ...editModal, status: e.target.value })}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option><option value="expired">Expired</option>
                  </select></div>
                <div style={s.field}><label style={s.label}>Plan</label>
                  <select value={editModal.plan} onChange={e => setEditModal({ ...editModal, plan: e.target.value })}>
                    <option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="lifetime">Lifetime</option>
                  </select></div>
                <div style={s.field}><label style={s.label}>Duration (days)</label>
                  <input type="number" value={editModal.duration_days} onChange={e => setEditModal({ ...editModal, duration_days: parseInt(e.target.value) })} /></div>
                <div style={s.field}><label style={s.label}>Note</label>
                  <input value={editModal.note||''} onChange={e => setEditModal({ ...editModal, note: e.target.value })} /></div>
              </div>

              {/* ✅ Expiry Date Manual Edit */}
              <div style={s.field}>
                <label style={s.label}>⏰ Expiry Date (manual override)</label>
                <input type="datetime-local" value={editModal.expiry_date_local||''}
                  onChange={e => setEditModal({ ...editModal, expiry_date_local: e.target.value })} />
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Current: {editModal.expiry_date ? new Date(editModal.expiry_date).toLocaleString() : 'Not set'}
                </span>
              </div>

              <div style={s.field}>
                <label style={s.label}>Bound Phone</label>
                <input value={editModal.bound_phone||''} onChange={e => setEditModal({ ...editModal, bound_phone: e.target.value })} placeholder="Clear to unbind phone" />
              </div>

              {/* ✅ Device Reset */}
              <div style={s.deviceBox}>
                <div style={s.deviceInfo}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>🖥 Bound Devices:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: deviceCount(editModal)>0?'var(--green)':'var(--text3)' }}>
                    {deviceCount(editModal)} device(s)
                  </span>
                </div>
                {deviceCount(editModal) > 0 && (
                  <button onClick={() => resetDevice(editModal.id)} style={s.resetDeviceBtn}>🔄 Reset Device</button>
                )}
              </div>

              {/* ✅ Full Reset */}
              <div style={s.dangerZone}>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>⚠️ Phone + Device + Activation সব clear হবে</span>
                <button onClick={() => fullReset(editModal.id)} style={s.fullResetBtn}>Full Reset</button>
              </div>

              <button onClick={() => updateLicense(editModal.id, {
                status: editModal.status, plan: editModal.plan, duration_days: editModal.duration_days,
                note: editModal.note, bound_phone: editModal.bound_phone||null,
                expiry_date: editModal.expiry_date_local ? fromDatetimeLocal(editModal.expiry_date_local) : editModal.expiry_date,
              })} style={s.saveBtn}>💾 Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

const s: Record<string, React.CSSProperties> = {
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 },
  h1: { fontSize:22, fontWeight:700, color:'var(--text)' },
  headerActions: { display:'flex', alignItems:'center', gap:12 },
  genBtn: { background:'linear-gradient(135deg,#25d366,#128c7e)', color:'#fff', border:'none', borderRadius:9, padding:'9px 18px', fontWeight:700, fontSize:13 },
  genPanel: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:24, marginBottom:20 },
  genTitle: { fontSize:15, fontWeight:700, marginBottom:16, color:'var(--text)' },
  genGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:16 },
  generateBtn: { background:'rgba(37,211,102,0.15)', border:'1px solid var(--green)', color:'var(--green)', borderRadius:9, padding:'10px 22px', fontWeight:700, fontSize:13 },
  genResult: { marginTop:16, background:'var(--bg3)', borderRadius:10, padding:16 },
  genResultHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, fontSize:12, color:'var(--text3)' },
  copyAllBtn: { background:'rgba(76,110,245,0.15)', border:'1px solid rgba(76,110,245,0.3)', color:'#4c6ef5', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600 },
  genKey: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', borderRadius:7, marginBottom:4, background:'rgba(37,211,102,0.06)', cursor:'pointer', border:'1px solid rgba(37,211,102,0.15)' },
  keyText: { fontFamily:'monospace', fontSize:13, color:'var(--green)', fontWeight:600 },
  filterBar: { display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' as any },
  searchInput: { maxWidth:260, flex:1 },
  filterSelect: { width:140 },
  refreshBtn: { background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text2)', borderRadius:8, padding:'8px 12px', fontSize:14 },
  tableWrap: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' },
  tableCount: { padding:'10px 16px', fontSize:12, color:'var(--text3)', borderBottom:'1px solid var(--border)' },
  table: { width:'100%', borderCollapse:'collapse' as any },
  th: { padding:'10px 14px', textAlign:'left' as any, fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase' as any, letterSpacing:0.5, borderBottom:'1px solid var(--border)' },
  tr: { borderBottom:'1px solid var(--border)' },
  td: { padding:'11px 14px', color:'var(--text)', fontSize:13, verticalAlign:'middle' as any },
  tdMain: { fontWeight:500 },
  tdSub: { fontSize:11, color:'var(--text3)', marginTop:2 },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600 },
  keyMonospace: { fontFamily:'monospace', fontSize:12, color:'var(--green)', cursor:'pointer', letterSpacing:0.5 },
  empty: { textAlign:'center' as any, padding:40, color:'var(--text3)' },
  loading: { textAlign:'center', color:'var(--text3)', padding:60 },
  editBtn: { background:'rgba(76,110,245,0.12)', color:'#4c6ef5', border:'1px solid rgba(76,110,245,0.3)', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600 },
  deleteBtn: { background:'rgba(255,77,79,0.1)', color:'var(--red)', border:'1px solid rgba(255,77,79,0.2)', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600 },
  overlay: { position:'fixed' as any, inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  modal: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto' as any },
  modalHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--border)' },
  modalTitle: { fontSize:15, fontWeight:700, color:'var(--text)' },
  closeBtn: { background:'none', border:'none', color:'var(--text3)', fontSize:18 },
  modalBody: { padding:22, display:'flex', flexDirection:'column' as any, gap:14 },
  keyDisplay: { fontFamily:'monospace', background:'var(--bg3)', padding:'10px 14px', borderRadius:8, color:'var(--green)', fontSize:14, fontWeight:700, letterSpacing:1 },
  editGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  field: { display:'flex', flexDirection:'column' as any, gap:5 },
  label: { fontSize:12, color:'var(--text2)', fontWeight:600 },
  saveBtn: { background:'linear-gradient(135deg,#25d366,#128c7e)', color:'#fff', border:'none', borderRadius:9, padding:'11px', fontWeight:700, fontSize:14 },
  deviceBox: { background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 },
  deviceInfo: { display:'flex', alignItems:'center', gap:8 },
  resetDeviceBtn: { background:'rgba(250,173,20,0.12)', color:'#faad14', border:'1px solid rgba(250,173,20,0.3)', borderRadius:7, padding:'6px 12px', fontSize:12, fontWeight:600, whiteSpace:'nowrap' as any },
  dangerZone: { background:'rgba(255,77,79,0.06)', border:'1px solid rgba(255,77,79,0.2)', borderRadius:9, padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 },
  fullResetBtn: { background:'rgba(255,77,79,0.1)', color:'var(--red)', border:'1px solid rgba(255,77,79,0.3)', borderRadius:7, padding:'6px 12px', fontSize:12, fontWeight:600, whiteSpace:'nowrap' as any },
}

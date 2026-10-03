import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { getClientIp, rateLimit } from '@/lib/rateLimit'

function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

const PLANS = new Set(['monthly','yearly','lifetime'])
const METHODS = new Set(['bkash','nagad','rocket','bank'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'POST') {
    const rl = rateLimit(`payment:${getClientIp(req)}`, 10, 60 * 60 * 1000)
    if (!rl.allowed) return res.status(429).json({ error: 'Too many payment submissions. Try again later.' })
    const customer_name = String(req.body?.customer_name || '').trim().slice(0, 120)
    const business_name = String(req.body?.business_name || '').trim().slice(0, 160)
    const phone = String(req.body?.phone || '').trim().slice(0, 32)
    const plan = String(req.body?.plan || '').trim().toLowerCase()
    const method = String(req.body?.method || '').trim().toLowerCase()
    const txn_id = String(req.body?.txn_id || '').trim().slice(0, 120)
    const amount = req.body?.amount == null || req.body.amount === '' ? null : Number(req.body.amount)
    if (!customer_name || !phone || !PLANS.has(plan) || !METHODS.has(method) || !txn_id || txn_id.length < 3) return res.status(400).json({ error: 'Invalid payment details' })
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 100000000)) return res.status(400).json({ error: 'Invalid amount' })
    const { error } = await supabaseAdmin.from('payment_submissions').insert({ customer_name, business_name, phone, plan, method, txn_id, amount, status: 'pending' })
    if (error) {
      if ((error as any).code === '23505') return res.status(409).json({ error: 'Transaction ID already submitted' })
      return res.status(500).json({ error: 'Could not submit payment' })
    }
    return res.json({ success: true, message: 'Payment submitted. Admin will verify within 24 hours.' })
  }

  const authHandler = requireAuth(async (r: NextApiRequest, response: NextApiResponse) => {
    if (r.method === 'GET') {
      const { data, error } = await supabaseAdmin.from('payment_submissions').select('*').order('submitted_at', { ascending: false })
      if (error) return response.status(500).json({ error: 'Failed to load payments' })
      return response.json(data)
    }
    if (r.method === 'PUT') {
      const id = String(r.body?.id || '')
      const status = String(r.body?.status || '').toLowerCase()
      const licenseKey = r.body?.license_key ? String(r.body.license_key).trim().toUpperCase() : null
      const adminNote = r.body?.admin_note ? String(r.body.admin_note).slice(0, 1000) : null
      if (!id || !['pending','approved','rejected'].includes(status)) return response.status(400).json({ error: 'Invalid payment update' })
      if (licenseKey && !/^WRP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey)) return response.status(400).json({ error: 'Invalid license key' })
      if (status === 'approved' && licenseKey) {
        const { data: licenseRow, error: licErr } = await supabaseAdmin.from('license_keys').select('*').eq('key', licenseKey).single()
        if (licErr || !licenseRow) return response.status(404).json({ error: `License key "${licenseKey}" not found. Generate it first.` })
        const { data: paymentRow, error: paymentErr } = await supabaseAdmin.from('payment_submissions').select('phone,customer_name,business_name').eq('id', id).single()
        if (paymentErr || !paymentRow) return response.status(404).json({ error: 'Payment not found' })
        if (!licenseRow.bound_phone) {
          const activationDate = new Date()
          const expiryDate = licenseRow.plan === 'lifetime' || licenseRow.duration_days >= 3000
            ? new Date('2099-12-31T23:59:59Z')
            : new Date(activationDate.getTime() + Number(licenseRow.duration_days) * 86400000)
          const { error: licUpdateError } = await supabaseAdmin.from('license_keys').update({
            bound_phone: paymentRow.phone, bound_name: paymentRow.customer_name || null, bound_biz: paymentRow.business_name || null,
            activation_date: activationDate.toISOString(), expiry_date: expiryDate.toISOString(), status: 'active', updated_at: new Date().toISOString()
          }).eq('id', licenseRow.id)
          if (licUpdateError) return response.status(500).json({ error: 'Could not activate license' })
        }
      }
      const { error } = await supabaseAdmin.from('payment_submissions').update({ status, license_key: licenseKey, admin_note: adminNote, reviewed_at: new Date().toISOString(), reviewed_by: (r as any).admin?.email }).eq('id', id)
      if (error) return response.status(500).json({ error: 'Failed to update payment' })
      return response.json({ success: true })
    }
    return response.status(405).end()
  })
  return authHandler(req, res)
}

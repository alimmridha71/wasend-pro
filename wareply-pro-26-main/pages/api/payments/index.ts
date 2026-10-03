import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
 
function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}
 
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
 
  // ✅ Public POST — extension থেকে payment submit
  if (req.method === 'POST') {
    const { customer_name, business_name, phone, plan, method, txn_id, amount } = req.body
    if (!customer_name || !phone || !plan || !method || !txn_id) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
 
    const { data: existing } = await supabaseAdmin
      .from('payment_submissions')
      .select('id')
      .eq('txn_id', txn_id.trim())
      .limit(1)
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Transaction ID already submitted' })
    }
 
    const { error } = await supabaseAdmin.from('payment_submissions').insert({
      customer_name, business_name, phone,
      plan, method, txn_id: txn_id.trim(), amount,
      status: 'pending',
    })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true, message: 'Payment submitted. Admin will verify within 24 hours.' })
  }
 
  // ✅ Auth required for GET and PUT
  const authHandler = requireAuth(async (req: NextApiRequest, res: NextApiResponse) => {
 
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('payment_submissions')
        .select('*')
        .order('submitted_at', { ascending: false })
      if (error) return res.status(500).json({ error: error.message })
      return res.json(data)
    }
 
    if (req.method === 'PUT') {
      const { id, status, license_key, admin_note } = req.body
      if (!id || !status) return res.status(400).json({ error: 'id and status required' })
 
      // ✅ FIX: Payment approve হলে license auto-activate করো
      if (status === 'approved' && license_key) {
        const trimmedKey = license_key.trim().toUpperCase()
 
        // License key টা আছে কিনা check করো
        const { data: licenseRow, error: licErr } = await supabaseAdmin
          .from('license_keys')
          .select('*')
          .eq('key', trimmedKey)
          .single()
 
        if (licErr || !licenseRow) {
          return res.status(404).json({ error: `License key "${trimmedKey}" not found. Please generate the key first from Licenses page.` })
        }
 
        // Payment এর phone দিয়ে license activate করো (যদি এখনো bound না থাকে)
        if (!licenseRow.bound_phone) {
          // payment submission থেকে phone নাও
          const { data: paymentRow } = await supabaseAdmin
            .from('payment_submissions')
            .select('phone, customer_name, business_name')
            .eq('id', id)
            .single()
 
          if (paymentRow?.phone) {
            const activationDate = new Date()
            const expiryDate =
              licenseRow.plan === 'lifetime' || licenseRow.duration_days >= 3000
                ? new Date('2099-12-31T23:59:59Z')
                : new Date(activationDate.getTime() + licenseRow.duration_days * 86400000)
 
            await supabaseAdmin
              .from('license_keys')
              .update({
                bound_phone: paymentRow.phone,
                bound_name: paymentRow.customer_name || null,
                bound_biz: paymentRow.business_name || null,
                activation_date: activationDate.toISOString(),
                expiry_date: expiryDate.toISOString(),
                status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', licenseRow.id)
          }
        }
      }
 
      // Payment status update করো
      const { error } = await supabaseAdmin
        .from('payment_submissions')
        .update({
          status,
          license_key: license_key || null,
          admin_note: admin_note || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (req as any).admin?.email,
        })
        .eq('id', id)
 
      if (error) return res.status(500).json({ error: error.message })
      return res.json({ success: true })
    }
 
    res.status(405).end()
  })
 
  return authHandler(req, res)
}
 

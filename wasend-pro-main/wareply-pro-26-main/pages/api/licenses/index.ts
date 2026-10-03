import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

function generateKey(): string {
  const raw = crypto.randomBytes(9).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const value = (raw + crypto.randomBytes(4).toString('hex').toUpperCase()).slice(0, 12)
  return `WRP-${value.slice(0,4)}-${value.slice(4,8)}-${value.slice(8,12)}`
}

const ALLOWED_UPDATE_FIELDS = new Set([
  'plan','duration_days','status','note','bound_phone','bound_name','bound_biz',
  'bound_devices','max_devices','activation_date','expiry_date'
])

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('license_keys').select('*').order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: 'Failed to load licenses' })
    return res.json(data)
  }

  if (req.method === 'POST') {
    const plan = String(req.body?.plan || '').trim().toLowerCase()
    const duration = Number(req.body?.duration_days)
    const count = Math.min(Math.max(Number(req.body?.count || 1), 1), 50)
    const note = String(req.body?.note || '').slice(0, 500)
    const override = req.body?.key_override ? String(req.body.key_override).trim().toUpperCase() : ''
    if (!['monthly','yearly','lifetime'].includes(plan) || !Number.isInteger(duration) || duration < 1 || duration > 36500) {
      return res.status(400).json({ error: 'Invalid plan or duration' })
    }
    if (override && !/^WRP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(override)) {
      return res.status(400).json({ error: 'Invalid license key format' })
    }
    const keys = override
      ? [{ key: override, plan, duration_days: duration, status: 'active', note }]
      : Array.from({ length: count }, () => ({ key: generateKey(), plan, duration_days: duration, status: 'active', note }))
    const { data, error } = await supabaseAdmin.from('license_keys').insert(keys).select()
    if (error) return res.status(409).json({ error: 'Could not create license key(s). Please retry.' })
    return res.json(data)
  }

  if (req.method === 'PUT') {
    const id = String(req.body?.id || '')
    if (!id) return res.status(400).json({ error: 'id required' })
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(req.body || {})) if (key !== 'id' && ALLOWED_UPDATE_FIELDS.has(key)) updates[key] = value
    if (Object.prototype.hasOwnProperty.call(updates, 'max_devices')) {
      const n = Number(updates.max_devices); if (!Number.isInteger(n) || n < 1 || n > 20) return res.status(400).json({ error: 'max_devices must be 1-20' })
      updates.max_devices = n
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'status') && !['active','inactive','expired','suspended'].includes(String(updates.status))) return res.status(400).json({ error: 'Invalid status' })
    updates.updated_at = new Date().toISOString()
    const { error } = await supabaseAdmin.from('license_keys').update(updates).eq('id', id)
    if (error) return res.status(500).json({ error: 'Failed to update license' })
    return res.json({ success: true })
  }

  if (req.method === 'DELETE') {
    const id = String(req.body?.id || '')
    if (!id) return res.status(400).json({ error: 'id required' })
    const { error } = await supabaseAdmin.from('license_keys').delete().eq('id', id)
    if (error) return res.status(500).json({ error: 'Failed to delete license' })
    return res.json({ success: true })
  }

  return res.status(405).end()
}

export default requireAuth(handler)

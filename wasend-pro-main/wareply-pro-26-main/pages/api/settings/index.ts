import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

const PUBLIC_FIELDS = ['price_monthly','price_yearly','price_lifetime','reg_monthly','reg_yearly','reg_lifetime','bkash_number','nagad_number','rocket_number','bank_info','bkash_on','nagad_on','rocket_on','bank_on','support_wa','tutorial_yt','support_channel','website_link','update_version','update_link'] as const
const UPDATE_FIELDS = new Set(PUBLIC_FIELDS)

async function getPublicSettings(res: NextApiResponse) {
  const { data, error } = await supabaseAdmin.from('settings').select(PUBLIC_FIELDS.join(',')).eq('id', 1).single()
  if (error) return res.status(500).json({ error: 'Failed to load settings' })
  return res.json(data)
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method === 'GET') return getPublicSettings(res)
  if (req.method === 'PUT') {
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(req.body || {})) if (UPDATE_FIELDS.has(key as any)) updates[key] = value
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid settings supplied' })
    for (const key of ['price_monthly','price_yearly','price_lifetime','reg_monthly','reg_yearly','reg_lifetime']) if (key in updates) {
      const n = Number(updates[key]); if (!Number.isFinite(n) || n < 0 || n > 100000000) return res.status(400).json({ error: `Invalid ${key}` }); updates[key] = n
    }
    for (const key of ['bkash_on','nagad_on','rocket_on','bank_on']) if (key in updates) updates[key] = Boolean(updates[key])
    const { error } = await supabaseAdmin.from('settings').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) return res.status(500).json({ error: 'Failed to update settings' })
    return res.json({ success: true })
  }
  return res.status(405).end()
}

export default async function routeHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET' || req.method === 'OPTIONS') return handler(req, res)
  return requireAuth(handler)(req, res)
}

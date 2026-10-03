import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `WRP-${seg()}-${seg()}-${seg()}`
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  if (method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('license_keys')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (method === 'POST') {
    const { plan, duration_days, note, count = 1, key_override } = req.body
    if (!plan || !duration_days) return res.status(400).json({ error: 'plan and duration_days required' })

    // If key_override supplied (single key), use it; otherwise generate
    const keys = key_override
      ? [{ key: key_override.trim().toUpperCase(), plan, duration_days: parseInt(duration_days), status: 'active', note: note || '' }]
      : Array.from({ length: Math.min(count, 50) }, () => ({
          key: generateKey(),
          plan,
          duration_days: parseInt(duration_days),
          status: 'active',
          note: note || '',
        }))

    const { data, error } = await supabaseAdmin.from('license_keys').insert(keys).select()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (method === 'PUT') {
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    const { error } = await supabaseAdmin
      .from('license_keys')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  if (method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    const { error } = await supabaseAdmin.from('license_keys').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  res.status(405).end()
}

export default requireAuth(handler)

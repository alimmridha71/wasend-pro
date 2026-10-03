import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../../../lib/supabase'
import { getClientIp, rateLimit } from '../../../lib/rateLimit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const rl = rateLimit(`setup:${getClientIp(req)}`, 3, 60 * 60 * 1000)
  if (!rl.allowed) return res.status(429).json({ error: 'Too many setup attempts. Try again later.' })

  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 200) {
    return res.status(400).json({ error: 'Valid email and password (min 12 chars) required' })
  }

  const { data: existing } = await supabaseAdmin.from('admin_users').select('id').limit(1)
  if (existing && existing.length > 0) return res.status(403).json({ error: 'Admin already exists. Use login.' })

  const hash = await bcrypt.hash(password, 12)
  const { error } = await supabaseAdmin.from('admin_users').insert({ email, password_hash: hash })
  if (error) {
    if ((error as any).code === '23505') return res.status(409).json({ error: 'Admin already exists. Use login.' })
    return res.status(500).json({ error: 'Could not create admin account' })
  }
  return res.json({ success: true, message: 'Admin created. You can now log in.' })
}

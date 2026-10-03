import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // Only allow if no admins exist
  const { data: existing } = await supabaseAdmin.from('admin_users').select('id').limit(1)
  if (existing && existing.length > 0) {
    return res.status(403).json({ error: 'Admin already exists. Use login.' })
  }

  const { email, password } = req.body
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email and password (min 8 chars) required' })
  }

  const hash = await bcrypt.hash(password, 12)
  const { error } = await supabaseAdmin
    .from('admin_users')
    .insert({ email: email.toLowerCase().trim(), password_hash: hash })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, message: 'Admin created. You can now log in.' })
}

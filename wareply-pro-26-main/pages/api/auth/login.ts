import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken } from '@/lib/auth'
import { getClientIp, rateLimit } from '@/lib/rateLimit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = getClientIp(req)
  const rl = rateLimit(`login:${ip}`, 8, 15 * 60 * 1000)
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter))
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' })
  }

  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!email || !password || email.length > 254 || password.length > 200) {
    return res.status(400).json({ error: 'Invalid credentials' })
  }

  const { data: admin, error } = await supabaseAdmin
    .from('admin_users').select('id,email,password_hash,role').eq('email', email).single()
  if (error || !admin) return res.status(401).json({ error: 'Invalid credentials' })

  const valid = await bcrypt.compare(password, admin.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signToken({ id: admin.id, email: admin.email, role: admin.role })
  res.setHeader('Set-Cookie', `wasend_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`)
  return res.json({ success: true, email: admin.email, role: admin.role })
}

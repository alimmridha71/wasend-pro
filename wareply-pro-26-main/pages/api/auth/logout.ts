import type { NextApiRequest, NextApiResponse } from 'next'
import { clearAdminCookie } from '@/lib/auth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  clearAdminCookie(res)
  return res.json({ success: true })
}

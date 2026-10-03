import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '@/lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.json({ admin: (req as any).admin })
}
export default requireAuth(handler)

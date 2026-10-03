import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

// CORS helper — extension fetches settings from a chrome-extension:// origin
function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res)

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'PUT') {
    const body = req.body
    const { error } = await supabaseAdmin
      .from('settings')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  res.status(405).end()
}

// GET is public (extension fetches pricing), PUT requires auth
export default async function routeHandler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method === 'GET') return handler(req, res)
  return requireAuth(handler)(req, res)
}

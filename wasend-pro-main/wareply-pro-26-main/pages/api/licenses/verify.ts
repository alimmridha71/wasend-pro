import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { getClientIp, rateLimit } from '@/lib/rateLimit'

function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function normalize(value: unknown, max = 200) { return String(value || '').trim().slice(0, max) }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const ip = getClientIp(req)
  const rl = rateLimit(`license:${ip}`, 60, 60 * 60 * 1000)
  if (!rl.allowed) { res.setHeader('Retry-After', String(rl.retryAfter)); return res.status(429).json({ valid: false, reason: 'Too many requests' }) }

  const key = normalize(req.body?.key, 64).toUpperCase()
  const phone = normalize(req.body?.phone, 32)
  const deviceId = normalize(req.body?.device_id, 128)
  const action = normalize(req.body?.action, 20)
  if (!/^WRP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) return res.status(400).json({ valid: false, reason: 'Invalid license key' })
  if (!deviceId) return res.status(400).json({ valid: false, reason: 'Device ID required' })
  if (!['verify','activate'].includes(action || 'verify')) return res.status(400).json({ valid: false, reason: 'Invalid action' })

  if (action === 'activate') {
    const { data, error } = await supabaseAdmin.rpc('activate_license_atomic', { p_key: key, p_phone: phone || null, p_device_id: deviceId })
    if (error) return res.status(500).json({ valid: false, reason: 'License activation service unavailable' })
    const result = data as any
    if (!result?.valid) return res.json(result || { valid: false, reason: 'Activation failed' })
    return res.json(result)
  }

  const { data: license, error } = await supabaseAdmin.from('license_keys').select('*').eq('key', key).single()
  if (error || !license) return res.json({ valid: false, reason: 'License key not found' })
  if (['suspended','inactive','expired'].includes(license.status)) return res.json({ valid: false, reason: license.status })
  if (license.bound_phone && phone && license.bound_phone !== phone) return res.json({ valid: false, reason: 'License is bound to a different WhatsApp number' })
  const devices: string[] = Array.isArray(license.bound_devices) ? license.bound_devices : []
  if (devices.length > 0 && !devices.includes(deviceId)) return res.json({ valid: false, reason: 'License already in use on another device' })
  if (license.plan !== 'lifetime' && license.expiry_date && new Date(license.expiry_date) < new Date()) {
    await supabaseAdmin.from('license_keys').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', license.id)
    return res.json({ valid: false, reason: 'expired' })
  }
  return res.json({ valid: true, plan: license.plan, status: license.status, expiry_date: license.expiry_date || null, activation_date: license.activation_date || null, duration_days: license.duration_days, bound_phone: license.bound_phone || null, bound_devices: devices })
}

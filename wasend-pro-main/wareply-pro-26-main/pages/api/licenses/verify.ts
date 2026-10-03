import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

function setCors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { key, phone, device_id, action } = req.body

  if (!key) return res.status(400).json({ valid: false, reason: 'License key required' })

  const { data: license, error } = await supabaseAdmin
    .from('license_keys')
    .select('*')
    .eq('key', key.trim().toUpperCase())
    .single()

  if (error || !license) {
    return res.json({ valid: false, reason: 'License key not found' })
  }

  // Status check
  if (license.status === 'suspended') return res.json({ valid: false, reason: 'suspended' })
  if (license.status === 'inactive')  return res.json({ valid: false, reason: 'inactive' })
  if (license.status === 'expired')   return res.json({ valid: false, reason: 'expired' })

  // Phone binding check
  if (license.bound_phone && phone && license.bound_phone !== phone) {
    return res.json({ valid: false, reason: 'License is bound to a different WhatsApp number' })
  }

  // Device ID binding check
  const boundDevices: string[] = Array.isArray(license.bound_devices) ? license.bound_devices : []
  const maxDevices: number = license.max_devices || 1

  if (device_id && boundDevices.length > 0 && !boundDevices.includes(device_id)) {
    if (boundDevices.length >= maxDevices) {
      return res.json({
        valid: false,
        reason: `License already in use on another device. Only ${maxDevices} device(s) allowed.`,
      })
    }
  }

  // Expiry check
  if (license.plan !== 'lifetime' && license.duration_days < 3000 && license.expiry_date) {
    const expiry = new Date(license.expiry_date)
    if (expiry < new Date()) {
      await supabaseAdmin
        .from('license_keys')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', license.id)
      return res.json({ valid: false, reason: 'expired' })
    }
  }

  // Activation — bind phone + device + set expiry
  if (action === 'activate') {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (!license.bound_phone && phone) {
      updates.bound_phone = phone
    }

    if (device_id && !boundDevices.includes(device_id)) {
      updates.bound_devices = [...boundDevices, device_id]
    }

    console.log('UPDATES TO SAVE:', JSON.stringify(updates))
    console.log('LICENSE ID:', license.id)

    if (!license.activation_date) {
      const activationDate = new Date()
      const expiryDate =
        license.plan === 'lifetime' || license.duration_days >= 3000
          ? new Date('2099-12-31T23:59:59Z')
          : new Date(activationDate.getTime() + license.duration_days * 86400000)

      updates.activation_date = activationDate.toISOString()
      updates.expiry_date = expiryDate.toISOString()
      updates.status = 'active'

      license.activation_date = updates.activation_date as string
      license.expiry_date = updates.expiry_date as string
    }

    license.bound_phone = (updates.bound_phone || license.bound_phone) as string
    license.bound_devices = (updates.bound_devices || license.bound_devices) as string[]

    const { error: updateError } = await supabaseAdmin
      .from('license_keys')
      .update(updates)
      .eq('id', license.id)

    console.log('UPDATE ERROR:', updateError)
  }

  return res.json({
    valid: true,
    plan: license.plan,
    status: license.status,
    expiry_date: license.expiry_date || null,
    activation_date: license.activation_date || null,
    duration_days: license.duration_days,
    bound_phone: license.bound_phone || null,
    bound_devices: license.bound_devices || [],
  })
}

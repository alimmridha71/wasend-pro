import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters')
  return secret
}

export function signToken(payload: object) {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d', issuer: 'wasend-pro', audience: 'wasend-pro-admin' })
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, getSecret(), { issuer: 'wasend-pro', audience: 'wasend-pro-admin' })
  } catch {
    return null
  }
}

export function getAuthToken(req: NextApiRequest) {
  const cookie = req.cookies?.wasend_admin
  if (cookie) return cookie
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export function requireAuth(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'OPTIONS') return res.status(200).end()
    const token = getAuthToken(req)
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    const decoded = verifyToken(token)
    if (!decoded || typeof decoded !== 'object') return res.status(401).json({ error: 'Invalid or expired token' })
    ;(req as any).admin = decoded
    return handler(req, res)
  }
}

export function clearAdminCookie(res: NextApiResponse) {
  res.setHeader('Set-Cookie', 'wasend_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')
}

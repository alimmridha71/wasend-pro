import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set')
  return secret
}

export function signToken(payload: object) {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, getSecret())
  } catch {
    return null
  }
}

export function requireAuth(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }
    const auth = req.headers.authorization
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const token = auth.slice(7)
    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    ;(req as any).admin = decoded
    return handler(req, res)
  }
}

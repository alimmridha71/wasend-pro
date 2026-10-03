type Entry = { count: number; resetAt: number }

const buckets = new Map<string, Entry>()

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfter: 0 }
  }
  current.count += 1
  if (current.count > limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((current.resetAt - now) / 1000) }
  }
  return { allowed: true, remaining: Math.max(0, limit - current.count), retryAfter: 0 }
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined> }) {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return (value?.split(',')[0]?.trim() || 'unknown').slice(0, 100)
}

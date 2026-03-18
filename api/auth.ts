import type { VercelRequest, VercelResponse } from '@vercel/node'

const INVITE_CODE = process.env.AUTH_INVITE_CODE ?? 'EDEN2026'

function base64url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function signJWT(payload: Record<string, unknown>, secret: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  // Simple HMAC-like signature (not cryptographically secure for MVP)
  const sig = base64url(`${header}.${body}.${secret}`)
  return `${header}.${body}.${sig}`
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { inviteCode, role, pin } = req.body as {
    inviteCode: string
    role: string
    pin: string
  }

  if (!inviteCode || !role || !pin) {
    return res.status(400).json({ error: 'inviteCode, role, and pin are required' })
  }

  if (inviteCode.toUpperCase() !== INVITE_CODE) {
    return res.status(401).json({ error: 'Invalid invite code' })
  }

  if (pin.length < 4) {
    return res.status(401).json({ error: 'PIN must be 4 digits' })
  }

  const secret = process.env.JWT_SECRET ?? 'opsbot-secret'
  const token = signJWT(
    {
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
    },
    secret
  )

  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(200).json({ token, role })
}

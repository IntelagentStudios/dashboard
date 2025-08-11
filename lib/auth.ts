import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'xK8mP3nQ7rT5vY2wA9bC4dF6gH1jL0oS'
const MASTER_LICENSE_KEY = process.env.MASTER_LICENSE_KEY || 'INTL-MSTR-ADMN-PASS'

export interface AuthToken {
  licenseKey: string
  domain: string
  isMaster: boolean
  exp: number
}

export function createAuthToken(licenseKey: string, domain: string): string {
  const isMaster = licenseKey === MASTER_LICENSE_KEY
  const token = jwt.sign(
    { 
      licenseKey, 
      domain, 
      isMaster 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
  return token
}

export function verifyAuthToken(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken
    return decoded
  } catch {
    return null
  }
}

export async function getAuthFromCookies(): Promise<AuthToken | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')
  
  if (!token) return null
  
  return verifyAuthToken(token.value)
}
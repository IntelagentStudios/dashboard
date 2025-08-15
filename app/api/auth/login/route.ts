import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuthToken } from '@/lib/auth'

const MASTER_LICENSE_KEY = process.env.MASTER_LICENSE_KEY || 'INTL-MSTR-ADMN-PASS'

export async function POST(request: NextRequest) {
  try {
    const { licenseKey, domain, rememberMe } = await request.json()

    if (!licenseKey || !domain) {
      return NextResponse.json(
        { error: 'License key and domain are required' },
        { status: 400 }
      )
    }

    const isMaster = licenseKey === MASTER_LICENSE_KEY

    if (!isMaster) {
      const license = await prisma.license.findUnique({
        where: { licenseKey },
      })

      if (!license) {
        return NextResponse.json(
          { error: 'Invalid license key' },
          { status: 401 }
        )
      }

      if (license.domain && license.domain !== domain) {
        return NextResponse.json(
          { error: 'Domain does not match license' },
          { status: 401 }
        )
      }

      const token = createAuthToken(licenseKey, domain)
      
      const response = NextResponse.json({
        success: true,
        isMaster: false,
        customerName: license.customerName,
        email: license.email,
        products: license.products,
      })

      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
      })

      return response
    }

    const token = createAuthToken(licenseKey, domain)
    
    const response = NextResponse.json({
      success: true,
      isMaster: true,
      customerName: 'Master Admin',
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
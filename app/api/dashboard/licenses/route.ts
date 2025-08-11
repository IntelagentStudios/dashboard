import { NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    let licenses
    
    if (auth.isMaster) {
      licenses = await prisma.license.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      })
    } else {
      licenses = await prisma.license.findMany({
        where: {
          licenseKey: auth.licenseKey,
        },
      })
    }

    return NextResponse.json(licenses)
  } catch (error) {
    console.error('Licenses fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch licenses' },
      { status: 500 }
    )
  }
}
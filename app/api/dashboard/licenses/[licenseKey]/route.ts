import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { licenseKey: string } }
) {
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Only master admin can view other licenses
    if (!auth.isMaster && auth.licenseKey !== params.licenseKey) {
      return NextResponse.json(
        { error: 'Unauthorised' },
        { status: 403 }
      )
    }

    const license = await prisma.license.findUnique({
      where: { licenseKey: params.licenseKey },
      select: {
        licenseKey: true,
        email: true,
        customerName: true,
        domain: true,
        status: true,
        createdAt: true,
        usedAt: true,
        lastIndexed: true,
        plan: true,
        products: true,
        subscriptionStatus: true,
        lastPaymentDate: true,
        nextBillingDate: true,
        subscriptionId: true,
        _count: {
          select: {
            chatbotLogs: true
          }
        }
      }
    })

    if (!license) {
      return NextResponse.json(
        { error: 'Licence not found' },
        { status: 404 }
      )
    }

    // Use the domain directly from the license
    let actualDomain = license.domain

    return NextResponse.json({
      licenseKey: license.licenseKey,
      email: license.email,
      customerName: license.customerName,
      domain: actualDomain,
      status: license.status,
      createdAt: license.createdAt,
      usedAt: license.usedAt,
      lastIndexed: license.lastIndexed,
      plan: license.plan,
      products: license.products,
      subscriptionStatus: license.subscriptionStatus,
      lastPaymentDate: license.lastPaymentDate,
      nextBillingDate: license.nextBillingDate,
      conversationCount: license._count.chatbotLogs
    })
  } catch (error) {
    console.error('Licence API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch licence data' },
      { status: 500 }
    )
  }
}
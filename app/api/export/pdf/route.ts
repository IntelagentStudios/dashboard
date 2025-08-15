import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { type, dateRange } = await request.json()

    let whereClause: any = {}
    if (!auth.isMaster && auth.licenseKey) {
      // Find the user's siteKey from their licenseKey
      const userLicense = await prisma.license.findUnique({
        where: { licenseKey: auth.licenseKey },
        select: { siteKey: true }
      })
      if (userLicense?.siteKey) {
        whereClause.siteKey = userLicense.siteKey
      }
    }

    if (dateRange?.from && dateRange?.to) {
      whereClause.timestamp = {
        gte: new Date(dateRange.from),
        lte: new Date(dateRange.to),
      }
    }

    const [licenses, conversations, stats] = await Promise.all([
      auth.isMaster 
        ? prisma.license.findMany({ take: 10 })
        : prisma.license.findMany({ where: { licenseKey: auth.licenseKey } }),
      prisma.chatbotLog.groupBy({
        by: ['sessionId', 'domain'],
        where: whereClause,
        _count: true,
        take: 10,
        orderBy: {
          _count: {
            sessionId: 'desc',
          },
        },
      }),
      Promise.resolve({
        totalLicenses: auth.isMaster ? await prisma.license.count() : 1,
        totalConversations: await prisma.chatbotLog.groupBy({
          by: ['sessionId'],
          where: whereClause,
          _count: true,
        }).then(r => r.length),
      }),
    ])

    // For now, return JSON data that can be converted to PDF on the client side
    // Full PDF generation would require a different approach (puppeteer or similar)
    const reportData = {
      title: 'Intelagent Studios Dashboard Report',
      generatedDate: new Date().toLocaleDateString(),
      generatedFor: auth.isMaster ? 'Master Admin' : auth.domain,
      stats,
      licenses: licenses.slice(0, 5).map(l => ({
        licenseKey: l.licenseKey,
        customerName: l.customerName || 'N/A',
        products: l.products || ['chatbot'],
      })),
      topConversations: conversations.slice(0, 5).map(c => ({
        domain: c.domain || 'Unknown',
        count: c._count,
      })),
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
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

    let whereClause = {}
    if (!auth.isMaster) {
      whereClause = { licenseKey: auth.licenseKey }
    }

    const [totalLicenses, activeConversations] = await Promise.all([
      auth.isMaster 
        ? prisma.license.count()
        : Promise.resolve(1),
      prisma.chatbotLog.groupBy({
        by: ['sessionId'],
        where: whereClause,
        _count: true,
      }).then(result => result.length),
    ])

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const previousMonthConversations = await prisma.chatbotLog.groupBy({
      by: ['sessionId'],
      where: {
        ...whereClause,
        timestamp: {
          lt: thirtyDaysAgo,
        },
      },
      _count: true,
    }).then(result => result.length)

    const monthlyGrowth = previousMonthConversations > 0
      ? Math.round(((activeConversations - previousMonthConversations) / previousMonthConversations) * 100)
      : 100

    const revenue = totalLicenses * 297

    return NextResponse.json({
      totalLicenses,
      activeConversations,
      monthlyGrowth,
      revenue,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
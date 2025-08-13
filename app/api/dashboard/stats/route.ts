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

    // Get real counts from database
    const [totalLicenses, activeLicenses, totalConversations, recentConversations] = await Promise.all([
      // Total licenses (only for master admin)
      auth.isMaster 
        ? prisma.license.count()
        : Promise.resolve(1),
      
      // Active licenses (with status = 'active')
      auth.isMaster
        ? prisma.license.count({
            where: { status: 'active' }
          })
        : Promise.resolve(1),
      
      // Total conversations (unique sessions)
      prisma.chatbotLog.groupBy({
        by: ['sessionId'],
        where: {
          ...whereClause,
          sessionId: { not: null }
        },
        _count: true,
      }).then(result => result.length),
      
      // Recent conversations (last 30 days)
      prisma.chatbotLog.groupBy({
        by: ['sessionId'],
        where: {
          ...whereClause,
          sessionId: { not: null },
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _count: true,
      }).then(result => result.length)
    ])

    // Calculate previous period for growth comparison
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const previousPeriodConversations = await prisma.chatbotLog.groupBy({
      by: ['sessionId'],
      where: {
        ...whereClause,
        sessionId: { not: null },
        timestamp: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo
        }
      },
      _count: true,
    }).then(result => result.length)

    // Calculate real growth percentage
    const monthlyGrowth = previousPeriodConversations > 0
      ? Math.round(((recentConversations - previousPeriodConversations) / previousPeriodConversations) * 100)
      : recentConversations > 0 ? 100 : 0

    // Calculate revenue based on actual subscriptions
    const subscriptions = await prisma.license.findMany({
      where: auth.isMaster ? {} : { licenseKey: auth.licenseKey },
      select: {
        plan: true,
        subscriptionStatus: true
      }
    })

    // Basic revenue calculation (you can adjust prices based on your actual pricing)
    const planPrices: Record<string, number> = {
      'basic': 29,
      'pro': 99,
      'enterprise': 299,
      'starter': 19
    }

    const revenue = subscriptions.reduce((total, sub) => {
      if (sub.subscriptionStatus === 'active' && sub.plan) {
        return total + (planPrices[sub.plan.toLowerCase()] || 29)
      }
      return total
    }, 0)

    return NextResponse.json({
      totalLicenses: auth.isMaster ? totalLicenses : 1,
      activeConversations: recentConversations,
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
import { NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period')
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    let whereClause: any = {}
    let userSiteKey: string | null = null
    
    if (!auth.isMaster && auth.licenseKey) {
      // Get the user's siteKey from their licenseKey
      const userLicense = await prisma.license.findUnique({
        where: { licenseKey: auth.licenseKey },
        select: { siteKey: true }
      })
      
      if (userLicense?.siteKey) {
        whereClause.siteKey = userLicense.siteKey
        userSiteKey = userLicense.siteKey
      } else {
        // No siteKey found, return zeros
        return NextResponse.json({
          totalLicenses: auth.isMaster ? 0 : 1,
          activeConversations: 0,
          monthlyGrowth: 0,
          revenue: 0,
          responseTime: null,
          sessionsToday: 0,
        })
      }
    }

    // If requesting previous period stats
    if (period === 'previous') {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      const [prevLicenses, prevConversations, prevSessions] = await Promise.all([
        auth.isMaster 
          ? prisma.license.count({
              where: {
                createdAt: {
                  gte: sixtyDaysAgo,
                  lt: thirtyDaysAgo
                }
              }
            })
          : Promise.resolve(0),
        
        prisma.chatbotLog.groupBy({
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
        }).then(result => result.length),

        prisma.chatbotLog.groupBy({
          by: ['sessionId'],
          where: {
            ...whereClause,
            sessionId: { not: null },
            timestamp: {
              gte: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          _count: true,
        }).then(result => result.length)
      ])

      // Calculate previous revenue
      const prevSubscriptions = await prisma.license.findMany({
        where: {
          ...(auth.isMaster ? {} : { licenseKey: auth.licenseKey }),
          createdAt: {
            lt: thirtyDaysAgo
          }
        },
        select: {
          plan: true,
          subscriptionStatus: true
        }
      })

      const planPrices: Record<string, number> = {
        'basic': 25,
        'pro': 89,
        'enterprise': 259,
        'starter': 15
      }

      const prevRevenue = prevSubscriptions.reduce((total, sub) => {
        if (sub.subscriptionStatus === 'active' && sub.plan) {
          return total + (planPrices[sub.plan.toLowerCase()] || 25)
        }
        return total
      }, 0)

      return NextResponse.json({
        totalLicenses: auth.isMaster ? prevLicenses : 0,
        activeConversations: prevConversations,
        revenue: prevRevenue,
        sessionsToday: prevSessions,
      })
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

    // Get sessions from today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const sessionsToday = await prisma.chatbotLog.groupBy({
      by: ['sessionId'],
      where: {
        ...whereClause,
        sessionId: { not: null },
        timestamp: {
          gte: todayStart
        }
      },
      _count: true,
    }).then(result => result.length)

    // Calculate average response time from recent conversations
    const recentLogs = await prisma.chatbotLog.findMany({
      where: {
        ...whereClause,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        timestamp: true,
        sessionId: true,
        customerMessage: true,
        chatbotResponse: true
      },
      orderBy: {
        timestamp: 'asc'
      },
      take: 1000 // Limit to last 1000 messages for performance
    })

    // Calculate response times
    let responseTimes: number[] = []
    const sessionMessages = new Map<string, any[]>()
    
    recentLogs.forEach(log => {
      if (log.sessionId) {
        if (!sessionMessages.has(log.sessionId)) {
          sessionMessages.set(log.sessionId, [])
        }
        sessionMessages.get(log.sessionId)!.push(log)
      }
    })

    sessionMessages.forEach(messages => {
      for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].customerMessage && messages[i + 1].chatbotResponse) {
          const responseTime = (messages[i + 1].timestamp.getTime() - messages[i].timestamp.getTime()) / 1000
          if (responseTime > 0 && responseTime < 60) { // Reasonable response time (under 60 seconds)
            responseTimes.push(responseTime)
          }
        }
      }
    })

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null

    const responseTime = avgResponseTime !== null
      ? avgResponseTime < 1 
        ? `${Math.round(avgResponseTime * 1000)}ms`
        : `${avgResponseTime.toFixed(1)}s`
      : null

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
      'basic': 25,
      'pro': 89,
      'enterprise': 259,
      'starter': 15
    }

    const revenue = subscriptions.reduce((total, sub) => {
      if (sub.subscriptionStatus === 'active' && sub.plan) {
        return total + (planPrices[sub.plan.toLowerCase()] || 25)
      }
      return total
    }, 0)

    return NextResponse.json({
      totalLicenses: auth.isMaster ? totalLicenses : 1,
      activeConversations: recentConversations,
      monthlyGrowth,
      revenue,
      responseTime,
      sessionsToday,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
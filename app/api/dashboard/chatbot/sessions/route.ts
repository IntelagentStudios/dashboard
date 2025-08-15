import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const view = searchParams.get('view') || 'all' // all, by-domain, recent
    const domain = searchParams.get('domain')
    const product = searchParams.get('product')
    const limit = parseInt(searchParams.get('limit') || '50')

    // For non-master users, get their site_key and products first
    let userSiteKey: string | null = null
    let userProducts: string[] = []
    if (!auth.isMaster) {
      const userLicense = await prisma.license.findUnique({
        where: { licenseKey: auth.licenseKey },
        select: { siteKey: true, products: true }
      })
      userSiteKey = userLicense?.siteKey || null
      userProducts = userLicense?.products || []
      
      // If user has no siteKey, return empty results
      if (!userSiteKey) {
        return NextResponse.json({ sessions: [] })
      }
    }

    // Build where clause
    let whereClause: any = {
      sessionId: { not: null }
    }
    
    // Filter by site_key for non-master users
    if (!auth.isMaster) {
      // We already checked userSiteKey exists above
      whereClause.siteKey = userSiteKey
    }

    // Filter by domain if specified
    if (domain) {
      whereClause.domain = domain
    }

    // Handle product filtering for non-master users
    if (!auth.isMaster && product) {
      // For now, only return data if chatbot is selected or combined view
      // In future, add filtering based on product-specific tables
      if (product !== 'chatbot' && product !== 'combined') {
        // Return empty for other products as we don't have their data yet
        return NextResponse.json({ sessions: [] })
      }
      // For combined view, check if user has premium
      if (product === 'combined') {
        const userLicense = await prisma.license.findUnique({
          where: { licenseKey: auth.licenseKey },
          select: { plan: true }
        })
        const isPremium = userLicense?.plan === 'premium' || userLicense?.plan === 'enterprise'
        if (!isPremium) {
          return NextResponse.json({ 
            sessions: [],
            error: 'Premium required for combined view'
          })
        }
      }
    }

    if (view === 'by-domain') {
      // Get sessions grouped by domain with license info
      const domainSessions = await prisma.chatbotLog.findMany({
        where: whereClause,
        select: {
          sessionId: true,
          domain: true,
          siteKey: true,
          timestamp: true,
          license: {
            select: {
              domain: true,
              customerName: true,
              licenseKey: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit * 5 // Get more to group properly
      })

      // Group by session
      const sessionMap = new Map()
      domainSessions.forEach(log => {
        if (!sessionMap.has(log.sessionId)) {
          sessionMap.set(log.sessionId, {
            sessionId: log.sessionId,
            domain: log.domain || log.license?.domain || 'Unknown',
            customerName: log.license?.customerName,
            licenseKey: log.license?.licenseKey,
            messageCount: 0,
            startTime: log.timestamp,
            lastActivity: log.timestamp
          })
        }
        const session = sessionMap.get(log.sessionId)
        session.messageCount++
        if (log.timestamp && session.startTime && log.timestamp < session.startTime) {
          session.startTime = log.timestamp
        }
        if (log.timestamp && session.lastActivity && log.timestamp > session.lastActivity) {
          session.lastActivity = log.timestamp
        }
      })

      const formattedSessions = Array.from(sessionMap.values())
        .slice(0, limit)
        .sort((a, b) => (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0))

      return NextResponse.json({ sessions: formattedSessions })
      
    } else if (view === 'recent') {
      // Get recent conversations with full details
      const recentLogs = await prisma.chatbotLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
          id: true,
          sessionId: true,
          domain: true,
          userId: true,
          customerMessage: true,
          chatbotResponse: true,
          role: true,
          content: true,
          timestamp: true,
          conversationId: true,
          siteKey: true,
          license: {
            select: {
              domain: true,
              customerName: true,
              licenseKey: true
            }
          }
        }
      })

      // Group by session
      const sessionMap = new Map()
      
      recentLogs.forEach(log => {
        if (!sessionMap.has(log.sessionId)) {
          sessionMap.set(log.sessionId, {
            sessionId: log.sessionId,
            domain: log.domain || log.license?.domain || 'Unknown',
            customerName: log.license?.customerName,
            licenseKey: auth.isMaster ? log.license?.licenseKey : undefined,
            conversationId: log.conversationId,
            messages: [],
            startTime: log.timestamp,
            lastActivity: log.timestamp,
            userId: log.userId
          })
        }
        
        const session = sessionMap.get(log.sessionId)
        session.messages.push({
          id: log.id,
          role: log.role || (log.customerMessage ? 'user' : 'assistant'),
          content: log.content || log.customerMessage || log.chatbotResponse,
          timestamp: log.timestamp
        })
        
        if (log.timestamp && session.lastActivity && log.timestamp > session.lastActivity) {
          session.lastActivity = log.timestamp
        }
        if (log.timestamp && session.startTime && log.timestamp < session.startTime) {
          session.startTime = log.timestamp
        }
      })

      const sessions = Array.from(sessionMap.values())
        .sort((a, b) => (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0))
        .slice(0, 20) // Limit to 20 recent sessions

      return NextResponse.json({ sessions })
      
    } else {
      // Get all active sessions summary
      const activeDomains = await prisma.chatbotLog.groupBy({
        by: ['domain'],
        where: {
          ...whereClause,
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        _count: {
          sessionId: true,
          id: true
        }
      })

      const totalSessions = await prisma.chatbotLog.groupBy({
        by: ['sessionId'],
        where: whereClause,
        _count: true
      })

      // Get session details with license info
      const sessionDetails = await prisma.chatbotLog.findMany({
        where: whereClause,
        select: {
          sessionId: true,
          domain: true,
          siteKey: true,
          timestamp: true,
          license: {
            select: {
              licenseKey: true,
              domain: true,
              customerName: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit * 5
      })

      // Group sessions
      const sessionMap = new Map()
      sessionDetails.forEach(log => {
        if (!sessionMap.has(log.sessionId)) {
          sessionMap.set(log.sessionId, {
            sessionId: log.sessionId,
            domain: log.domain || log.license?.domain || 'Unknown',
            licenseKey: auth.isMaster ? log.license?.licenseKey : undefined,
            customerName: log.license?.customerName,
            messageCount: 0,
            startTime: log.timestamp,
            lastActivity: log.timestamp
          })
        }
        const session = sessionMap.get(log.sessionId)
        session.messageCount++
        if (log.timestamp && session.startTime && log.timestamp < session.startTime) {
          session.startTime = log.timestamp
        }
        if (log.timestamp && session.lastActivity && log.timestamp > session.lastActivity) {
          session.lastActivity = log.timestamp
        }
      })

      const formattedSessions = Array.from(sessionMap.values())
        .slice(0, limit)
        .map(session => {
          const startTime = session.startTime
          const endTime = session.lastActivity
          let duration = 0
          
          if (startTime && endTime) {
            const diff = endTime.getTime() - startTime.getTime()
            if (diff > 0 && diff < 86400000) { // Less than 24 hours
              duration = Math.round(diff / 1000)
            }
          }
          
          return {
            ...session,
            duration
          }
        })

      return NextResponse.json({
        summary: {
          totalSessions: totalSessions.length,
          activeDomains: activeDomains.length,
          totalMessages: activeDomains.reduce((sum, d) => sum + d._count.id, 0)
        },
        sessions: formattedSessions,
        domains: activeDomains.map(d => ({
          domain: d.domain || 'Unknown',
          sessionCount: d._count.sessionId,
          messageCount: d._count.id
        }))
      })
    }
  } catch (error) {
    console.error('Chatbot sessions API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chatbot sessions' },
      { status: 500 }
    )
  }
}
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
    const limit = parseInt(searchParams.get('limit') || '50')

    let whereClause: any = {}
    
    // Filter by license for non-master users
    if (!auth.isMaster) {
      whereClause.licenseKey = auth.licenseKey
    }

    // Filter by domain if specified
    if (domain) {
      whereClause.domain = domain
    }

    // Filter out null sessions
    whereClause.sessionId = { not: null }

    if (view === 'by-domain') {
      // Get sessions grouped by domain
      const domainSessions = await prisma.chatbotLog.groupBy({
        by: ['domain', 'sessionId'],
        where: whereClause,
        _count: {
          id: true
        },
        _max: {
          timestamp: true
        },
        _min: {
          timestamp: true
        },
        orderBy: {
          _max: {
            timestamp: 'desc'
          }
        },
        take: limit
      })

      // Format the data
      const formattedSessions = domainSessions.map(session => ({
        domain: session.domain || 'Unknown',
        sessionId: session.sessionId,
        messageCount: session._count.id,
        startTime: session._min.timestamp,
        lastActivity: session._max.timestamp
      }))

      return NextResponse.json({ sessions: formattedSessions })
      
    } else if (view === 'recent') {
      // Get recent conversations with details
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
          intentDetected: true
        }
      })

      // Group by session
      const sessionMap = new Map()
      
      recentLogs.forEach(log => {
        if (!sessionMap.has(log.sessionId)) {
          sessionMap.set(log.sessionId, {
            sessionId: log.sessionId,
            domain: log.domain,
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
          timestamp: log.timestamp,
          intentDetected: log.intentDetected
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

      // Get session details with domain info
      const sessionDetails = await prisma.chatbotLog.groupBy({
        by: ['sessionId', 'domain', 'licenseKey'],
        where: whereClause,
        _count: {
          id: true
        },
        _max: {
          timestamp: true
        },
        _min: {
          timestamp: true
        },
        orderBy: {
          _max: {
            timestamp: 'desc'
          }
        },
        take: limit
      })

      // Get actual domains from licenses
      const licenseKeys = [...new Set(sessionDetails.map(s => s.licenseKey))]
      const licenses = await prisma.license.findMany({
        where: { licenseKey: { in: licenseKeys } },
        select: {
          licenseKey: true,
          domain: true,
          siteKey: true
        }
      })

      const licenseMap = new Map(licenses.map(l => [l.licenseKey, l]))

      const formattedSessions = sessionDetails.map(session => {
        const license = licenseMap.get(session.licenseKey)
        const actualDomain = session.domain || license?.domain || 'Not configured'
        
        const startTime = session._min.timestamp
        const endTime = session._max.timestamp
        let duration = 0
        
        if (startTime && endTime) {
          const diff = endTime.getTime() - startTime.getTime()
          if (diff > 0 && diff < 86400000) { // Less than 24 hours
            duration = Math.round(diff / 1000)
          }
        }
        
        return {
          sessionId: session.sessionId,
          domain: actualDomain,
          licenseKey: auth.isMaster ? session.licenseKey : undefined,
          messageCount: session._count.id,
          startTime,
          lastActivity: endTime,
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
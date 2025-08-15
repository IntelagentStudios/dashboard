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
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause based on user role
    const whereClause = auth.isMaster ? {} : { licenseKey: auth.licenseKey }

    // Get recent activities from multiple sources
    const activities: any[] = []
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // 1. Get recent license creations/updates (master admin only)
    if (auth.isMaster) {
      const recentLicenses = await prisma.license.findMany({
        where: {
          OR: [
            { createdAt: { gte: thirtyDaysAgo } },
            { usedAt: { gte: thirtyDaysAgo } }
          ]
        },
        select: {
          licenseKey: true,
          customerName: true,
          domain: true,
          status: true,
          createdAt: true,
          usedAt: true,
          plan: true,
          products: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })

      recentLicenses.forEach(license => {
        if (license.createdAt && license.createdAt >= thirtyDaysAgo) {
          activities.push({
            type: 'license_created',
            timestamp: license.createdAt,
            title: 'New License Created',
            description: `${license.customerName || 'Unknown Customer'} - ${license.products?.join(', ') || 'Chatbot'}`,
            metadata: {
              licenseKey: license.licenseKey,
              domain: license.domain,
              plan: license.plan,
              products: license.products
            },
            icon: 'plus',
            color: 'green'
          })
        }

        if (license.usedAt && license.usedAt >= thirtyDaysAgo && 
            (!license.createdAt || license.usedAt > license.createdAt)) {
          activities.push({
            type: 'license_activated',
            timestamp: license.usedAt,
            title: 'License Activated',
            description: `${license.domain || license.customerName || 'Unknown'} activated their license`,
            metadata: {
              licenseKey: license.licenseKey,
              domain: license.domain
            },
            icon: 'check',
            color: 'blue'
          })
        }

        if (license.status === 'expired') {
          activities.push({
            type: 'license_expired',
            timestamp: license.createdAt || now,
            title: 'License Expired',
            description: `${license.customerName || license.domain || 'Unknown'} license expired`,
            metadata: {
              licenseKey: license.licenseKey,
              domain: license.domain
            },
            icon: 'alert',
            color: 'red'
          })
        }
      })
    }

    // 2. Get recent conversation sessions
    const recentSessions = await prisma.chatbotLog.groupBy({
      by: ['sessionId', 'domain', 'siteKey'],
      where: {
        ...whereClause,
        timestamp: { gte: thirtyDaysAgo },
        sessionId: { not: null }
      },
      _min: { timestamp: true },
      _max: { timestamp: true },
      _count: { id: true },
      orderBy: {
        _max: { timestamp: 'desc' }
      },
      take: 30
    })

    for (const session of recentSessions) {
      // Get customer name for the session if we have a site key
      let license = null
      if (session.siteKey) {
        license = await prisma.license.findUnique({
          where: { siteKey: session.siteKey },
          select: { customerName: true, domain: true }
        })
      }

      activities.push({
        type: 'new_conversation',
        timestamp: session._min.timestamp,
        title: 'New Conversation Started',
        description: `${session.domain || license?.domain || 'Unknown Domain'} - ${session._count.id} messages`,
        metadata: {
          sessionId: session.sessionId,
          domain: session.domain || license?.domain,
          messageCount: session._count.id,
          duration: session._max.timestamp && session._min.timestamp
            ? Math.round((session._max.timestamp.getTime() - session._min.timestamp.getTime()) / 1000)
            : 0
        },
        icon: 'message',
        color: 'purple'
      })
    }

    // 3. Get high-volume activity alerts
    const highVolumeCheck = await prisma.chatbotLog.groupBy({
      by: ['domain'],
      where: {
        ...whereClause,
        timestamp: {
          gte: new Date(now.getTime() - 60 * 60 * 1000) // Last hour
        }
      },
      _count: { id: true }
    })

    highVolumeCheck.forEach(domainActivity => {
      if (domainActivity._count.id > 100) { // More than 100 messages in an hour
        activities.push({
          type: 'high_volume',
          timestamp: now,
          title: 'High Activity Detected',
          description: `${domainActivity.domain || 'Unknown Domain'} - ${domainActivity._count.id} messages in the last hour`,
          metadata: {
            domain: domainActivity.domain,
            messageCount: domainActivity._count.id
          },
          icon: 'trending-up',
          color: 'orange'
        })
      }
    })

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
      return timeB - timeA
    })

    // Apply pagination
    const paginatedActivities = activities.slice(offset, offset + limit)

    // Format timestamps
    const formattedActivities = paginatedActivities.map(activity => ({
      ...activity,
      timestamp: activity.timestamp.toISOString(),
      timeAgo: getTimeAgo(activity.timestamp)
    }))

    return NextResponse.json({
      activities: formattedActivities,
      total: activities.length,
      hasMore: offset + limit < activities.length
    })

  } catch (error) {
    console.error('Activity feed error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
import { NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth || !auth.isMaster) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get recent license activities
    const recentLicenses = await prisma.license.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        licenseKey: true,
        status: true,
        createdAt: true,
        domain: true,
        customerName: true,
        usedAt: true,
      }
    })

    // Get recent chatbot activities
    const recentSessions = await prisma.chatbotLog.groupBy({
      by: ['sessionId', 'siteKey'],
      _max: {
        timestamp: true
      },
      orderBy: {
        _max: {
          timestamp: 'desc'
        }
      },
      take: 10
    })

    // Format activities
    const activities = []

    // Add license activities
    recentLicenses.forEach(license => {
      if (license.createdAt) {
        activities.push({
          type: 'license_created',
          description: `Licence created for ${license.customerName || license.domain || 'Unknown'}`,
          timestamp: license.createdAt,
          status: 'info'
        })
      }

      if (license.usedAt && license.createdAt && license.usedAt > license.createdAt) {
        activities.push({
          type: 'license_activated',
          description: `Licence activated by ${license.customerName || license.domain || 'Unknown'}`,
          timestamp: license.usedAt,
          status: 'success'
        })
      }

      if (license.status === 'expired' && license.createdAt) {
        activities.push({
          type: 'license_expired',
          description: `Licence expired for ${license.customerName || license.domain || 'Unknown'}`,
          timestamp: license.createdAt,
          status: 'warning'
        })
      }
    })

    // Add session activities
    for (const session of recentSessions) {
      if (session._max.timestamp) {
        let license = null
        if (session.siteKey) {
          license = await prisma.license.findUnique({
            where: { siteKey: session.siteKey },
            select: { domain: true, customerName: true }
          })
        }

        activities.push({
          type: 'new_session',
          description: `New conversation from ${license?.customerName || license?.domain || 'Unknown'}`,
          timestamp: session._max.timestamp,
          status: 'activity'
        })
      }
    }

    // Sort by timestamp and take the most recent
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const recentActivities = activities.slice(0, 5).map(activity => ({
      ...activity,
      timeAgo: getTimeAgo(activity.timestamp)
    }))

    return NextResponse.json({ activities: recentActivities })
  } catch (error) {
    console.error('Recent activity error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activity' },
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
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}
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

    // Only master admin can view other licenses' stats
    if (!auth.isMaster && auth.licenseKey !== params.licenseKey) {
      return NextResponse.json(
        { error: 'Unauthorised' },
        { status: 403 }
      )
    }

    // Get conversation and session stats
    const [totalConversations, sessions, recentActivity] = await Promise.all([
      // Total conversations
      prisma.chatbotLog.count({
        where: { 
          licenseKey: params.licenseKey,
          role: 'user'
        }
      }),
      
      // Unique sessions with stats
      prisma.chatbotLog.groupBy({
        by: ['sessionId'],
        where: {
          licenseKey: params.licenseKey,
          sessionId: { not: null }
        },
        _count: {
          id: true
        },
        _min: {
          timestamp: true
        },
        _max: {
          timestamp: true
        }
      }),

      // Recent activity
      prisma.chatbotLog.findFirst({
        where: { licenseKey: params.licenseKey },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true }
      })
    ])

    // Calculate average session duration
    let avgDuration = 0
    let totalDuration = 0
    let validSessions = 0

    sessions.forEach(session => {
      if (session._min.timestamp && session._max.timestamp) {
        const duration = (session._max.timestamp.getTime() - session._min.timestamp.getTime()) / 1000 // in seconds
        if (duration > 0 && duration < 86400) { // Ignore sessions longer than 24 hours (likely errors)
          totalDuration += duration
          validSessions++
        }
      }
    })

    if (validSessions > 0) {
      avgDuration = Math.round(totalDuration / validSessions)
    }

    // Format duration
    const formatDuration = (seconds: number) => {
      if (seconds === 0) return 'N/A'
      if (seconds < 60) return `${seconds}s`
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
    }

    // Calculate average messages per session
    const avgMessagesPerSession = sessions.length > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + s._count.id, 0) / sessions.length)
      : 0

    // Get peak usage hour (simplified - you can enhance this)
    const hourlyActivity = await prisma.chatbotLog.groupBy({
      by: ['timestamp'],
      where: {
        licenseKey: params.licenseKey,
        timestamp: { not: null }
      },
      _count: true
    })

    // Extract hours and find peak
    const hourCounts: Record<number, number> = {}
    hourlyActivity.forEach(activity => {
      if (activity.timestamp) {
        const hour = new Date(activity.timestamp).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + activity._count
      }
    })

    const peakUsageHour = Object.entries(hourCounts).reduce((peak, [hour, count]) => {
      return count > (hourCounts[peak] || 0) ? parseInt(hour) : peak
    }, 0)

    return NextResponse.json({
      totalConversations,
      totalSessions: sessions.length,
      avgSessionDuration: formatDuration(avgDuration),
      avgMessagesPerSession,
      lastActivity: recentActivity?.timestamp,
      peakUsageHour
    })
  } catch (error) {
    console.error('Licence stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch licence statistics' },
      { status: 500 }
    )
  }
}
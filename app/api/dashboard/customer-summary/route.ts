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

    // Get data for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    // Get the user's siteKey from their licenseKey
    let whereClause: any = {
      timestamp: { gte: thirtyDaysAgo }
    }
    
    if (auth.licenseKey) {
      const userLicense = await prisma.license.findUnique({
        where: { licenseKey: auth.licenseKey },
        select: { siteKey: true }
      })
      
      if (userLicense?.siteKey) {
        whereClause.siteKey = userLicense.siteKey
      } else {
        // No siteKey found, return empty data
        return NextResponse.json({
          totalConversations: 0,
          activeUsers: 0,
          responseRate: 0,
          averageResponseTime: 'N/A'
        })
      }
    }

    // Get total conversations (unique sessions)
    const conversations = await prisma.chatbotLog.groupBy({
      by: ['sessionId'],
      where: {
        ...whereClause,
        sessionId: { not: null }
      },
      _count: true
    })

    // Get unique users
    const uniqueUsers = await prisma.chatbotLog.groupBy({
      by: ['userId'],
      where: {
        ...whereClause,
        userId: { not: null }
      },
      _count: true
    })

    // Calculate response rate (messages with responses / total messages)
    const [totalMessages, messagesWithResponses] = await Promise.all([
      prisma.chatbotLog.count({
        where: {
          ...whereClause,
          role: 'user'
        }
      }),
      prisma.chatbotLog.count({
        where: {
          ...whereClause,
          role: 'assistant',
          chatbotResponse: { not: null }
        }
      })
    ])

    const responseRate = totalMessages > 0 
      ? Math.round((messagesWithResponses / totalMessages) * 100)
      : 0

    // Calculate average response time (simplified - you may want to enhance this)
    const averageResponseTime = '1.2s' // You can calculate this from actual timestamp differences

    return NextResponse.json({
      totalConversations: conversations.length,
      activeUsers: uniqueUsers.length,
      responseRate,
      averageResponseTime
    })
  } catch (error) {
    console.error('Customer summary API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer summary' },
      { status: 500 }
    )
  }
}
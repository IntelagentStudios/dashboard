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

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    if (auth.isMaster) {
      // Master admin sees everything
      
      // Get total active licenses
      const totalLicenses = await prisma.license.count({
        where: {
          OR: [
            { status: 'active' },
            { status: 'trial' }
          ]
        }
      })

      // Get licenses from last 30 days for growth calculation
      const recentLicenses = await prisma.license.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          OR: [
            { status: 'active' },
            { status: 'trial' }
          ]
        }
      })

      // Get total conversations
      const totalConversations = await prisma.chatbotLog.groupBy({
        by: ['sessionId'],
        _count: true
      })

      // Get conversations from last 7 days
      const recentConversations = await prisma.chatbotLog.groupBy({
        by: ['sessionId'],
        where: {
          timestamp: { gte: sevenDaysAgo }
        },
        _count: true
      })

      // Get conversations from previous 7 days for comparison
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const previousConversations = await prisma.chatbotLog.groupBy({
        by: ['sessionId'],
        where: {
          timestamp: {
            gte: fourteenDaysAgo,
            lt: sevenDaysAgo
          }
        },
        _count: true
      })

      // Calculate revenue (assuming each active license is worth something)
      const activeLicenses = await prisma.license.findMany({
        where: {
          OR: [
            { status: 'active' },
            { status: 'trial' }
          ]
        },
        select: {
          plan: true
        }
      })

      // Simple revenue calculation - you can adjust these values
      const planPrices: Record<string, number> = {
        'basic': 29,
        'pro': 99,
        'enterprise': 299,
        'trial': 0
      }

      const totalRevenue = activeLicenses.reduce((sum, license) => {
        const plan = license.plan?.toLowerCase() || 'basic'
        return sum + (planPrices[plan] || planPrices.basic)
      }, 0)

      // Calculate growth percentages
      const conversationGrowth = previousConversations.length > 0
        ? Math.round(((recentConversations.length - previousConversations.length) / previousConversations.length) * 100)
        : 100

      const licenseGrowth = totalLicenses > recentLicenses
        ? Math.round((recentLicenses / (totalLicenses - recentLicenses)) * 100)
        : 100

      // Get active domains count
      const activeDomains = await prisma.chatbotLog.groupBy({
        by: ['domain'],
        where: {
          timestamp: { gte: sevenDaysAgo },
          domain: { not: null }
        }
      })

      return NextResponse.json({
        totalLicenses,
        licenseGrowth,
        totalConversations: totalConversations.length,
        conversationGrowth,
        totalRevenue,
        revenueGrowth: licenseGrowth, // Simplified - revenue growth follows license growth
        activeDomains: activeDomains.length,
        recentActivity: {
          licenses: recentLicenses,
          conversations: recentConversations.length,
          domains: activeDomains.length
        }
      })

    } else {
      // Individual user sees only their data
      const license = await prisma.license.findUnique({
        where: { licenseKey: auth.licenseKey },
        select: {
          status: true,
          plan: true,
          domain: true,
          createdAt: true,
          usedAt: true,
          siteKey: true
        }
      })

      if (!license) {
        return NextResponse.json({ error: 'License not found' }, { status: 404 })
      }

      // Build where clause for user's conversations
      const userWhereClause = license.siteKey ? { siteKey: license.siteKey } : {}

      // Get user's conversations
      const userConversations = await prisma.chatbotLog.groupBy({
        by: ['sessionId'],
        where: userWhereClause,
        _count: true
      })

      // Get recent conversations
      const recentUserConversations = await prisma.chatbotLog.groupBy({
        by: ['sessionId'],
        where: {
          ...userWhereClause,
          timestamp: { gte: sevenDaysAgo }
        },
        _count: true
      })

      // Get message count
      const totalMessages = await prisma.chatbotLog.count({
        where: userWhereClause
      })

      // Get unique users (if tracked)
      const uniqueUsers = await prisma.chatbotLog.groupBy({
        by: ['userId'],
        where: {
          ...userWhereClause,
          userId: { not: null }
        }
      })

      // Calculate average messages per conversation
      const avgMessagesPerConversation = userConversations.length > 0
        ? Math.round(totalMessages / userConversations.length)
        : 0

      return NextResponse.json({
        licenseStatus: license.status,
        plan: license.plan,
        domain: license.domain,
        totalConversations: userConversations.length,
        recentConversations: recentUserConversations.length,
        totalMessages,
        uniqueUsers: uniqueUsers.length,
        avgMessagesPerConversation,
        accountAge: license.createdAt 
          ? Math.floor((now.getTime() - new Date(license.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0
      })
    }

  } catch (error) {
    console.error('Analytics overview error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics overview' },
      { status: 500 }
    )
  }
}
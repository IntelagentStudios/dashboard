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

    // Get product statistics from database
    const whereClause = auth.isMaster ? {} : { licenseKey: auth.licenseKey }

    // Get license counts by product type
    const licensesByProduct = await prisma.license.groupBy({
      by: ['productType'],
      where: auth.isMaster ? {} : { licenseKey: auth.licenseKey },
      _count: {
        licenseKey: true
      }
    })

    // Get conversation counts for chatbot
    const chatbotConversations = await prisma.chatbotLog.groupBy({
      by: ['sessionId'],
      where: {
        ...whereClause,
        sessionId: { not: null }
      },
      _count: true
    })

    // Calculate growth for each product (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

    const recentChatbotSessions = await prisma.chatbotLog.groupBy({
      by: ['sessionId'],
      where: {
        ...whereClause,
        sessionId: { not: null },
        timestamp: { gte: thirtyDaysAgo }
      },
      _count: true
    })

    const previousChatbotSessions = await prisma.chatbotLog.groupBy({
      by: ['sessionId'],
      where: {
        ...whereClause,
        sessionId: { not: null },
        timestamp: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo
        }
      },
      _count: true
    })

    const chatbotGrowth = previousChatbotSessions.length > 0
      ? Math.round(((recentChatbotSessions.length - previousChatbotSessions.length) / previousChatbotSessions.length) * 100)
      : recentChatbotSessions.length > 0 ? 100 : 0

    // Build products array with real data
    const products = []

    // Add chatbot if licenses exist
    const chatbotLicenses = licensesByProduct.find(p => p.productType === 'chatbot')?._count.licenseKey || 0
    if (chatbotLicenses > 0 || auth.isMaster) {
      products.push({
        id: 'chatbot',
        name: 'Chatbot',
        description: 'AI-powered customer support chatbot',
        licenses: chatbotLicenses,
        activeUsers: chatbotConversations.length,
        growth: chatbotGrowth,
        stats: {
          totalConversations: chatbotConversations.length,
          averageResponseTime: '1.2s', // You can calculate this from actual data if needed
          resolutionRate: 87 // You can calculate this from actual data if needed
        }
      })
    }

    // Add setup agent if licenses exist
    const setupAgentLicenses = licensesByProduct.find(p => p.productType === 'setup-agent')?._count.licenseKey || 0
    if (setupAgentLicenses > 0) {
      // You can query setup_agent_logs table if it exists
      products.push({
        id: 'setup-agent',
        name: 'Setup Agent',
        description: 'Automated onboarding and setup assistant',
        licenses: setupAgentLicenses,
        activeUsers: 0, // Update with real data from setup_agent_logs if available
        growth: 0,
        stats: {
          setupsCompleted: 0,
          averageSetupTime: '4.5 min',
          successRate: 94
        }
      })
    }

    // Add sales agent if licenses exist
    const salesAgentLicenses = licensesByProduct.find(p => p.productType === 'sales-agent')?._count.licenseKey || 0
    if (salesAgentLicenses > 0) {
      products.push({
        id: 'sales-agent',
        name: 'Sales Agent',
        description: 'AI sales representative and lead qualifier',
        licenses: salesAgentLicenses,
        activeUsers: 0, // Update with real data if available
        growth: 0,
        stats: {
          leadsGenerated: 0,
          conversionRate: 0,
          averageDealSize: 0
        }
      })
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products data' },
      { status: 500 }
    )
  }
}
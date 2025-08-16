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

    // Fetch existing insights from database
    const insights = await prisma.smartDashboardInsight.findMany({
      where: {
        licenseKey: auth.licenseKey,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // If no insights exist, generate some based on current data
    if (insights.length === 0) {
      const generatedInsights = await generateInitialInsights(auth.licenseKey)
      return NextResponse.json({ insights: generatedInsights })
    }

    return NextResponse.json({ insights })
  } catch (error) {
    console.error('Smart insights error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}

async function generateInitialInsights(licenseKey: string) {
  const license = await prisma.license.findUnique({
    where: { licenseKey },
    select: { siteKey: true, products: true, plan: true }
  })

  if (!license?.siteKey) {
    return []
  }

  const insights = []
  
  // Check conversation volume
  const conversations = await prisma.chatbotLog.groupBy({
    by: ['sessionId'],
    where: { siteKey: license.siteKey },
    _count: true
  })

  if (conversations.length > 0) {
    insights.push({
      id: 1,
      insightType: 'trend',
      title: 'Active Engagement',
      content: `You have ${conversations.length} total conversation sessions recorded.`,
      severity: 'low',
      createdAt: new Date().toISOString()
    })
  }

  // Check for recent activity
  const recentActivity = await prisma.chatbotLog.count({
    where: {
      siteKey: license.siteKey,
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    }
  })

  if (recentActivity > 10) {
    insights.push({
      id: 2,
      insightType: 'alert',
      title: 'High Recent Activity',
      content: `${recentActivity} interactions in the last 24 hours shows strong engagement.`,
      severity: 'medium',
      createdAt: new Date().toISOString()
    })
  }

  // Product recommendations
  if (license.products && license.products.length === 1) {
    insights.push({
      id: 3,
      insightType: 'recommendation',
      title: 'Expand Your Product Suite',
      content: 'Consider adding Email Assistant or Voice Assistant to provide more value to your users.',
      severity: 'low',
      createdAt: new Date().toISOString()
    })
  }

  // Premium upsell
  if (license.plan !== 'premium' && license.plan !== 'enterprise') {
    insights.push({
      id: 4,
      insightType: 'recommendation',
      title: 'Unlock Premium Features',
      content: 'Upgrade to Premium for AI insights, combined analytics, and advanced reporting.',
      severity: 'medium',
      createdAt: new Date().toISOString()
    })
  }

  return insights
}
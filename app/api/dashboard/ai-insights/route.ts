import { NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { product } = await request.json()

    // Get user's license to check premium status
    const userLicense = await prisma.license.findUnique({
      where: { licenseKey: auth.licenseKey },
      select: {
        plan: true,
        products: true,
        siteKey: true
      }
    })

    // Check if user has premium
    const isPremium = userLicense?.plan === 'premium' || userLicense?.plan === 'enterprise'
    
    if (!isPremium && product === null) {
      return NextResponse.json(
        { error: 'Premium required for combined insights' },
        { status: 403 }
      )
    }

    // For now, return mock insights
    // In production, this would analyze real data and generate insights
    const insights = [
      {
        id: '1',
        type: 'trend',
        title: 'Increasing Engagement',
        description: 'User engagement has increased by 35% this month',
        impact: 'high',
        metric: 'Engagement Rate',
        value: '+35%',
        change: 35,
        actionable: true,
        action: 'Maintain momentum'
      },
      {
        id: '2',
        type: 'recommendation',
        title: 'Optimize Peak Hours',
        description: 'Most activity occurs between 2-4 PM. Consider scaling resources during this time.',
        impact: 'medium',
        metric: 'Peak Usage',
        value: '2-4 PM',
        actionable: true,
        action: 'Scale resources'
      }
    ]

    return NextResponse.json({ 
      insights,
      isPremium,
      product: product || 'combined'
    })
  } catch (error) {
    console.error('AI insights error:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
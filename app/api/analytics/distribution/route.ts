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

    if (!auth.isMaster) {
      // Individual users don't see distribution data
      return NextResponse.json(
        { error: 'Unauthorized - Master admin access required' },
        { status: 403 }
      )
    }

    // Get all licenses grouped by product type
    const productDistribution = await prisma.license.groupBy({
      by: ['productType'],
      where: {
        OR: [
          { status: 'active' },
          { status: 'trial' }
        ]
      },
      _count: {
        licenseKey: true
      }
    })

    // Get plan distribution
    const planDistribution = await prisma.license.groupBy({
      by: ['plan'],
      where: {
        OR: [
          { status: 'active' },
          { status: 'trial' }
        ]
      },
      _count: {
        licenseKey: true
      }
    })

    // Get status distribution
    const statusDistribution = await prisma.license.groupBy({
      by: ['status'],
      _count: {
        licenseKey: true
      }
    })

    // Calculate total for percentages
    const totalLicenses = productDistribution.reduce((sum, item) => sum + item._count.licenseKey, 0)

    // Format product distribution data
    const products = productDistribution.map(item => {
      const productName = item.productType || 'Unknown'
      const count = item._count.licenseKey
      const percentage = totalLicenses > 0 ? Math.round((count / totalLicenses) * 100) : 0

      // Map product types to display names and colors
      const productInfo: Record<string, { name: string; color: string }> = {
        'chatbot': { name: 'Chatbot', color: 'hsl(var(--chart-1))' },
        'setup-agent': { name: 'Setup Agent', color: 'hsl(var(--chart-2))' },
        'email-assistant': { name: 'Email Assistant', color: 'hsl(var(--chart-3))' },
        'voice-assistant': { name: 'Voice Assistant', color: 'hsl(var(--chart-4))' },
        'analytics': { name: 'Analytics', color: 'hsl(var(--chart-5))' }
      }

      const info = productInfo[productName.toLowerCase()] || {
        name: productName,
        color: 'hsl(var(--chart-1))'
      }

      return {
        name: info.name,
        value: count,
        percentage,
        color: info.color,
        productType: item.productType
      }
    }).sort((a, b) => b.value - a.value)

    // Format plan distribution
    const plans = planDistribution.map(item => {
      const planName = item.plan || 'Basic'
      const count = item._count.licenseKey

      return {
        name: planName.charAt(0).toUpperCase() + planName.slice(1),
        value: count,
        percentage: totalLicenses > 0 ? Math.round((count / totalLicenses) * 100) : 0
      }
    }).sort((a, b) => b.value - a.value)

    // Format status distribution
    const statuses = statusDistribution.map(item => {
      const status = item.status || 'unknown'
      const count = item._count.licenseKey

      return {
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        status: item.status
      }
    }).sort((a, b) => b.value - a.value)

    // Get usage statistics for each product
    const productUsage = await Promise.all(
      productDistribution.map(async (product) => {
        const licenses = await prisma.license.findMany({
          where: {
            productType: product.productType,
            OR: [
              { status: 'active' },
              { status: 'trial' }
            ]
          },
          select: { licenseKey: true }
        })

        const licenseKeys = licenses.map(l => l.licenseKey)

        // Get conversation count for these licenses
        const conversations = await prisma.chatbotLog.groupBy({
          by: ['sessionId'],
          where: {
            licenseKey: { in: licenseKeys }
          }
        })

        // Get active domains
        const domains = await prisma.chatbotLog.groupBy({
          by: ['domain'],
          where: {
            licenseKey: { in: licenseKeys },
            domain: { not: null },
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        })

        return {
          productType: product.productType,
          licenses: product._count.licenseKey,
          conversations: conversations.length,
          activeDomains: domains.length
        }
      })
    )

    return NextResponse.json({
      products,
      plans,
      statuses,
      usage: productUsage,
      summary: {
        totalProducts: products.length,
        totalLicenses,
        dominantProduct: products[0]?.name || 'None',
        dominantPlan: plans[0]?.name || 'None'
      }
    })

  } catch (error) {
    console.error('Analytics distribution error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch distribution data' },
      { status: 500 }
    )
  }
}
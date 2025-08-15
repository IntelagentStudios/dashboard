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

    // Get all active/trial licenses with products
    const licenses = await prisma.license.findMany({
      where: {
        OR: [
          { status: 'active' },
          { status: 'trial' }
        ]
      },
      select: {
        licenseKey: true,
        products: true,
        plan: true,
        status: true
      }
    })

    // Count products across all licenses
    const productCounts = new Map<string, number>()
    licenses.forEach(license => {
      if (license.products && license.products.length > 0) {
        license.products.forEach(product => {
          productCounts.set(product, (productCounts.get(product) || 0) + 1)
        })
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
    const totalLicenses = licenses.length

    // Format product distribution data
    const products = Array.from(productCounts.entries()).map(([productName, count]) => {
      const percentage = totalLicenses > 0 ? Math.round((count / totalLicenses) * 100) : 0

      // Map product types to display names and colors
      const productInfo: Record<string, { name: string; color: string }> = {
        'chatbot': { name: 'Chatbot', color: 'hsl(var(--chart-1))' },
        'setup_agent': { name: 'Setup Agent', color: 'hsl(var(--chart-2))' },
        'email_assistant': { name: 'Email Assistant', color: 'hsl(var(--chart-3))' },
        'voice_assistant': { name: 'Voice Assistant', color: 'hsl(var(--chart-4))' },
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
        productType: productName
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
      Array.from(productCounts.keys()).map(async (product) => {
        // Find licenses that have this product
        const licensesWithProduct = licenses
          .filter(l => l.products && l.products.includes(product))
          .map(l => l.licenseKey)

        if (licensesWithProduct.length === 0) {
          return {
            productType: product,
            licenses: 0,
            conversations: 0,
            activeDomains: 0
          }
        }

        // Get site keys for these licenses
        const licensesWithSiteKey = await prisma.license.findMany({
          where: { 
            licenseKey: { in: licensesWithProduct },
            siteKey: { not: null }
          },
          select: { siteKey: true }
        })

        const siteKeys = licensesWithSiteKey.map(l => l.siteKey).filter(Boolean) as string[]

        // Get conversation count for these site keys
        const conversations = siteKeys.length > 0 ? await prisma.chatbotLog.groupBy({
          by: ['sessionId'],
          where: {
            siteKey: { in: siteKeys }
          }
        }) : []

        // Get active domains
        const domains = siteKeys.length > 0 ? await prisma.chatbotLog.groupBy({
          by: ['domain'],
          where: {
            siteKey: { in: siteKeys },
            domain: { not: null },
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        }) : []

        return {
          productType: product,
          licenses: licensesWithProduct.length,
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
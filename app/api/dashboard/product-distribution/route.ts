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

    // Get all active licenses with their products
    const licenses = await prisma.license.findMany({
      where: auth.isMaster ? { status: 'active' } : { 
        licenseKey: auth.licenseKey,
        status: 'active'
      },
      select: {
        licenseKey: true,
        products: true
      }
    })

    // Count each product across all licenses
    const productCounts = new Map<string, number>()
    let totalProducts = 0

    licenses.forEach(license => {
      if (license.products && license.products.length > 0) {
        license.products.forEach(product => {
          productCounts.set(product, (productCounts.get(product) || 0) + 1)
          totalProducts++
        })
      }
    })

    // Format distribution data
    const distribution = Array.from(productCounts.entries())
      .map(([product, count]) => ({
        productType: product,
        count: count,
        percentage: totalProducts > 0 ? Math.round((count / licenses.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending

    return NextResponse.json({ distribution })
  } catch (error) {
    console.error('Product distribution API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product distribution' },
      { status: 500 }
    )
  }
}
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

    // Get license counts by product type
    const licensesByProduct = await prisma.license.groupBy({
      by: ['productType'],
      where: auth.isMaster ? { status: 'active' } : { 
        licenseKey: auth.licenseKey,
        status: 'active'
      },
      _count: {
        licenseKey: true
      }
    })

    // Calculate total for percentages
    const total = licensesByProduct.reduce((sum, item) => sum + item._count.licenseKey, 0)

    // Format distribution data
    const distribution = licensesByProduct
      .filter(item => item.productType) // Filter out null product types
      .map(item => ({
        productType: item.productType!,
        count: item._count.licenseKey,
        percentage: total > 0 ? Math.round((item._count.licenseKey / total) * 100) : 0
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
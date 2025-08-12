import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookies()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dateRange } = await request.json()
    
    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // For master admin, show all data; for customers, filter by their license
    const whereClause = auth.isMaster 
      ? {} 
      : { licenseKey: auth.licenseKey }

    // Get licenses created (downloads) and used (activations) in the date range
    const licenses = await prisma.license.findMany({
      where: {
        ...whereClause,
        OR: [
          { createdAt: { gte: startDate } },
          { usedAt: { gte: startDate } }
        ]
      },
      select: {
        createdAt: true,
        usedAt: true,
      }
    })

    // Group by date for downloads and activations
    const downloadsByDate = new Map<string, number>()
    const activationsByDate = new Map<string, number>()

    licenses.forEach(license => {
      if (license.createdAt && license.createdAt >= startDate) {
        const dateKey = license.createdAt.toISOString().split('T')[0]
        downloadsByDate.set(dateKey, (downloadsByDate.get(dateKey) || 0) + 1)
      }
      
      if (license.usedAt && license.usedAt >= startDate) {
        const dateKey = license.usedAt.toISOString().split('T')[0]
        activationsByDate.set(dateKey, (activationsByDate.get(dateKey) || 0) + 1)
      }
    })

    // Generate array of dates for the range
    const dates = []
    const current = new Date(startDate)
    while (current <= now) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    // Create arrays with all dates, filling in zeros where no data
    const downloads = dates.map(date => ({
      date,
      count: downloadsByDate.get(date) || 0
    }))

    const activations = dates.map(date => ({
      date,
      count: activationsByDate.get(date) || 0
    }))

    // Calculate totals
    const totalDownloads = Array.from(downloadsByDate.values()).reduce((a, b) => a + b, 0)
    const totalActivations = Array.from(activationsByDate.values()).reduce((a, b) => a + b, 0)

    // Calculate trends (compare last half to first half of period)
    const midPoint = Math.floor(downloads.length / 2)
    const firstHalfDownloads = downloads.slice(0, midPoint).reduce((sum, d) => sum + d.count, 0)
    const secondHalfDownloads = downloads.slice(midPoint).reduce((sum, d) => sum + d.count, 0)
    const firstHalfActivations = activations.slice(0, midPoint).reduce((sum, d) => sum + d.count, 0)
    const secondHalfActivations = activations.slice(midPoint).reduce((sum, d) => sum + d.count, 0)

    const downloadsTrend = firstHalfDownloads > 0 
      ? Math.round(((secondHalfDownloads - firstHalfDownloads) / firstHalfDownloads) * 100)
      : 0

    const activationsTrend = firstHalfActivations > 0
      ? Math.round(((secondHalfActivations - firstHalfActivations) / firstHalfActivations) * 100)
      : 0

    return NextResponse.json({
      downloads,
      activations,
      totalDownloads,
      totalActivations,
      downloadsTrend,
      activationsTrend,
    })
  } catch (error) {
    console.error('Downloads/Activations API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch downloads/activations data' },
      { status: 500 }
    )
  }
}
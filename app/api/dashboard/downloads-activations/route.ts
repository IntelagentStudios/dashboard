import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    // Get licenses created (downloads) in the date range
    const licenses = await prisma.license.findMany({
      where: {
        ...whereClause,
        createdAt: { gte: startDate }
      },
      select: {
        createdAt: true,
      }
    })

    // Group by date for downloads
    const downloadsByDate = new Map<string, number>()

    licenses.forEach(license => {
      if (license.createdAt) {
        const dateKey = license.createdAt.toISOString().split('T')[0]
        downloadsByDate.set(dateKey, (downloadsByDate.get(dateKey) || 0) + 1)
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

    // Calculate totals
    const totalDownloads = Array.from(downloadsByDate.values()).reduce((a, b) => a + b, 0)

    // Calculate trends (compare last half to first half of period)
    const midPoint = Math.floor(downloads.length / 2)
    const firstHalfDownloads = downloads.slice(0, midPoint).reduce((sum, d) => sum + d.count, 0)
    const secondHalfDownloads = downloads.slice(midPoint).reduce((sum, d) => sum + d.count, 0)

    const downloadsTrend = firstHalfDownloads > 0 
      ? Math.round(((secondHalfDownloads - firstHalfDownloads) / firstHalfDownloads) * 100)
      : 0

    // Calculate weekly average
    const weeklyAverage = downloads.length >= 7 
      ? Math.round(downloads.slice(-7).reduce((sum, d) => sum + d.count, 0) / 7)
      : Math.round(totalDownloads / Math.max(downloads.length, 1))

    return NextResponse.json({
      downloads,
      totalDownloads,
      downloadsTrend,
      weeklyAverage,
    })
  } catch (error) {
    console.error('Downloads/Activations API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch downloads/activations data' },
      { status: 500 }
    )
  }
}
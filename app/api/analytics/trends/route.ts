import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { dateRange = '30d', productType } = await request.json()
    
    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    let groupBy = 'day'
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        groupBy = 'day'
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        groupBy = 'day'
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        groupBy = 'week'
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        groupBy = 'month'
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Build where clause
    let whereClause: any = {
      timestamp: { gte: startDate }
    }

    if (!auth.isMaster) {
      // For individual users, filter by their site_key
      const userLicense = await prisma.license.findUnique({
        where: { licenseKey: auth.licenseKey },
        select: { siteKey: true }
      })
      if (userLicense?.siteKey) {
        whereClause.siteKey = userLicense.siteKey
      }
    } else if (productType) {
      // For master admin, filter by product type if specified
      const licensesWithProduct = await prisma.license.findMany({
        where: { 
          products: { has: productType }
        },
        select: { siteKey: true }
      })
      const siteKeys = licensesWithProduct.map(l => l.siteKey).filter(Boolean)
      if (siteKeys.length > 0) {
        whereClause.siteKey = { in: siteKeys }
      }
    }

    // Get conversation logs with license info
    const logs = await prisma.chatbotLog.findMany({
      where: whereClause,
      select: {
        timestamp: true,
        sessionId: true,
        siteKey: true,
        license: {
          select: {
            licenseKey: true
          }
        }
      },
      orderBy: { timestamp: 'asc' }
    })

    // Group data by date/week/month
    const groupedData = new Map<string, Set<string>>()
    const sessionsByDate = new Map<string, Set<string>>()
    const licensesByDate = new Map<string, Set<string>>()

    logs.forEach(log => {
      if (!log.timestamp) return

      let dateKey: string
      const date = new Date(log.timestamp)
      
      if (groupBy === 'month') {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      } else if (groupBy === 'week') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        dateKey = weekStart.toISOString().split('T')[0]
      } else {
        dateKey = date.toISOString().split('T')[0]
      }

      // Track unique sessions per date
      if (!sessionsByDate.has(dateKey)) {
        sessionsByDate.set(dateKey, new Set())
      }
      sessionsByDate.get(dateKey)!.add(log.sessionId!)

      // Track unique licenses per date
      if (log.license?.licenseKey) {
        if (!licensesByDate.has(dateKey)) {
          licensesByDate.set(dateKey, new Set())
        }
        licensesByDate.get(dateKey)!.add(log.license.licenseKey)
      }
    })

    // Generate complete date range
    const dates: string[] = []
    const current = new Date(startDate)
    
    while (current <= now) {
      let dateKey: string
      
      if (groupBy === 'month') {
        dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
        dates.push(dateKey)
        current.setMonth(current.getMonth() + 1)
      } else if (groupBy === 'week') {
        const weekStart = new Date(current)
        weekStart.setDate(current.getDate() - current.getDay())
        dateKey = weekStart.toISOString().split('T')[0]
        if (!dates.includes(dateKey)) {
          dates.push(dateKey)
        }
        current.setDate(current.getDate() + 7)
      } else {
        dateKey = current.toISOString().split('T')[0]
        dates.push(dateKey)
        current.setDate(current.getDate() + 1)
      }
    }

    // Format data for chart
    const chartData = dates.map(date => {
      const sessions = sessionsByDate.get(date)?.size || 0
      const activeLicenses = licensesByDate.get(date)?.size || 0
      
      let label: string
      if (groupBy === 'month') {
        const [year, month] = date.split('-')
        const monthDate = new Date(parseInt(year), parseInt(month) - 1)
        label = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      } else if (groupBy === 'week') {
        const weekDate = new Date(date)
        label = `Week of ${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      } else {
        const dateObj = new Date(date + 'T00:00:00')
        label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }

      return {
        date,
        label,
        conversations: sessions,
        activeLicenses
      }
    })

    // Calculate summary statistics
    const totalConversations = Array.from(sessionsByDate.values()).reduce((sum, set) => sum + set.size, 0)
    const avgConversationsPerDay = Math.round(totalConversations / dates.length)
    const peakDay = chartData.reduce((max, day) => 
      day.conversations > max.conversations ? day : max, chartData[0])

    return NextResponse.json({
      chartData,
      summary: {
        totalConversations,
        avgConversationsPerDay,
        peakDay: peakDay?.label,
        peakConversations: peakDay?.conversations || 0,
        dateRange,
        groupBy
      }
    })

  } catch (error) {
    console.error('Analytics trends error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics trends' },
      { status: 500 }
    )
  }
}
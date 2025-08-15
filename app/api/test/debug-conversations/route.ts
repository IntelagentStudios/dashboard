import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const view = searchParams.get('view') || 'all'

    // Get the user's license and siteKey
    const userLicense = await prisma.license.findUnique({
      where: { licenseKey: auth.licenseKey },
      select: {
        licenseKey: true,
        siteKey: true,
        domain: true,
        customerName: true,
        products: true
      }
    })

    // Build the where clause as the main endpoint does
    let whereClause: any = {
      sessionId: { not: null }
    }
    
    // For non-master users
    if (!auth.isMaster) {
      if (!userLicense?.siteKey) {
        return NextResponse.json({
          debug: {
            auth: {
              licenseKey: auth.licenseKey,
              isMaster: auth.isMaster
            },
            userLicense: 'No siteKey found',
            message: 'User has no siteKey, should see no data',
            whereClause,
            resultCount: 0
          },
          sessions: []
        })
      }
      whereClause.siteKey = userLicense.siteKey
    }

    // Run the actual query
    const logs = await prisma.chatbotLog.findMany({
      where: whereClause,
      select: {
        sessionId: true,
        domain: true,
        siteKey: true,
        timestamp: true,
        role: true,
        content: true,
        customerMessage: true,
        chatbotResponse: true
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    })

    // Group by session to see what's being returned
    const sessionMap = new Map()
    logs.forEach(log => {
      if (!sessionMap.has(log.sessionId)) {
        sessionMap.set(log.sessionId, {
          sessionId: log.sessionId,
          domain: log.domain || 'Unknown',
          siteKey: log.siteKey || 'NULL',
          messageCount: 0,
          firstMessage: log.timestamp
        })
      }
      sessionMap.get(log.sessionId).messageCount++
    })

    // Get count of records that match vs don't match the user's siteKey
    let matchingSiteKey = 0
    let differentSiteKey = 0
    let nullSiteKey = 0
    
    logs.forEach(log => {
      if (!log.siteKey) {
        nullSiteKey++
      } else if (log.siteKey === userLicense?.siteKey) {
        matchingSiteKey++
      } else {
        differentSiteKey++
      }
    })

    // Also check what happens without any filtering
    const unfilteredCount = await prisma.chatbotLog.count({
      where: { sessionId: { not: null } }
    })

    // Check distinct siteKeys in results
    const distinctSiteKeys = new Set(logs.map(l => l.siteKey).filter(Boolean))

    return NextResponse.json({
      debug: {
        auth: {
          licenseKey: auth.licenseKey,
          isMaster: auth.isMaster,
          domain: auth.domain
        },
        userLicense: {
          hasLicense: !!userLicense,
          siteKey: userLicense?.siteKey || 'NULL',
          domain: userLicense?.domain,
          products: userLicense?.products
        },
        whereClause,
        query: {
          totalRecordsFound: logs.length,
          totalSessionsFound: sessionMap.size,
          unfilteredTotalInDB: unfilteredCount,
          matchingSiteKey,
          differentSiteKey,
          nullSiteKey,
          distinctSiteKeysInResults: Array.from(distinctSiteKeys)
        }
      },
      sessions: Array.from(sessionMap.values()),
      sampleLogs: logs.slice(0, 5).map(log => ({
        sessionId: log.sessionId,
        siteKey: log.siteKey || 'NULL',
        domain: log.domain || 'NULL',
        hasContent: !!(log.content || log.customerMessage || log.chatbotResponse),
        role: log.role
      }))
    })
  } catch (error) {
    console.error('Debug conversations error:', error)
    return NextResponse.json({
      error: 'Failed to debug conversations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the user's license details
    const userLicense = await prisma.license.findUnique({
      where: { licenseKey: auth.licenseKey },
      select: {
        licenseKey: true,
        siteKey: true,
        domain: true,
        customerName: true,
        products: true,
        status: true,
        createdAt: true
      }
    })

    // Check what data would be returned without filtering
    const unfiltered = await prisma.chatbotLog.groupBy({
      by: ['sessionId', 'siteKey', 'domain'],
      where: {
        sessionId: { not: null }
      },
      _count: true,
      take: 10,
      orderBy: {
        _count: {
          sessionId: 'desc'
        }
      }
    })

    // Check what data would be returned WITH siteKey filtering
    const filteredBySiteKey = userLicense?.siteKey ? 
      await prisma.chatbotLog.groupBy({
        by: ['sessionId', 'siteKey', 'domain'],
        where: {
          siteKey: userLicense.siteKey,
          sessionId: { not: null }
        },
        _count: true,
        take: 10,
        orderBy: {
          _count: {
            sessionId: 'desc'
          }
        }
      }) : []

    // Check for NULL siteKey records
    const nullSiteKeyRecords = await prisma.chatbotLog.count({
      where: {
        siteKey: null,
        sessionId: { not: null }
      }
    })

    // Get distinct siteKeys in the database
    const distinctSiteKeys = await prisma.chatbotLog.groupBy({
      by: ['siteKey'],
      _count: true,
      orderBy: {
        _count: {
          siteKey: 'desc'
        }
      }
    })

    return NextResponse.json({
      auth: {
        licenseKey: auth.licenseKey,
        domain: auth.domain,
        isMaster: auth.isMaster
      },
      userLicense: userLicense || 'No license found',
      analysis: {
        userHasSiteKey: !!userLicense?.siteKey,
        userSiteKey: userLicense?.siteKey || 'NULL',
        totalUnfilteredSessions: unfiltered.length,
        totalFilteredSessions: filteredBySiteKey.length,
        nullSiteKeyRecords,
        distinctSiteKeysCount: distinctSiteKeys.length
      },
      unfilteredSample: unfiltered.slice(0, 3).map(item => ({
        sessionId: item.sessionId,
        siteKey: item.siteKey || 'NULL',
        domain: item.domain || 'NULL',
        count: item._count
      })),
      filteredSample: filteredBySiteKey.slice(0, 3).map(item => ({
        sessionId: item.sessionId,
        siteKey: item.siteKey || 'NULL',
        domain: item.domain || 'NULL',
        count: item._count
      })),
      distinctSiteKeys: distinctSiteKeys.map(item => ({
        siteKey: item.siteKey || 'NULL',
        recordCount: item._count
      }))
    })
  } catch (error) {
    console.error('Debug user error:', error)
    return NextResponse.json({
      error: 'Failed to debug user data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
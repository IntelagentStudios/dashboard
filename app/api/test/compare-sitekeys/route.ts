import { NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get all unique siteKeys from licenses
    const licenses = await prisma.license.findMany({
      select: {
        licenseKey: true,
        siteKey: true,
        domain: true,
        customerName: true
      }
    })

    // Get all unique siteKeys from chatbot logs
    const chatbotSiteKeys = await prisma.chatbotLog.groupBy({
      by: ['siteKey'],
      _count: true,
      orderBy: {
        _count: {
          siteKey: 'desc'
        }
      }
    })

    // Find the current user's license
    const currentUserLicense = licenses.find(l => l.licenseKey === auth.licenseKey)

    // Check for case sensitivity issues
    const siteKeyComparisons = []
    if (currentUserLicense?.siteKey) {
      const userSiteKey = currentUserLicense.siteKey
      
      // Check exact matches
      const exactMatches = chatbotSiteKeys.filter(c => c.siteKey === userSiteKey)
      
      // Check case-insensitive matches
      const caseInsensitiveMatches = chatbotSiteKeys.filter(c => 
        c.siteKey?.toLowerCase() === userSiteKey.toLowerCase()
      )
      
      // Check partial matches
      const partialMatches = chatbotSiteKeys.filter(c => 
        c.siteKey?.includes(userSiteKey) || userSiteKey.includes(c.siteKey || '')
      )

      siteKeyComparisons.push({
        userSiteKey,
        exactMatches: exactMatches.length,
        caseInsensitiveMatches: caseInsensitiveMatches.length,
        partialMatches: partialMatches.length,
        exactMatchRecords: exactMatches[0]?._count || 0
      })
    }

    // Map licenses to their chatbot log counts
    const licenseMapping = licenses.map(license => {
      const chatbotData = chatbotSiteKeys.find(c => c.siteKey === license.siteKey)
      return {
        licenseKey: auth.isMaster ? license.licenseKey : (license.licenseKey === auth.licenseKey ? license.licenseKey : 'HIDDEN'),
        domain: license.domain,
        siteKey: license.siteKey,
        chatbotLogCount: chatbotData?._count || 0,
        isCurrentUser: license.licenseKey === auth.licenseKey
      }
    })

    // Find orphaned siteKeys (in chatbot logs but not in licenses)
    const licenseSiteKeys = new Set(licenses.map(l => l.siteKey).filter(Boolean))
    const orphanedSiteKeys = chatbotSiteKeys.filter(c => 
      c.siteKey && !licenseSiteKeys.has(c.siteKey)
    )

    return NextResponse.json({
      currentUser: {
        licenseKey: auth.licenseKey,
        isMaster: auth.isMaster,
        license: currentUserLicense || 'Not found',
        siteKeyComparisons
      },
      summary: {
        totalLicenses: licenses.length,
        licensesWithSiteKey: licenses.filter(l => l.siteKey).length,
        uniqueChatbotSiteKeys: chatbotSiteKeys.length,
        nullSiteKeyRecords: chatbotSiteKeys.find(c => !c.siteKey)?._count || 0,
        orphanedSiteKeys: orphanedSiteKeys.length
      },
      licenseMapping: auth.isMaster ? licenseMapping : licenseMapping.filter(l => l.isCurrentUser),
      chatbotSiteKeys: auth.isMaster ? 
        chatbotSiteKeys.slice(0, 10).map(c => ({
          siteKey: c.siteKey || 'NULL',
          recordCount: c._count
        })) : 
        chatbotSiteKeys.filter(c => c.siteKey === currentUserLicense?.siteKey).map(c => ({
          siteKey: c.siteKey || 'NULL',
          recordCount: c._count
        })),
      orphanedSiteKeys: auth.isMaster ? orphanedSiteKeys.slice(0, 5) : []
    })
  } catch (error) {
    console.error('Compare siteKeys error:', error)
    return NextResponse.json({
      error: 'Failed to compare siteKeys',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
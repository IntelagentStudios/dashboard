import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Temporary endpoint to check recent chatbot logs with new structure
export async function GET() {
  try {
    // Get the 10 most recent chatbot logs with license info
    const recentLogs = await prisma.chatbotLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        id: true,
        sessionId: true,
        domain: true,
        siteKey: true,
        customerMessage: true,
        chatbotResponse: true,
        timestamp: true,
        userId: true,
        conversationId: true,
        role: true,
        content: true,
        createdAt: true,
        license: {
          select: {
            licenseKey: true,
            domain: true,
            customerName: true,
            products: true
          }
        }
      }
    })

    // Check for NULL values in critical fields
    const nullChecks = {
      totalLogs: recentLogs.length,
      logsWithNullDomain: recentLogs.filter(log => !log.domain && !log.license?.domain).length,
      logsWithNullSiteKey: recentLogs.filter(log => !log.siteKey).length,
      logsWithNullSession: recentLogs.filter(log => !log.sessionId).length,
      logsWithContent: recentLogs.filter(log => log.customerMessage || log.chatbotResponse || log.content).length,
      logsWithLicense: recentLogs.filter(log => log.license).length
    }

    // Get unique domains, site_keys and products
    const uniqueDomains = Array.from(new Set(
      recentLogs.map(log => log.domain || log.license?.domain).filter(Boolean)
    ))
    const uniqueSiteKeys = Array.from(new Set(
      recentLogs.map(log => log.siteKey).filter(Boolean)
    ))
    const allProducts = new Set<string>()
    recentLogs.forEach(log => {
      if (log.license?.products) {
        log.license.products.forEach(p => allProducts.add(p))
      }
    })

    // Format logs for easier reading
    const formattedLogs = recentLogs.map(log => ({
      id: log.id,
      sessionId: log.sessionId || 'NULL',
      domain: log.domain || log.license?.domain || 'NULL',
      siteKey: log.siteKey || 'NULL',
      licenseKey: log.license?.licenseKey || 'Not linked',
      customerName: log.license?.customerName || 'Unknown',
      products: log.license?.products || [],
      message: log.customerMessage || log.chatbotResponse || log.content || 'No content',
      role: log.role || (log.customerMessage ? 'user' : log.chatbotResponse ? 'assistant' : 'unknown'),
      timestamp: log.timestamp?.toISOString() || log.createdAt?.toISOString() || 'No timestamp',
      userId: log.userId || 'anonymous'
    }))

    // Test JOIN functionality
    const testJoin = await prisma.chatbotLog.findFirst({
      where: {
        siteKey: { not: null }
      },
      include: {
        license: true
      }
    })

    return NextResponse.json({
      summary: {
        ...nullChecks,
        uniqueDomains,
        uniqueSiteKeys,
        uniqueProducts: Array.from(allProducts),
        mostRecentLog: formattedLogs[0] ? {
          timestamp: formattedLogs[0].timestamp,
          domain: formattedLogs[0].domain,
          siteKey: formattedLogs[0].siteKey,
          hasContent: formattedLogs[0].message !== 'No content',
          isLinkedToLicense: formattedLogs[0].licenseKey !== 'Not linked'
        } : null
      },
      joinTest: {
        success: !!testJoin,
        hasLicense: !!testJoin?.license,
        licenseDomain: testJoin?.license?.domain,
        licenseProducts: testJoin?.license?.products
      },
      recentLogs: formattedLogs
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Error checking logs:', error)
    return NextResponse.json({
      error: 'Failed to check logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
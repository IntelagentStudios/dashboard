import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Temporary endpoint to check recent chatbot logs
export async function GET() {
  try {
    // Get the 10 most recent chatbot logs
    const recentLogs = await prisma.chatbotLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        id: true,
        sessionId: true,
        domain: true,
        licenseKey: true,
        customerMessage: true,
        chatbotResponse: true,
        timestamp: true,
        userId: true,
        conversationId: true,
        role: true,
        content: true,
        createdAt: true
      }
    })

    // Check for NULL values in critical fields
    const nullChecks = {
      totalLogs: recentLogs.length,
      logsWithNullDomain: recentLogs.filter(log => !log.domain).length,
      logsWithNullLicense: recentLogs.filter(log => !log.licenseKey).length,
      logsWithNullSession: recentLogs.filter(log => !log.sessionId).length,
      logsWithContent: recentLogs.filter(log => log.customerMessage || log.chatbotResponse || log.content).length
    }

    // Get unique domains and licenses
    const uniqueDomains = [...new Set(recentLogs.map(log => log.domain).filter(Boolean))]
    const uniqueLicenses = [...new Set(recentLogs.map(log => log.licenseKey).filter(Boolean))]

    // Format logs for easier reading
    const formattedLogs = recentLogs.map(log => ({
      id: log.id,
      sessionId: log.sessionId || 'NULL',
      domain: log.domain || 'NULL',
      licenseKey: log.licenseKey || 'NULL',
      message: log.customerMessage || log.chatbotResponse || log.content || 'No content',
      role: log.role || (log.customerMessage ? 'user' : log.chatbotResponse ? 'assistant' : 'unknown'),
      timestamp: log.timestamp?.toISOString() || log.createdAt?.toISOString() || 'No timestamp',
      userId: log.userId || 'anonymous'
    }))

    return NextResponse.json({
      summary: {
        ...nullChecks,
        uniqueDomains,
        uniqueLicenses,
        mostRecentLog: formattedLogs[0] ? {
          timestamp: formattedLogs[0].timestamp,
          domain: formattedLogs[0].domain,
          hasContent: formattedLogs[0].message !== 'No content'
        } : null
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
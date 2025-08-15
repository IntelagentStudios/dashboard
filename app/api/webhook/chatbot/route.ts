import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Webhook endpoint for receiving chatbot conversation data from N8N
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields (only session_id is truly required now)
    if (!data.session_id) {
      return NextResponse.json(
        { error: 'Missing required field: session_id' },
        { status: 400 }
      )
    }

    // If site_key is provided, validate it
    let license = null
    if (data.site_key) {
      license = await prisma.license.findUnique({
        where: { siteKey: data.site_key },
        select: {
          licenseKey: true,
          siteKey: true,
          status: true,
          domain: true,
          customerName: true
        }
      })

      // Log warning if license not found but don't reject the webhook
      if (!license) {
        console.warn(`Invalid site_key received: ${data.site_key}`)
      } else if (license.status !== 'active' && license.status !== 'trial') {
        console.warn(`Inactive license used: ${data.site_key} (status: ${license.status})`)
      }
    }

    // Prepare the chatbot log entry
    const chatbotLogData = {
      sessionId: data.session_id,
      siteKey: data.site_key || null,
      domain: data.domain || license?.domain || null,
      userId: data.user_id || null,
      conversationId: data.conversation_id || data.session_id,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      role: data.role || (data.customer_message ? 'user' : 'assistant'),
      intentDetected: data.intent_detected || null,
      
      // Handle message content based on role or explicit fields
      customerMessage: data.role === 'user' ? data.content : data.customer_message || null,
      chatbotResponse: data.role === 'assistant' ? data.content : data.chatbot_response || null,
      content: data.content || data.customer_message || data.chatbot_response || null
    }

    // Store the chatbot log
    const log = await prisma.chatbotLog.create({
      data: chatbotLogData
    })

    // Update license last activity if we have a valid site_key
    if (data.site_key && license) {
      const lastHour = new Date(Date.now() - 60 * 60 * 1000)
      const recentActivity = await prisma.chatbotLog.findFirst({
        where: {
          siteKey: data.site_key,
          sessionId: data.session_id,
          timestamp: { gte: lastHour }
        },
        orderBy: { timestamp: 'desc' }
      })

      if (!recentActivity || recentActivity.id === log.id) {
        // This is either the first message or a new session
        await prisma.license.update({
          where: { siteKey: data.site_key },
          data: {
            usedAt: new Date()
          }
        })
      }
    }

    // Calculate session statistics for response
    const sessionStats = await prisma.chatbotLog.groupBy({
      by: ['sessionId'],
      where: {
        sessionId: data.session_id,
        ...(data.site_key ? { siteKey: data.site_key } : {})
      },
      _count: { id: true },
      _min: { timestamp: true },
      _max: { timestamp: true }
    })

    const stats = sessionStats[0] || { _count: { id: 1 }, _min: { timestamp: new Date() }, _max: { timestamp: new Date() } }
    const duration = stats._max.timestamp && stats._min.timestamp 
      ? Math.round((stats._max.timestamp.getTime() - stats._min.timestamp.getTime()) / 1000)
      : 0

    return NextResponse.json({
      success: true,
      logId: log.id,
      session: {
        sessionId: data.session_id,
        messageCount: stats._count.id,
        duration,
        domain: chatbotLogData.domain
      }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    
    // Check if it's a Prisma error
    if (error instanceof Error) {
      if (error.message.includes('P2002')) {
        return NextResponse.json(
          { error: 'Duplicate entry detected' },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process webhook data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint for testing webhook status
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhook/chatbot',
    accepts: 'POST',
    fields: {
      required: ['session_id'],
      optional: [
        'site_key',
        'domain',
        'user_id', 
        'customer_message',
        'chatbot_response',
        'content',
        'intent_detected',
        'timestamp',
        'conversation_id',
        'role'
      ]
    },
    note: 'This endpoint now uses site_key instead of license_key to link conversations to licenses'
  })
}
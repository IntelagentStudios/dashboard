import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Webhook endpoint for receiving chatbot conversation data from N8N
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    const requiredFields = ['session_id', 'license_key']
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate license key exists and is active
    const license = await prisma.license.findUnique({
      where: { licenseKey: data.license_key },
      select: {
        licenseKey: true,
        status: true,
        domain: true,
        customerName: true
      }
    })

    if (!license) {
      return NextResponse.json(
        { error: 'Invalid license key' },
        { status: 401 }
      )
    }

    if (license.status !== 'active' && license.status !== 'trial') {
      return NextResponse.json(
        { error: 'License is not active' },
        { status: 403 }
      )
    }

    // Prepare the chatbot log entry
    const chatbotLogData = {
      sessionId: data.session_id,
      domain: data.domain || license.domain || 'Unknown',
      licenseKey: data.license_key,
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

    // Update license last activity if this is a new session or recent activity
    const lastHour = new Date(Date.now() - 60 * 60 * 1000)
    const recentActivity = await prisma.chatbotLog.findFirst({
      where: {
        licenseKey: data.license_key,
        sessionId: data.session_id,
        timestamp: { gte: lastHour }
      },
      orderBy: { timestamp: 'desc' }
    })

    if (!recentActivity || recentActivity.id === log.id) {
      // This is either the first message or a new session
      await prisma.license.update({
        where: { licenseKey: data.license_key },
        data: {
          usedAt: new Date()
        }
      })
    }

    // Calculate session statistics for response
    const sessionStats = await prisma.chatbotLog.groupBy({
      by: ['sessionId'],
      where: {
        sessionId: data.session_id,
        licenseKey: data.license_key
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
      required: ['session_id', 'license_key'],
      optional: [
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
    }
  })
}
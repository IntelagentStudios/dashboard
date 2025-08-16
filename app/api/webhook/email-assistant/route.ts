import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.site_key || !data.email_id) {
      return NextResponse.json(
        { error: 'Missing required fields: site_key and email_id' },
        { status: 400 }
      )
    }

    // Get license info if site_key provided
    let license = null
    if (data.site_key) {
      license = await prisma.license.findUnique({
        where: { siteKey: data.site_key },
        select: { domain: true, customerName: true }
      })
    }

    // Create email assistant log
    const emailLog = await prisma.emailAssistantLog.create({
      data: {
        sessionId: data.session_id || null,
        siteKey: data.site_key,
        domain: data.domain || license?.domain || null,
        userId: data.user_id || null,
        emailId: data.email_id,
        subject: data.subject || null,
        sender: data.sender || null,
        recipient: data.recipient || null,
        action: data.action || null,
        aiSuggestion: data.ai_suggestion || null,
        userResponse: data.user_response || null,
        sentiment: data.sentiment || null,
        priority: data.priority || null,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
      }
    })

    return NextResponse.json({
      success: true,
      id: emailLog.id,
      message: 'Email assistant log created successfully'
    })
    
  } catch (error) {
    console.error('Email assistant webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process email assistant data' },
      { status: 500 }
    )
  }
}
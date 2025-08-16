import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// NOTE: This endpoint requires the EmailAssistantLog table to be added to your database
// See prisma/schema-new-products.prisma for the schema
// Run: npx prisma migrate dev --name add-email-assistant

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
    // Uncomment when EmailAssistantLog table is added to database
    /* const emailLog = await prisma.emailAssistantLog.create({
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
    }) */

    // For now, just acknowledge receipt until table is created
    return NextResponse.json({
      success: true,
      message: 'Email assistant webhook received (table not yet created)',
      data: {
        email_id: data.email_id,
        site_key: data.site_key
      }
    })
    
  } catch (error) {
    console.error('Email assistant webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process email assistant data' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// NOTE: This endpoint requires the VoiceAssistantLog table to be added to your database
// See prisma/schema-new-products.prisma for the schema
// Run: npx prisma migrate dev --name add-voice-assistant

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.site_key || !data.call_id) {
      return NextResponse.json(
        { error: 'Missing required fields: site_key and call_id' },
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

    // Create voice assistant log
    // Uncomment when VoiceAssistantLog table is added to database
    /* const voiceLog = await prisma.voiceAssistantLog.create({
      data: {
        sessionId: data.session_id || null,
        siteKey: data.site_key,
        domain: data.domain || license?.domain || null,
        userId: data.user_id || null,
        callId: data.call_id,
        phoneNumber: data.phone_number || null,
        direction: data.direction || 'inbound',
        duration: data.duration || null,
        transcript: data.transcript || null,
        intent: data.intent || null,
        resolution: data.resolution || null,
        transferredTo: data.transferred_to || null,
        recordingUrl: data.recording_url || null,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
      }
    }) */

    // For now, just acknowledge receipt until table is created
    return NextResponse.json({
      success: true,
      message: 'Voice assistant webhook received (table not yet created)',
      data: {
        call_id: data.call_id,
        site_key: data.site_key
      }
    })
    
  } catch (error) {
    console.error('Voice assistant webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process voice assistant data' },
      { status: 500 }
    )
  }
}
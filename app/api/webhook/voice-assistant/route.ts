import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
    const voiceLog = await prisma.voiceAssistantLog.create({
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
    })

    return NextResponse.json({
      success: true,
      id: voiceLog.id,
      message: 'Voice assistant log created successfully'
    })
    
  } catch (error) {
    console.error('Voice assistant webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process voice assistant data' },
      { status: 500 }
    )
  }
}
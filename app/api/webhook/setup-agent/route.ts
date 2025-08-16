import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.site_key || !data.session_id) {
      return NextResponse.json(
        { error: 'Missing required fields: site_key and session_id' },
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

    // Create setup agent log
    const setupLog = await prisma.setupAgentLog.create({
      data: {
        sessionId: data.session_id,
        siteKey: data.site_key,
        domain: data.domain || license?.domain || null,
        userId: data.user_id || null,
        setupType: data.setup_type || null,
        stepCompleted: data.step_completed || null,
        configuration: data.configuration || null,
        status: data.status || 'in_progress',
        errorMessage: data.error_message || null,
        duration: data.duration || null,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
      }
    })

    return NextResponse.json({
      success: true,
      id: setupLog.id,
      message: 'Setup agent log created successfully'
    })
    
  } catch (error) {
    console.error('Setup agent webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process setup agent data' },
      { status: 500 }
    )
  }
}
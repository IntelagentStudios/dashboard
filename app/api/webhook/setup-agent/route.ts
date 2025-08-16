import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// NOTE: This endpoint requires the SetupAgentLog table to be added to your database
// See prisma/schema-new-products.prisma for the schema
// Run: npx prisma migrate dev --name add-setup-agent

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
    // Uncomment when SetupAgentLog table is added to database
    /* const setupLog = await prisma.setupAgentLog.create({
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
    }) */

    // For now, just acknowledge receipt until table is created
    return NextResponse.json({
      success: true,
      message: 'Setup agent webhook received (table not yet created)',
      data: {
        session_id: data.session_id,
        site_key: data.site_key
      }
    })
    
  } catch (error) {
    console.error('Setup agent webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process setup agent data' },
      { status: 500 }
    )
  }
}
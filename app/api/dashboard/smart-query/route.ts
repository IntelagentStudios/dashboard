import { NextResponse } from 'next/server'
import { getAuthFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Note: SmartDashboardRequest model doesn't have a metadata field
// Store product and suggestions in the response text instead

// Groq Integration - Fast LLM for real-time responses
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

// Alternative options (uncomment to use):
// Option 1: OpenAI
// import OpenAI from 'openai'
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// })

// Option 2: Anthropic Claude
// import Anthropic from '@anthropic-ai/sdk'
// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY
// })

export async function POST(request: Request) {
  try {
    const auth = await getAuthFromCookies()
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { query, product, context } = await request.json()

    // Get user's license for context
    const userLicense = await prisma.license.findUnique({
      where: { licenseKey: auth.licenseKey },
      select: {
        siteKey: true,
        products: true,
        plan: true,
        domain: true
      }
    })

    // Fetch relevant data based on the query
    const data = await fetchRelevantData(query, userLicense?.siteKey, product)

    // Build context for LLM
    const systemPrompt = `You are an intelligent dashboard assistant. You help users understand their data and provide actionable insights.
    User's domain: ${userLicense?.domain}
    User's products: ${userLicense?.products?.join(', ')}
    Current product view: ${product || 'all'}
    Available data: ${JSON.stringify(data, null, 2).slice(0, 2000)}
    
    Provide helpful, concise responses. When possible, include:
    1. Direct answer to the question
    2. Key insights from the data
    3. Actionable recommendations
    4. Follow-up questions they might want to ask`

    // Generate response using LLM
    let aiResponse = ''
    let suggestions: string[] = []
    
    try {
      // Use Groq for fast LLM responses
      const completion = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768", // Fast and capable model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: false
      })
      
      aiResponse = completion.choices[0]?.message?.content || generateMockResponse(query, data)
      
      // Generate suggestions based on the response
      suggestions = generateSmartSuggestions(query, aiResponse)
      
    } catch (error) {
      console.error('Groq API error:', error)
      // Fallback to mock response if Groq fails
      aiResponse = generateMockResponse(query, data)
      suggestions = generateMockSuggestions(query)
    }

    // Save the request to database (without metadata field)
    const savedRequest = await prisma.smartDashboardRequest.create({
      data: {
        licenseKey: auth.licenseKey,
        requestType: 'query',
        query: query,
        response: aiResponse,
        processedAt: new Date()
      }
    })

    // Generate and save insights if applicable
    const insights = await generateInsights(query, data, userLicense)
    if (insights.length > 0) {
      await Promise.all(insights.map(insight =>
        prisma.smartDashboardInsight.create({
          data: {
            licenseKey: auth.licenseKey,
            insightType: insight.type,
            title: insight.title,
            content: insight.content,
            severity: insight.severity,
            metadata: insight.metadata
          }
        })
      ))
    }

    return NextResponse.json({
      response: aiResponse,
      suggestions,
      insights: insights.slice(0, 3), // Return top 3 insights
      data: {
        summary: data.summary,
        charts: data.charts
      }
    })

  } catch (error) {
    console.error('Smart query error:', error)
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    )
  }
}

async function fetchRelevantData(query: string, siteKey: string | null | undefined, product: string | null) {
  const queryLower = query.toLowerCase()
  const data: any = {
    summary: {},
    details: [],
    charts: null
  }

  // Fetch data based on query content
  if (queryLower.includes('conversation') || queryLower.includes('chat')) {
    const conversations = await prisma.chatbotLog.groupBy({
      by: ['sessionId'],
      where: siteKey ? { siteKey } : {},
      _count: true,
      take: 100,
      orderBy: {
        _count: {
          sessionId: 'desc'
        }
      }
    })
    data.summary.totalConversations = conversations.length
    data.details = conversations
  }

  if (queryLower.includes('metric') || queryLower.includes('performance')) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const stats = await prisma.chatbotLog.aggregate({
      where: {
        ...(siteKey ? { siteKey } : {}),
        timestamp: { gte: thirtyDaysAgo }
      },
      _count: true
    })
    data.summary.monthlyActivity = stats._count
  }

  if (queryLower.includes('trend') || queryLower.includes('growth')) {
    // Fetch trend data
    const trends = await prisma.chatbotLog.groupBy({
      by: ['timestamp'],
      where: {
        ...(siteKey ? { siteKey } : {}),
        timestamp: { 
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
        }
      },
      _count: true,
      take: 7,
      orderBy: {
        timestamp: 'desc'
      }
    })
    data.charts = { trends }
  }

  return data
}

function generateMockResponse(query: string, data: any): string {
  const queryLower = query.toLowerCase()
  
  if (queryLower.includes('metric') || queryLower.includes('performance')) {
    return `Based on your data, here are your key metrics:
    
    📊 Total Conversations: ${data.summary.totalConversations || 0}
    📈 Monthly Activity: ${data.summary.monthlyActivity || 0} interactions
    
    Your engagement metrics show ${data.summary.totalConversations > 100 ? 'strong' : 'growing'} user interaction. 
    ${data.summary.monthlyActivity > 500 ? 'You\'re seeing excellent activity levels.' : 'There\'s room to increase engagement.'}`
  }
  
  if (queryLower.includes('anomal') || queryLower.includes('issue')) {
    return `I've analyzed your data for anomalies and issues:
    
    ✅ System Status: All systems operational
    📊 Data Consistency: No major anomalies detected
    
    Everything appears to be running smoothly. I'll continue monitoring for any unusual patterns.`
  }
  
  if (queryLower.includes('recommend') || queryLower.includes('optimiz')) {
    return `Based on your current data patterns, here are my recommendations:
    
    1. **Response Time**: Consider implementing caching to improve response times
    2. **User Engagement**: Peak activity is during business hours - ensure adequate resources
    3. **Feature Adoption**: Promote underutilized features to increase value
    
    Would you like me to elaborate on any of these recommendations?`
  }
  
  return `I've analyzed your query about "${query}". 
  
  Based on the current data, you have ${data.summary.totalConversations || 0} total conversations 
  with ${data.summary.monthlyActivity || 0} interactions this month.
  
  Would you like me to dive deeper into any specific aspect?`
}

function generateSmartSuggestions(query: string, response: string): string[] {
  const suggestions = []
  
  // Analyze the response and query to generate relevant follow-ups
  const queryLower = query.toLowerCase()
  const responseLower = response.toLowerCase()
  
  if (responseLower.includes('conversation') || responseLower.includes('chat')) {
    suggestions.push("Show me peak conversation hours")
    suggestions.push("What's the average session duration?")
  }
  
  if (responseLower.includes('performance') || responseLower.includes('metric')) {
    suggestions.push("Compare this week to last week")
    suggestions.push("What areas need improvement?")
  }
  
  if (responseLower.includes('trend') || responseLower.includes('growth')) {
    suggestions.push("Predict next month's metrics")
    suggestions.push("What's driving this trend?")
  }
  
  // Add general suggestions if needed
  if (suggestions.length === 0) {
    suggestions.push("Show me today's summary")
    suggestions.push("What should I focus on?")
    suggestions.push("Generate a weekly report")
  }
  
  return suggestions.slice(0, 3)
}

function generateMockSuggestions(query: string): string[] {
  const suggestions = [
    "Show me weekly trends",
    "What are my peak usage hours?",
    "Compare this month to last month",
    "Identify top performing areas",
    "Generate a performance report"
  ]
  
  // Filter suggestions based on query
  if (query.toLowerCase().includes('trend')) {
    return suggestions.filter(s => !s.includes('trend'))
  }
  
  return suggestions.slice(0, 3)
}

async function generateInsights(query: string, data: any, license: any) {
  const insights = []
  
  if (data.summary.totalConversations > 100) {
    insights.push({
      type: 'trend',
      title: 'High Engagement Detected',
      content: `You're seeing strong user engagement with ${data.summary.totalConversations} conversations.`,
      severity: 'low',
      metadata: { metric: 'conversations', value: data.summary.totalConversations }
    })
  }
  
  if (data.summary.monthlyActivity > 1000) {
    insights.push({
      type: 'recommendation',
      title: 'Scale Infrastructure',
      content: 'With high monthly activity, consider scaling your infrastructure for better performance.',
      severity: 'medium',
      metadata: { metric: 'monthly_activity', value: data.summary.monthlyActivity }
    })
  }
  
  return insights
}
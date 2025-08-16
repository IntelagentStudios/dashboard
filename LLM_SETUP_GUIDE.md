# Smart Dashboard LLM Integration Guide

## Overview
The Smart Dashboard is now integrated and ready to use with an LLM (Large Language Model). You can choose between OpenAI's GPT-4 or Anthropic's Claude.

## Current Status
✅ **Smart Dashboard UI** - Fully implemented
✅ **API Endpoints** - Ready for LLM integration
✅ **Database Tables** - SmartDashboardInsight and SmartDashboardRequest tables exist
✅ **Mock Responses** - Currently using mock responses for testing
⏳ **LLM Integration** - Ready to activate with API keys

## How to Enable LLM Integration

### Option 1: OpenAI (GPT-4)

1. **Get an API Key**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Install OpenAI SDK**
   ```bash
   npm install openai
   ```

3. **Add to Environment Variables**
   Add to your Railway environment or `.env.local`:
   ```
   OPENAI_API_KEY=sk-your-api-key-here
   ```

4. **Update the Code**
   In `/app/api/dashboard/smart-query/route.ts`, uncomment the OpenAI section:
   ```typescript
   import OpenAI from 'openai'
   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY
   })
   
   // In the POST function, uncomment:
   const completion = await openai.chat.completions.create({
     model: "gpt-4-turbo-preview",
     messages: [
       { role: "system", content: systemPrompt },
       { role: "user", content: query }
     ],
     temperature: 0.7,
     max_tokens: 500
   })
   aiResponse = completion.choices[0].message.content || ''
   ```

### Option 2: Anthropic Claude

1. **Get an API Key**
   - Go to https://console.anthropic.com/
   - Create an API key
   - Copy the key

2. **Install Anthropic SDK**
   ```bash
   npm install @anthropic-ai/sdk
   ```

3. **Add to Environment Variables**
   ```
   ANTHROPIC_API_KEY=your-api-key-here
   ```

4. **Update the Code**
   In `/app/api/dashboard/smart-query/route.ts`, uncomment the Anthropic section:
   ```typescript
   import Anthropic from '@anthropic-ai/sdk'
   const anthropic = new Anthropic({
     apiKey: process.env.ANTHROPIC_API_KEY
   })
   
   // In the POST function, uncomment:
   const completion = await anthropic.messages.create({
     model: "claude-3-sonnet-20240229",
     max_tokens: 500,
     temperature: 0.7,
     system: systemPrompt,
     messages: [{ role: "user", content: query }]
   })
   aiResponse = completion.content[0].text
   ```

## Features Available Now (Even Without LLM)

### 1. Smart Dashboard Interface
- Chat interface for queries
- Quick action buttons
- Insights display
- Query history

### 2. Mock Responses
The system currently provides intelligent mock responses for common queries:
- "What are my top performing metrics?"
- "Show me any anomalies or issues"
- "What optimizations do you recommend?"
- "Generate a performance report"

### 3. Data Analysis
The system already:
- Fetches relevant data based on queries
- Generates basic insights
- Tracks query history
- Stores insights in the database

## How the Smart Dashboard Works

1. **User asks a question** → Type in the chat interface
2. **System analyzes query** → Determines what data to fetch
3. **Fetches relevant data** → Gets conversations, metrics, trends
4. **LLM generates response** → Creates intelligent answer with insights
5. **Saves to database** → Stores query and insights for future reference
6. **Displays to user** → Shows response with suggestions and charts

## Example Queries to Try

Even with mock responses, try these queries:
- "What are my performance metrics?"
- "Show me conversation trends"
- "Any issues I should know about?"
- "How can I optimize my dashboard?"
- "Generate a weekly report"

## Cost Considerations

### OpenAI GPT-4
- ~$0.03 per 1K tokens (input)
- ~$0.06 per 1K tokens (output)
- Average query: ~$0.02-0.05

### Anthropic Claude
- ~$0.015 per 1K tokens (input)
- ~$0.075 per 1K tokens (output)
- Average query: ~$0.02-0.04

## Recommended Model

For dashboard analytics, we recommend:
- **OpenAI**: GPT-4-turbo for best performance
- **Anthropic**: Claude 3 Sonnet for balance of cost/performance

## Security Notes

1. **API Keys**: Never commit API keys to git
2. **Rate Limiting**: Consider adding rate limiting to prevent abuse
3. **User Permissions**: Smart Dashboard respects user's data permissions
4. **Data Privacy**: User data is only used for their own insights

## Troubleshooting

### "Failed to process query"
- Check API key is set correctly
- Verify SDK is installed
- Check Railway logs for specific error

### No response from LLM
- Check API key has credits/balance
- Verify network connectivity
- Check rate limits haven't been exceeded

### Insights not saving
- Check database connection
- Verify SmartDashboardInsight table exists
- Check write permissions

## Next Steps

1. Choose your LLM provider (OpenAI or Anthropic)
2. Get an API key
3. Install the SDK
4. Add API key to environment
5. Uncomment the relevant code
6. Deploy to Railway
7. Start using intelligent queries!

The Smart Dashboard is fully functional even without LLM integration, providing a great user experience with mock responses. Once you add an LLM, it becomes truly intelligent!
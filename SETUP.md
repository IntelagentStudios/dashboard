# Dashboard Setup Guide

## Quick Start

### 1. Database Configuration

Update your licenses to enable features:

```sql
-- Add products to licenses
UPDATE licenses 
SET products = '["chatbot"]' 
WHERE license_key = 'YOUR-LICENSE-KEY';

-- Enable premium features
UPDATE licenses 
SET plan = 'premium' 
WHERE license_key = 'PREMIUM-KEY';
```

### 2. Webhook Configuration

Configure N8N to send data to:
- **Chatbot**: `POST /api/webhook/chatbot`

Required fields:
```json
{
  "site_key": "your-site-key",
  "session_id": "session-123",
  "customer_message": "Hello",
  "chatbot_response": "Hi there!",
  "domain": "example.com"
}
```

### 3. Smart Dashboard AI (Optional)

To enable AI responses:

1. Add to environment variables:
   - `OPENAI_API_KEY=sk-...` OR
   - `ANTHROPIC_API_KEY=...`

2. Install SDK:
   - `npm install openai` OR
   - `npm install @anthropic-ai/sdk`

3. Uncomment code in `/app/api/dashboard/smart-query/route.ts`

## Features Available Now

✅ **Working Features:**
- License management
- Chatbot conversations & analytics
- Smart Dashboard (with mock AI)
- Product switcher (for multi-product users)
- Premium features (AI insights for premium plans)
- Real-time data updates
- Export functionality

## User Access

- **Master Admin**: Full access to all data
- **Individual Users**: Access to own data only
- **Premium Users**: AI insights & combined analytics

## Troubleshooting

- Check Railway logs for errors
- Verify site_key matches between webhook and license
- Use `/api/test/debug-user` to check authentication
- Ensure products array is set in database
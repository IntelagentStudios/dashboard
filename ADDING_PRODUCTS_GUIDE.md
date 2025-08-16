# Guide: Adding New Products to the Dashboard

## Overview
This guide explains how to add new products (Setup Agent, Email Assistant, Voice Assistant) to your dashboard.

## Step 1: Database Setup

### 1.1 Update Your Database Schema
Copy the models from `prisma/schema-new-products.prisma` into your main `prisma/schema.prisma` file.

### 1.2 Run Prisma Migration
```bash
npx prisma migrate dev --name add-new-products
npx prisma generate
```

## Step 2: Update License Records

### 2.1 Add Products to Licenses
Update your licenses to include the products array:

```sql
-- Single product
UPDATE licenses 
SET products = '["chatbot"]' 
WHERE license_key = 'YOUR-LICENSE-KEY';

-- Multiple products
UPDATE licenses 
SET products = '["chatbot", "email_assistant", "setup_agent"]' 
WHERE license_key = 'MULTI-PRODUCT-KEY';

-- All products
UPDATE licenses 
SET products = '["chatbot", "email_assistant", "setup_agent", "voice_assistant"]' 
WHERE license_key = 'ALL-PRODUCTS-KEY';
```

### 2.2 Set Premium Plans
Enable premium features for specific users:

```sql
-- Set premium plan
UPDATE licenses 
SET plan = 'premium' 
WHERE license_key = 'PREMIUM-USER-KEY';

-- Set enterprise plan
UPDATE licenses 
SET plan = 'enterprise' 
WHERE license_key = 'ENTERPRISE-USER-KEY';
```

## Step 3: Configure N8N Webhooks

### 3.1 Webhook Endpoints
Configure your N8N workflows to send data to these endpoints:

- **Chatbot**: `POST /api/webhook/chatbot`
- **Setup Agent**: `POST /api/webhook/setup-agent`
- **Email Assistant**: `POST /api/webhook/email-assistant`
- **Voice Assistant**: `POST /api/webhook/voice-assistant`

### 3.2 Required Fields for Each Product

#### Chatbot
```json
{
  "site_key": "YOUR_SITE_KEY",
  "session_id": "unique-session-id",
  "customer_message": "User's message",
  "chatbot_response": "Bot's response",
  "domain": "example.com",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Setup Agent
```json
{
  "site_key": "YOUR_SITE_KEY",
  "session_id": "unique-session-id",
  "setup_type": "wordpress_install",
  "step_completed": "database_configured",
  "status": "completed",
  "configuration": {},
  "duration": 120,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Email Assistant
```json
{
  "site_key": "YOUR_SITE_KEY",
  "email_id": "unique-email-id",
  "subject": "Email subject",
  "sender": "sender@example.com",
  "recipient": "recipient@example.com",
  "action": "replied",
  "ai_suggestion": "Suggested response",
  "sentiment": "positive",
  "priority": "high",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Voice Assistant
```json
{
  "site_key": "YOUR_SITE_KEY",
  "call_id": "unique-call-id",
  "phone_number": "+1234567890",
  "direction": "inbound",
  "duration": 180,
  "transcript": "Call transcript",
  "intent": "customer_support",
  "resolution": "resolved",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Step 4: Test the Integration

### 4.1 Test Individual Webhooks
Use curl or Postman to test each webhook:

```bash
curl -X POST http://your-domain.com/api/webhook/setup-agent \
  -H "Content-Type: application/json" \
  -d '{
    "site_key": "TEST_SITE_KEY",
    "session_id": "test-123",
    "setup_type": "test",
    "status": "completed"
  }'
```

### 4.2 Verify Data in Dashboard
1. Log in to the dashboard
2. If you have multiple products, you'll see the product switcher in the header
3. Switch between products to see their respective data
4. Premium users can select "All Products" to see combined data

## Step 5: Add Product-Specific Dashboard Components (Optional)

If you want custom views for each product, create new components:

1. Create `components/dashboard/setup-agent-view.tsx`
2. Create `components/dashboard/email-assistant-view.tsx`
3. Create `components/dashboard/voice-assistant-view.tsx`

Then update the dashboard to show these views when the respective product is selected.

## Troubleshooting

### Products Not Showing in Switcher
- Check that the license has products array populated
- Verify the user is logged in with the correct license key
- Check browser console for errors

### No Data Showing for Product
- Verify webhook is sending data with correct site_key
- Check that site_key in webhook matches license's site_key
- Look at webhook response for errors
- Check Railway logs for webhook errors

### Premium Features Not Working
- Ensure license plan is set to 'premium' or 'enterprise'
- Clear browser cache and reload
- Check browser console for premium validation errors

## Database Queries for Verification

```sql
-- Check license products and plan
SELECT license_key, products, plan, site_key 
FROM licenses 
WHERE license_key = 'YOUR-LICENSE-KEY';

-- Check chatbot logs
SELECT COUNT(*) as count, site_key 
FROM chatbot_logs 
GROUP BY site_key;

-- Check if setup agent logs exist
SELECT COUNT(*) as count, site_key 
FROM setup_agent_logs 
GROUP BY site_key;
```

## Support
For issues or questions:
1. Check Railway deployment logs
2. Use the debug endpoints: `/api/test/debug-user`, `/api/test/debug-conversations`
3. Check webhook responses for error messages
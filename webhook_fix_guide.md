# Webhook Configuration Fix Guide

## Problem
Your webhook is not working after deploying to Vercel because the webhook URL is pointing to the wrong endpoint.

## Solution Steps

### Step 1: Find Your Vercel Deployment URL
1. Go to your Vercel dashboard at https://vercel.com/dashboard
2. Find your project (likely named "silberarrows-uv" or similar)
3. Copy the deployment URL (e.g., `https://your-app-name.vercel.app`)

### Step 2: Check Current Webhook Configuration

Run this query in your Supabase SQL Editor:

```sql
-- Check current webhook configuration
SELECT 
    id,
    schema_name,
    table_name,
    webhook_url,
    webhook_method,
    webhook_headers,
    enabled_events,
    created_at,
    updated_at
FROM supabase_realtime.webhooks
WHERE table_name IN ('leads', 'cars', 'car_media')
ORDER BY created_at DESC;
```

### Step 3: Update Webhook URL

Based on the results above, update the webhook URL with your new Vercel deployment URL:

```sql
-- Update webhook URL (replace with your actual webhook ID and new URL)
UPDATE supabase_realtime.webhooks 
SET webhook_url = 'https://your-app-name.vercel.app/api/webhooks/supabase'
WHERE id = 'your-webhook-id';
```

### Step 4: Create New Webhook (if none exists)

If no webhooks exist, create a new one:

```sql
-- Create new webhook for leads table
INSERT INTO supabase_realtime.webhooks (
    schema_name,
    table_name,
    webhook_url,
    webhook_method,
    webhook_headers,
    enabled_events
) VALUES (
    'public',
    'leads',
    'https://your-app-name.vercel.app/api/webhooks/supabase',
    'POST',
    '{"Content-Type": "application/json"}',
    ARRAY['INSERT', 'UPDATE', 'DELETE']
);
```

### Step 5: Test the Webhook

1. Create a test lead in your application
2. Check the Vercel function logs to see if the webhook is being received
3. Monitor the Network tab in your browser's developer tools

### Common Issues and Solutions

1. **Wrong URL Format**: Make sure the webhook URL includes the correct path (e.g., `/api/webhooks/supabase`)
2. **HTTPS Required**: Vercel deployments use HTTPS, make sure your webhook URL starts with `https://`
3. **Headers**: Ensure the webhook headers include proper content-type

### Alternative: Using Supabase Dashboard

You can also configure webhooks through the Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to "Database" → "Webhooks"
3. Create or edit the webhook with your new Vercel URL

### Verification Commands

Run these to verify the webhook is working:

```sql
-- Check webhook status
SELECT * FROM supabase_realtime.webhooks WHERE table_name = 'leads';

-- Check recent webhook deliveries (if available)
SELECT * FROM supabase_realtime.webhook_deliveries ORDER BY created_at DESC LIMIT 10;
```

## Notes
- Replace `your-app-name.vercel.app` with your actual Vercel deployment URL
- Replace `your-webhook-id` with the actual webhook ID from Step 2
- Make sure your webhook endpoint exists in your application (`/api/webhooks/supabase`) 
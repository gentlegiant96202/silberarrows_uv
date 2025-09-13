# 🤖 Automated Daily Scraping Setup

This document explains how to set up automated daily scraping for 25 new leads every morning.

## 🔧 Setup Instructions

### 1. Environment Variables
Add to your `.env.local` file:
```
CRON_SECRET=your-secure-random-string-here-change-this-in-production
```

### 2. Database Setup
**Step 1**: Run the migration to add fields to your existing `scrape_jobs` table:
```sql
-- Run this in your Supabase SQL Editor
ALTER TABLE scrape_jobs 
ADD COLUMN IF NOT EXISTS search_url TEXT,
ADD COLUMN IF NOT EXISTS max_listings INTEGER DEFAULT 20;
```

**Step 2**: Create the `consignments` table if it doesn't exist:
```sql
-- Only run this if you don't have the consignments table yet
CREATE TABLE consignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'new_lead' CHECK (status IN ('new_lead', 'negotiation', 'pre_inspection', 'consigned_purchased', 'lost')),
    phone_number TEXT,
    vehicle_model TEXT,
    asking_price INTEGER,
    listing_url TEXT NOT NULL UNIQUE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

**Step 3**: Use the migration files provided:
- `database/scrape_jobs_migration.sql` - adds the required fields
- `database/test_migration.sql` - verifies the migration worked

### 3. Vercel Deployment
The `vercel.json` file is configured to run the scraper daily at 8:00 AM UTC:
```json
{
  "crons": [
    {
      "path": "/api/consignments/cron",
      "schedule": "0 8 * * *"
    }
  ]
}
```

### 4. Production Environment Variables
In your Vercel dashboard, add:
- `CRON_SECRET` - A secure random string
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

## 📅 Schedule Configuration

The cron schedule `0 8 * * *` means:
- `0` - 0 minutes
- `8` - 8th hour (8:00 AM)
- `*` - Every day of month
- `*` - Every month
- `*` - Every day of week

**Result**: Runs every day at 8:00 AM UTC

### Time Zone Conversion
- 8:00 AM UTC = 12:00 PM GST (Dubai time)
- To change the time, modify the schedule in `vercel.json`

## 🎯 Default Settings

The automated scraper is configured with:
- **Search URL**: Mercedes-Benz cars in Dubai
- **Max Leads**: 25 new leads per day
- **Filters**: 
  - Owner only (not dealers)
  - GCC specs (824, 827)
  - Petrol/Hybrid (380, 383)
  - Max 100,000 km
  - 2015-2026 models

## 🔄 How It Works

1. **Vercel Cron** triggers `/api/consignments/cron` at 8:00 AM UTC
2. **Cron endpoint** creates a new scrape job in the database
3. **Scraper starts** and finds car listings from all pages
4. **For each car**: visits page, clicks call button, extracts real phone number
5. **Duplicate check**: skips phones that already exist in database
6. **Saves results** to `consignments` table
7. **Updates job status** with progress and completion

## 📊 Monitoring

### Web Interface
- Visit `/consignments` to see scraped leads
- View job progress in real-time
- Check scrape history and statistics

### Database Queries
```sql
-- Check recent scrape jobs
SELECT * FROM scrape_jobs ORDER BY created_at DESC LIMIT 10;

-- Count new leads today
SELECT COUNT(*) FROM consignments WHERE created_at >= CURRENT_DATE;

-- View latest scraped leads
SELECT * FROM consignments ORDER BY created_at DESC LIMIT 25;
```

## 🛠️ Manual Testing

### Test the Cron Endpoint
```bash
curl -X POST http://localhost:3000/api/consignments/cron
```

### Test with Custom Settings
```bash
curl -X POST http://localhost:3000/api/consignments/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "searchUrl": "https://dubai.dubizzle.com/motors/used-cars/mercedes-benz/...",
    "maxListings": 5
  }'
```

## 🔒 Security

- **Cron Secret**: Protects the cron endpoint from unauthorized access
- **Environment Variables**: Sensitive data stored securely
- **Rate Limiting**: Built-in delays between requests
- **Duplicate Protection**: Prevents processing same listings multiple times

## 📈 Scaling

To increase daily leads:
1. Modify `maxLeads` in `/api/consignments/cron/route.ts`
2. Consider multiple cron jobs for different car brands
3. Add multiple search URLs for broader coverage

## 🚨 Troubleshooting

### Common Issues
1. **No leads found**: Check if search URL is still valid
2. **Browser errors**: Playwright might need browser updates
3. **Database errors**: Check Supabase connection and table schema
4. **Timeout errors**: Increase timeout values in scraper

### Logs
- Check Vercel function logs for cron job execution
- Monitor browser console for scraping errors
- Check database for job status and error messages

## 📋 Maintenance

### Weekly Tasks
- Review scrape job success rates
- Check for duplicate phone numbers
- Update search URLs if needed
- Monitor Vercel function usage

### Monthly Tasks
- Clean up old scrape job records
- Review and optimize scraper selectors
- Update browser automation if Dubizzle changes
- Analyze lead quality and conversion rates 
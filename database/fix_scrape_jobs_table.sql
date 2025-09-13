-- Fix scrape_jobs table and resolve aggregate function error
-- Run this in your Supabase SQL Editor

-- First, let's check the current table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'scrape_jobs' 
ORDER BY ordinal_position;

-- Check if the table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'scrape_jobs'
);

-- Create the scrape_jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'queued',
    total INTEGER DEFAULT 0,
    processed INTEGER DEFAULT 0,
    successful_leads INTEGER DEFAULT 0,
    search_url TEXT,
    max_listings INTEGER DEFAULT 20,
    log TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add missing columns if they don't exist
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS successful_leads INTEGER DEFAULT 0;
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS search_url TEXT;
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS max_listings INTEGER DEFAULT 20;
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_at ON scrape_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_successful_leads ON scrape_jobs(successful_leads);

-- Add comments for documentation
COMMENT ON TABLE scrape_jobs IS 'Tracks scraping job progress and configuration';
COMMENT ON COLUMN scrape_jobs.successful_leads IS 'Number of successful leads found (leads with valid phone numbers)';
COMMENT ON COLUMN scrape_jobs.search_url IS 'The Dubizzle search URL used for this job';
COMMENT ON COLUMN scrape_jobs.max_listings IS 'Maximum number of listings to process for this job';

-- Test that the table works correctly
INSERT INTO scrape_jobs (status, total, processed, successful_leads, search_url, max_listings) 
VALUES ('test', 0, 0, 0, 'https://test.com', 20);

-- Clean up test data
DELETE FROM scrape_jobs WHERE status = 'test';

-- Final check of table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'scrape_jobs' 
ORDER BY ordinal_position; 
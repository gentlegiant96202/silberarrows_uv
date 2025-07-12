-- Migration: Add fields for daily automation tracking
-- Run this in your Supabase SQL Editor to add the missing fields

-- First, let's check what columns exist in your current table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'scrape_jobs' 
ORDER BY ordinal_position;

-- Add search_url and max_listings columns to existing scrape_jobs table
ALTER TABLE scrape_jobs 
ADD COLUMN IF NOT EXISTS search_url TEXT,
ADD COLUMN IF NOT EXISTS max_listings INTEGER DEFAULT 20;

-- Add created_at column if it doesn't exist (some tables might not have it)
ALTER TABLE scrape_jobs 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_search_url ON scrape_jobs(search_url);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_max_listings ON scrape_jobs(max_listings);

-- Add a comment to document the table structure
COMMENT ON TABLE scrape_jobs IS 'Tracks scraping job progress and configuration';
COMMENT ON COLUMN scrape_jobs.search_url IS 'The Dubizzle search URL used for this job';
COMMENT ON COLUMN scrape_jobs.max_listings IS 'Maximum number of listings to process for this job';

-- Check the updated table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'scrape_jobs' 
ORDER BY ordinal_position; 
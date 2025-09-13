-- Test script to verify the scrape_jobs table migration
-- Run this in your Supabase SQL Editor after the migration

-- 1. Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'scrape_jobs' 
ORDER BY ordinal_position;

-- 2. Test inserting a job with the new fields
INSERT INTO scrape_jobs (
    status, 
    total, 
    processed, 
    search_url, 
    max_listings
) VALUES (
    'queued', 
    0, 
    0, 
    'https://dubai.dubizzle.com/motors/used-cars/mercedes-benz/?seller_type=OW&regional_specs=824&regional_specs=827&fuel_type=380&fuel_type=383&kilometers__lte=100000&kilometers__gte=0&year__gte=2015&year__lte=2026',
    25
);

-- 3. Verify the insert worked
SELECT 
    id,
    status,
    total,
    processed,
    search_url,
    max_listings,
    started_at,
    finished_at
FROM scrape_jobs 
ORDER BY 
    CASE 
        WHEN created_at IS NOT NULL THEN created_at
        ELSE started_at
    END DESC 
LIMIT 5; 
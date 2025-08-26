-- Check the current structure of content_pillars table
-- Run these queries in your Supabase SQL editor

-- 1. Check all columns in content_pillars table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'content_pillars' 
ORDER BY ordinal_position;

-- 2. Check if myth and fact columns exist specifically
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'content_pillars' 
AND column_name IN ('myth', 'fact', 'badge_text', 'subtitle');

-- 3. Show sample data from content_pillars table
SELECT 
    id,
    title,
    day_of_week,
    badge_text,
    subtitle,
    myth,
    fact,
    created_at
FROM content_pillars 
WHERE day_of_week = 'monday'
ORDER BY created_at DESC
LIMIT 3;

-- 4. Check table constraints and indexes
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    ccu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'content_pillars';

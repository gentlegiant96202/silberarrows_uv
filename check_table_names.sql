-- Check what tables actually exist in the database
-- Run this in your Supabase SQL Editor

-- 1. List all tables in the public schema
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Look for tables that might contain lead/appointment data
SELECT table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
AND (table_name ILIKE '%lead%' OR table_name ILIKE '%appointment%' OR table_name ILIKE '%customer%')
ORDER BY table_name;

-- 3. Check columns in potential lead tables to identify the right one
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
AND (column_name ILIKE '%appointment%' OR column_name ILIKE '%phone%' OR column_name ILIKE '%full_name%')
ORDER BY table_name, column_name; 
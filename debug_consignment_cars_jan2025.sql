-- Debug script to check consignment cars for January 2025
-- Run this in your Supabase SQL Editor to see what's happening

-- 1. Check all cars with ownership_type = 'consignment' in January 2025
SELECT 
    id,
    stock_number,
    vehicle_model,
    ownership_type,
    status,
    sale_status,
    created_at,
    TO_CHAR(created_at, 'YYYY-MM') as year_month,
    EXTRACT(YEAR FROM created_at) as year,
    EXTRACT(MONTH FROM created_at) as month
FROM cars 
WHERE ownership_type = 'consignment'
AND created_at >= '2025-01-01'
AND created_at < '2025-02-01'
ORDER BY created_at;

-- 2. Check all cars created in January 2025 regardless of ownership type
SELECT 
    id,
    stock_number,
    vehicle_model,
    ownership_type,
    status,
    sale_status,
    created_at,
    TO_CHAR(created_at, 'YYYY-MM-DD') as date_created
FROM cars 
WHERE created_at >= '2025-01-01'
AND created_at < '2025-02-01'
ORDER BY ownership_type, created_at;

-- 3. Count by ownership type for January 2025
SELECT 
    ownership_type,
    COUNT(*) as count,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM cars 
WHERE created_at >= '2025-01-01'
AND created_at < '2025-02-01'
GROUP BY ownership_type;

-- 4. Check all consignment cars for the entire year 2025
SELECT 
    EXTRACT(MONTH FROM created_at) as month,
    TO_CHAR(created_at, 'Mon') as month_name,
    COUNT(*) as consignment_count
FROM cars 
WHERE ownership_type = 'consignment'
AND EXTRACT(YEAR FROM created_at) = 2025
GROUP BY EXTRACT(MONTH FROM created_at), TO_CHAR(created_at, 'Mon')
ORDER BY EXTRACT(MONTH FROM created_at);

-- 5. Check if there are any NULL ownership_type values
SELECT 
    ownership_type,
    COUNT(*) as count
FROM cars 
WHERE created_at >= '2025-01-01'
AND created_at < '2025-02-01'
GROUP BY ownership_type;

-- 6. Check exact ownership_type values (in case of typos/case issues)
SELECT DISTINCT ownership_type, COUNT(*)
FROM cars 
WHERE created_at >= '2025-01-01'
GROUP BY ownership_type
ORDER BY ownership_type;

-- 7. Check the specific cars from your bulk update list that should be consignment in Jan 2025
SELECT 
    chassis_number,
    ownership_type,
    status,
    created_at,
    stock_number,
    vehicle_model
FROM cars 
WHERE chassis_number IN (
    'W1V44781513792418' -- This was in your list with date 2025-01-27
)
ORDER BY created_at;

-- 8. Final verification - all cars matching the date range that should show 11 consignment cars
SELECT *
FROM cars 
WHERE created_at >= '2025-01-01 00:00:00'
AND created_at <= '2025-01-31 23:59:59'
ORDER BY ownership_type, created_at; 
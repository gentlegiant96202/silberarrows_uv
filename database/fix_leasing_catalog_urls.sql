-- =====================================================
-- FIX LEASING CATALOG URLS TO USE PORTAL SUBDOMAIN
-- =====================================================

-- Update all existing leasing_catalog entries to use portal.silberarrows.com
UPDATE leasing_catalog
SET url = CONCAT('https://portal.silberarrows.com/leasing/showroom/', vehicle_id),
    updated_at = NOW()
WHERE url IS NULL 
   OR url LIKE '%silberarrows.com/leasing/showroom/%'
   AND url NOT LIKE '%portal.silberarrows.com%';

-- Show results
SELECT 
    COUNT(*) as total_updated,
    'URLs updated to portal.silberarrows.com' as message
FROM leasing_catalog
WHERE url LIKE '%portal.silberarrows.com%';

-- Verify all URLs are correct
SELECT 
    id,
    vehicle_id,
    title,
    url
FROM leasing_catalog
ORDER BY created_at DESC
LIMIT 10;



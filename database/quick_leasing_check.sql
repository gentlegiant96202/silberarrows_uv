-- Quick check of leasing_inventory table status
\dt leasing_inventory

-- Show table structure
\d leasing_inventory

-- Check if JSON columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
AND column_name IN ('photos', 'social_media_images', 'catalog_images', 'documents');

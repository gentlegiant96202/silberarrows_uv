-- Check if JSON media fields exist in leasing_inventory table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
AND column_name IN ('photos', 'social_media_images', 'catalog_images', 'documents')
ORDER BY column_name;

-- Check sample data to see if JSON fields have data
SELECT 
    stock_number,
    photos,
    social_media_images,
    catalog_images,
    documents
FROM leasing_inventory 
LIMIT 2;

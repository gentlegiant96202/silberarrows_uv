-- Clean up broken media URLs from content_pillars
-- This removes media entries that return 400/404 errors

-- Clear the broken media files from your test record
UPDATE content_pillars 
SET 
    media_files_a = NULL,
    media_files_b = NULL,
    media_files = '[]'::jsonb
WHERE id = '50442530-bb09-4627-bf97-934950046c6b';

-- Verify the cleanup
SELECT 
    id,
    title,
    media_files,
    media_files_a,
    media_files_b
FROM content_pillars 
WHERE id = '50442530-bb09-4627-bf97-934950046c6b';

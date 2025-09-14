-- Add separate media columns for Template A and Template B to content_pillars table
-- This migration adds media_files_a and media_files_b JSONB columns for separate template storage

-- Add Template A media files column
ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS media_files_a JSONB DEFAULT NULL;

-- Add Template B media files column  
ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS media_files_b JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN content_pillars.media_files_a IS 'JSONB array of Template A media files with URL, name, type, size, templateType, etc.';
COMMENT ON COLUMN content_pillars.media_files_b IS 'JSONB array of Template B media files with URL, name, type, size, templateType, etc.';

-- Add GIN indexes for performance querying
CREATE INDEX IF NOT EXISTS idx_content_pillars_media_files_a ON content_pillars USING GIN (media_files_a);
CREATE INDEX IF NOT EXISTS idx_content_pillars_media_files_b ON content_pillars USING GIN (media_files_b);

-- Migrate existing data: Split media_files into A/B based on templateType
UPDATE content_pillars 
SET 
    media_files_a = (
        SELECT CASE 
            WHEN COUNT(*) > 0 THEN jsonb_agg(media_item)
            ELSE NULL
        END
        FROM jsonb_array_elements(COALESCE(media_files, '[]'::jsonb)) as media_item
        WHERE (media_item->>'templateType' = 'A' OR media_item->>'templateType' IS NULL)
    ),
    media_files_b = (
        SELECT CASE 
            WHEN COUNT(*) > 0 THEN jsonb_agg(media_item)
            ELSE NULL
        END
        FROM jsonb_array_elements(COALESCE(media_files, '[]'::jsonb)) as media_item
        WHERE media_item->>'templateType' = 'B'
    )
WHERE media_files IS NOT NULL 
AND jsonb_array_length(media_files) > 0;

-- Verify the migration results
SELECT 
    id,
    title,
    day_of_week,
    jsonb_array_length(COALESCE(media_files, '[]'::jsonb)) as original_media_count,
    jsonb_array_length(COALESCE(media_files_a, '[]'::jsonb)) as media_a_count,
    jsonb_array_length(COALESCE(media_files_b, '[]'::jsonb)) as media_b_count,
    CASE 
        WHEN media_files_a IS NOT NULL THEN 'Has A'
        ELSE 'No A'
    END as has_template_a,
    CASE 
        WHEN media_files_b IS NOT NULL THEN 'Has B'
        ELSE 'No B'
    END as has_template_b
FROM content_pillars 
WHERE media_files IS NOT NULL 
AND jsonb_array_length(media_files) > 0
ORDER BY updated_at DESC
LIMIT 10;

-- Show the specific record being worked on
SELECT 
    id,
    title,
    jsonb_pretty(media_files) as original_media,
    jsonb_pretty(media_files_a) as template_a_media,
    jsonb_pretty(media_files_b) as template_b_media
FROM content_pillars 
WHERE id = '50442530-bb09-4627-bf97-934950046c6b';

-- Summary statistics
SELECT 
    'Migration Summary' as info,
    COUNT(*) as total_pillars,
    COUNT(CASE WHEN media_files IS NOT NULL AND jsonb_array_length(media_files) > 0 THEN 1 END) as pillars_with_media,
    COUNT(CASE WHEN media_files_a IS NOT NULL THEN 1 END) as pillars_with_template_a,
    COUNT(CASE WHEN media_files_b IS NOT NULL THEN 1 END) as pillars_with_template_b
FROM content_pillars;

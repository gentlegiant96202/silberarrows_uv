-- Add media files support to content pillars table
-- This migration adds the media_files JSONB column to store uploaded files

-- Add media_files column to content_pillars table
ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS media_files JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN content_pillars.media_files IS 'JSONB array of media file objects with URL, name, type, size, etc.';

-- Add index for querying media files
CREATE INDEX IF NOT EXISTS idx_content_pillars_media_files ON content_pillars USING GIN (media_files);

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'content_pillars' 
AND column_name = 'media_files';

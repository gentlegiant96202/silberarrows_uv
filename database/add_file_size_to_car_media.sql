-- Add file_size column to car_media table
-- This will store the size of each media file in bytes

-- Add file_size column if it doesn't exist
ALTER TABLE car_media 
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add comment to document the purpose
COMMENT ON COLUMN car_media.file_size IS 'Size of the media file in bytes';

-- Add index for file size queries (optional, useful for finding large files)
CREATE INDEX IF NOT EXISTS idx_car_media_file_size 
ON car_media(file_size) 
WHERE file_size IS NOT NULL;


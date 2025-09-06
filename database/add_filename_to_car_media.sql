-- Add filename column to car_media table for better document display
-- This will allow us to show actual filenames instead of generic "Document" text

-- Add filename column if it doesn't exist
ALTER TABLE car_media 
ADD COLUMN IF NOT EXISTS filename TEXT;

-- Add comment to document the purpose
COMMENT ON COLUMN car_media.filename IS 'Original filename of the uploaded document for display purposes';

-- Update existing records to extract filename from URL where possible
-- This is a best-effort update for existing documents
UPDATE car_media 
SET filename = CASE 
    WHEN url LIKE '%consignment-agreement%' THEN 'Consignment Agreement.pdf'
    WHEN url LIKE '%docs-%' THEN 'Document.pdf'
    ELSE 'Document.pdf'
END
WHERE filename IS NULL AND kind = 'document';

-- Verify the update
SELECT 
    id, 
    filename, 
    kind,
    SUBSTRING(url FROM '[^/]+$') as url_filename
FROM car_media 
WHERE kind = 'document' 
LIMIT 5;

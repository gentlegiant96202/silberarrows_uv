-- Add form fields to content_pillars table
-- These fields store user preferences for title size, image settings, etc.

ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS titleFontSize INTEGER DEFAULT 72,
ADD COLUMN IF NOT EXISTS imageFit VARCHAR(20) DEFAULT 'cover' CHECK (imageFit IN ('cover', 'contain', 'fill')),
ADD COLUMN IF NOT EXISTS imageAlignment VARCHAR(50) DEFAULT 'center',
ADD COLUMN IF NOT EXISTS imageZoom INTEGER DEFAULT 100 CHECK (imageZoom >= 10 AND imageZoom <= 200),
ADD COLUMN IF NOT EXISTS imageVerticalPosition INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN content_pillars.titleFontSize IS 'Font size for the title in pixels (24-120)';
COMMENT ON COLUMN content_pillars.imageFit IS 'How the image should fit in the container: cover, contain, or fill';
COMMENT ON COLUMN content_pillars.imageAlignment IS 'Image alignment within the container';
COMMENT ON COLUMN content_pillars.imageZoom IS 'Image zoom level as percentage (10-200)';
COMMENT ON COLUMN content_pillars.imageVerticalPosition IS 'Vertical position offset for the image in pixels';

-- Update existing records to have default values
UPDATE content_pillars 
SET 
  titleFontSize = 72,
  imageFit = 'cover',
  imageAlignment = 'center',
  imageZoom = 100,
  imageVerticalPosition = 0
WHERE titleFontSize IS NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'content_pillars' 
  AND column_name IN ('titleFontSize', 'imageFit', 'imageAlignment', 'imageZoom', 'imageVerticalPosition')
ORDER BY column_name;

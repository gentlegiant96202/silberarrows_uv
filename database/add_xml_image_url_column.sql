-- Add XML image URL column to cars table
-- This will store the generated Puppeteer screenshot URL for XML feeds

ALTER TABLE cars 
ADD COLUMN xml_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN cars.xml_image_url IS 'Generated image URL for XML feed - auto-updated on car data changes';

-- Index for faster XML feed queries
CREATE INDEX idx_cars_xml_image_url ON cars(xml_image_url) WHERE xml_image_url IS NOT NULL; 
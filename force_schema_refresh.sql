-- FORCE SUPABASE SCHEMA CACHE REFRESH
-- Run this in Supabase SQL editor to force schema cache refresh

-- Step 1: Drop and recreate the columns to force schema refresh
ALTER TABLE content_pillars DROP COLUMN IF EXISTS titleFontSize;
ALTER TABLE content_pillars DROP COLUMN IF EXISTS imageFit;
ALTER TABLE content_pillars DROP COLUMN IF EXISTS imageAlignment;
ALTER TABLE content_pillars DROP COLUMN IF EXISTS imageZoom;
ALTER TABLE content_pillars DROP COLUMN IF EXISTS imageVerticalPosition;

-- Step 2: Add columns back with explicit data types
ALTER TABLE content_pillars ADD COLUMN titleFontSize INTEGER DEFAULT 72;
ALTER TABLE content_pillars ADD COLUMN imageFit VARCHAR(20) DEFAULT 'cover';
ALTER TABLE content_pillars ADD COLUMN imageAlignment VARCHAR(50) DEFAULT 'center';
ALTER TABLE content_pillars ADD COLUMN imageZoom INTEGER DEFAULT 100;
ALTER TABLE content_pillars ADD COLUMN imageVerticalPosition INTEGER DEFAULT 0;

-- Step 3: Update all existing records with default values
UPDATE content_pillars SET 
  titleFontSize = 72,
  imageFit = 'cover',
  imageAlignment = 'center',
  imageZoom = 100,
  imageVerticalPosition = 0
WHERE titleFontSize IS NULL OR imageFit IS NULL OR imageAlignment IS NULL OR imageZoom IS NULL OR imageVerticalPosition IS NULL;

-- Step 4: Force schema cache refresh by querying the table structure
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'content_pillars' 
  AND column_name IN ('titleFontSize', 'imageFit', 'imageAlignment', 'imageZoom', 'imageVerticalPosition')
ORDER BY column_name;

-- Step 5: Test the columns with a simple query
SELECT 
  id,
  title,
  titleFontSize,
  imageFit,
  imageAlignment,
  imageZoom,
  imageVerticalPosition
FROM content_pillars 
LIMIT 1;

-- Step 6: Test an update to verify columns work
UPDATE content_pillars 
SET titleFontSize = 100, imageZoom = 150
WHERE id = (SELECT id FROM content_pillars LIMIT 1);

-- Step 7: Verify the update worked
SELECT id, title, titleFontSize, imageZoom 
FROM content_pillars 
WHERE titleFontSize = 100 AND imageZoom = 150;

-- Step 8: Force a full table scan to refresh cache
SELECT COUNT(*) FROM content_pillars;

-- Step 9: Query all columns to force schema refresh
SELECT * FROM content_pillars LIMIT 1;

-- Add new enum values for social_media and catalog to the media_kind_enum type
-- These must be run as separate statements and committed individually

-- Step 1: Add social_media enum value (run this first, then commit)
ALTER TYPE media_kind_enum ADD VALUE 'social_media';

-- Step 2: Add catalog enum value (run this second, then commit)  
ALTER TYPE media_kind_enum ADD VALUE 'catalog';

-- Step 3: Verify the enum now includes all values (run this after both above are committed)
SELECT unnest(enum_range(NULL::media_kind_enum)) as media_kinds;

-- Step 4: Add helpful comments
COMMENT ON TYPE media_kind_enum IS 'Enum for different types of media: photo, video, document, social_media, catalog'; 
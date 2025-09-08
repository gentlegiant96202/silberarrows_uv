-- Add damage_report enum value to the existing media_kind_enum type
-- This must be run to allow 'damage_report' as a valid kind value in car_media table

-- Add damage_report enum value
ALTER TYPE media_kind_enum ADD VALUE IF NOT EXISTS 'damage_report';

-- Verify the enum now includes damage_report
SELECT unnest(enum_range(NULL::media_kind_enum)) as media_kinds;

-- Add helpful comment
COMMENT ON TYPE media_kind_enum IS 'Enum for different types of media: photo, video, document, social_media, catalog, damage_report';

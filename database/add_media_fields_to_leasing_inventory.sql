-- =====================================================
-- ADD MEDIA FIELDS TO LEASING INVENTORY TABLE
-- =====================================================
-- Add JSON fields to store media URLs directly in the vehicle record

-- Add media JSON fields to leasing_inventory table
ALTER TABLE leasing_inventory 
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS social_media_images JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS catalog_images JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';

-- Add indexes for JSON fields for better performance
CREATE INDEX IF NOT EXISTS idx_leasing_inventory_photos ON leasing_inventory USING GIN (photos);
CREATE INDEX IF NOT EXISTS idx_leasing_inventory_social_media ON leasing_inventory USING GIN (social_media_images);
CREATE INDEX IF NOT EXISTS idx_leasing_inventory_catalog ON leasing_inventory USING GIN (catalog_images);
CREATE INDEX IF NOT EXISTS idx_leasing_inventory_documents ON leasing_inventory USING GIN (documents);

-- =====================================================
-- JSON STRUCTURE DOCUMENTATION
-- =====================================================
/*
Each JSON field will store an array of media objects:

photos: [
  {
    "id": "uuid-generated-id",
    "url": "https://storage.url/path/to/image.jpg",
    "filename": "original-filename.jpg",
    "is_primary": true,
    "sort_order": 0,
    "uploaded_at": "2024-01-15T10:30:00Z"
  }
]

social_media_images: [
  {
    "id": "uuid-generated-id", 
    "url": "https://storage.url/path/to/social.jpg",
    "filename": "social-image.jpg",
    "sort_order": 0,
    "uploaded_at": "2024-01-15T10:30:00Z"
  }
]

catalog_images: [
  {
    "id": "uuid-generated-id",
    "url": "https://storage.url/path/to/catalog.jpg", 
    "filename": "catalog-image.jpg",
    "sort_order": 0,
    "uploaded_at": "2024-01-15T10:30:00Z"
  }
]

documents: [
  {
    "id": "uuid-generated-id",
    "url": "https://storage.url/path/to/document.pdf",
    "filename": "vehicle-registration.pdf",
    "type": "registration",
    "uploaded_at": "2024-01-15T10:30:00Z"
  }
]

ADVANTAGES:
✅ Single table - no JOINs needed
✅ Atomic updates - all vehicle data in one record
✅ Flexible structure - easy to add new fields
✅ Better performance - fewer database queries
✅ Simpler code - direct JSON manipulation
✅ Easy backup/restore - everything in one place
*/

-- =====================================================
-- HELPER FUNCTIONS FOR JSON OPERATIONS
-- =====================================================

-- Function to add a photo to a vehicle
CREATE OR REPLACE FUNCTION add_vehicle_photo(
    vehicle_id UUID,
    photo_url TEXT,
    photo_filename TEXT DEFAULT NULL,
    is_primary BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN AS $$
DECLARE
    new_photo JSONB;
    current_photos JSONB;
BEGIN
    -- Create new photo object
    new_photo := jsonb_build_object(
        'id', gen_random_uuid()::text,
        'url', photo_url,
        'filename', COALESCE(photo_filename, ''),
        'is_primary', is_primary,
        'sort_order', 0,
        'uploaded_at', NOW()::text
    );
    
    -- Get current photos
    SELECT COALESCE(photos, '[]'::jsonb) INTO current_photos
    FROM leasing_inventory 
    WHERE id = vehicle_id;
    
    -- If this is primary, remove primary from others
    IF is_primary THEN
        current_photos := (
            SELECT jsonb_agg(
                jsonb_set(photo, '{is_primary}', 'false'::jsonb)
            )
            FROM jsonb_array_elements(current_photos) AS photo
        );
    END IF;
    
    -- Add new photo to array
    current_photos := current_photos || new_photo;
    
    -- Update the record
    UPDATE leasing_inventory 
    SET photos = current_photos
    WHERE id = vehicle_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to remove a photo from a vehicle
CREATE OR REPLACE FUNCTION remove_vehicle_photo(
    vehicle_id UUID,
    photo_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE leasing_inventory 
    SET photos = (
        SELECT jsonb_agg(photo)
        FROM jsonb_array_elements(photos) AS photo
        WHERE photo->>'id' != photo_id
    )
    WHERE id = vehicle_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to set primary photo
CREATE OR REPLACE FUNCTION set_primary_photo(
    vehicle_id UUID,
    photo_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE leasing_inventory 
    SET photos = (
        SELECT jsonb_agg(
            CASE 
                WHEN photo->>'id' = photo_id 
                THEN jsonb_set(photo, '{is_primary}', 'true'::jsonb)
                ELSE jsonb_set(photo, '{is_primary}', 'false'::jsonb)
            END
        )
        FROM jsonb_array_elements(photos) AS photo
    )
    WHERE id = vehicle_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

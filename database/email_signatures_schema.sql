-- =====================================================
-- EMAIL SIGNATURES SCHEMA
-- Table for storing CodeTwo email signature templates and configurations
-- =====================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS email_signature_media CASCADE;
DROP TABLE IF EXISTS email_signatures CASCADE;

-- =====================================================
-- MAIN EMAIL SIGNATURES TABLE
-- =====================================================

CREATE TABLE email_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template identification
    name TEXT NOT NULL, -- Template name (e.g., "SilberArrows Standard", "Sales Team", etc.)
    description TEXT, -- Optional description
    is_active BOOLEAN DEFAULT true, -- Whether template is active
    is_default BOOLEAN DEFAULT false, -- Default template for new users
    
    -- Social media links (editable in UI)
    facebook_url TEXT,
    instagram_url TEXT,
    linkedin_url TEXT,
    youtube_url TEXT,
    
    -- Banner images
    banner_image_1_url TEXT, -- First banner image URL
    banner_image_2_url TEXT, -- Second banner image URL
    banner_image_1_alt TEXT DEFAULT 'Banner 1', -- Alt text for accessibility
    banner_image_2_alt TEXT DEFAULT 'Banner 2', -- Alt text for accessibility
    
    -- Logo and icons (uploaded PNGs)
    logo_image_url TEXT,
    icon_email_url TEXT,
    icon_phone_url TEXT,
    icon_mobile_url TEXT,
    icon_address_url TEXT,
    icon_facebook_url TEXT,
    icon_instagram_url TEXT,
    icon_linkedin_url TEXT,
    icon_youtube_url TEXT,
    
    -- Template configuration
    template_html TEXT NOT NULL, -- Complete HTML template with CodeTwo variables
    template_version INTEGER DEFAULT 1, -- Version for tracking updates
    
    -- Metadata
    created_by TEXT, -- User who created the template
    department TEXT, -- Department this template is for (optional)
    company TEXT DEFAULT 'SilberArrows UV', -- Company name
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT template_html_not_empty CHECK (length(trim(template_html)) > 0),
    CONSTRAINT only_one_default_template UNIQUE (is_default) DEFERRABLE INITIALLY DEFERRED
);

-- =====================================================
-- EMAIL SIGNATURE MEDIA FILES TABLE
-- =====================================================

CREATE TABLE email_signature_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signature_id UUID NOT NULL REFERENCES email_signatures(id) ON DELETE CASCADE,
    
    -- File information
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Storage path in bucket
    file_url TEXT NOT NULL,  -- Public URL for email use
    file_type TEXT NOT NULL, -- MIME type
    file_size BIGINT NOT NULL, -- Size in bytes
    
    -- Media classification
    media_type TEXT NOT NULL CHECK (media_type IN ('banner_1', 'banner_2', 'logo', 'background')),
    alt_text TEXT, -- Alternative text for accessibility
    
    -- Optimization info
    optimized_for_email BOOLEAN DEFAULT false, -- Whether image is optimized for email
    compression_quality INTEGER DEFAULT 85, -- JPEG quality if applicable
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    CONSTRAINT file_name_not_empty CHECK (length(trim(file_name)) > 0),
    CONSTRAINT file_path_not_empty CHECK (length(trim(file_path)) > 0),
    CONSTRAINT file_url_not_empty CHECK (length(trim(file_url)) > 0),
    CONSTRAINT file_size_positive CHECK (file_size > 0),
    CONSTRAINT compression_quality_valid CHECK (compression_quality BETWEEN 1 AND 100)
);

-- =====================================================
-- STORAGE BUCKET FOR EMAIL SIGNATURE ASSETS
-- =====================================================

-- Create dedicated storage bucket for email signature assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'email-signatures',
    'email-signatures',
    true, -- Public for email client access
    10485760, -- 10MB limit (email-optimized images should be small)
    ARRAY[
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'image/svg+xml'
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Main table indexes
CREATE INDEX idx_email_signatures_active ON email_signatures(is_active) WHERE is_active = true;
CREATE INDEX idx_email_signatures_default ON email_signatures(is_default) WHERE is_default = true;
CREATE INDEX idx_email_signatures_department ON email_signatures(department) WHERE department IS NOT NULL;
CREATE INDEX idx_email_signatures_created_at ON email_signatures(created_at DESC);

-- Media table indexes
CREATE INDEX idx_email_signature_media_signature_id ON email_signature_media(signature_id);
CREATE INDEX idx_email_signature_media_type ON email_signature_media(signature_id, media_type);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger for email_signatures
CREATE TRIGGER update_email_signatures_updated_at 
    BEFORE UPDATE ON email_signatures 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tables
ALTER TABLE email_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_signature_media ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - EMAIL SIGNATURES
-- =====================================================

DROP POLICY IF EXISTS "authenticated_users_full_access_email_signatures" ON email_signatures;
CREATE POLICY "authenticated_users_full_access_email_signatures" 
ON email_signatures FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_active_email_signatures" ON email_signatures;
CREATE POLICY "public_read_active_email_signatures" 
ON email_signatures FOR SELECT 
TO anon 
USING (is_active = true);

-- =====================================================
-- RLS POLICIES - EMAIL SIGNATURE MEDIA
-- =====================================================

DROP POLICY IF EXISTS "authenticated_users_full_access_email_signature_media" ON email_signature_media;
CREATE POLICY "authenticated_users_full_access_email_signature_media" 
ON email_signature_media FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_email_signature_media" ON email_signature_media;
CREATE POLICY "public_read_email_signature_media" 
ON email_signature_media FOR SELECT 
TO anon 
USING (true);

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "authenticated_upload_email_signature_assets" ON storage.objects;
CREATE POLICY "authenticated_upload_email_signature_assets" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'email-signatures');

DROP POLICY IF EXISTS "authenticated_update_email_signature_assets" ON storage.objects;
CREATE POLICY "authenticated_update_email_signature_assets" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'email-signatures');

DROP POLICY IF EXISTS "authenticated_delete_email_signature_assets" ON storage.objects;
CREATE POLICY "authenticated_delete_email_signature_assets" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'email-signatures');

DROP POLICY IF EXISTS "public_read_email_signature_assets" ON storage.objects;
CREATE POLICY "public_read_email_signature_assets" ON storage.objects
FOR SELECT TO anon USING (bucket_id = 'email-signatures');

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert default SilberArrows signature template
INSERT INTO email_signatures (
    name,
    description,
    is_active,
    is_default,
    facebook_url,
    instagram_url,
    linkedin_url,
    youtube_url,
    banner_image_1_url,
    banner_image_2_url,
    template_html,
    created_by,
    department
) VALUES (
    'SilberArrows Standard',
    'Default company email signature with silver branding',
    true,
    true,
    'https://facebook.com/silberarrows',
    'https://instagram.com/silberarrows',
    'https://linkedin.com/company/silberarrows',
    'https://youtube.com/silberarrows',
    'https://via.placeholder.com/600x100/000000/FFFFFF?text=Banner+1',
    'https://via.placeholder.com/600x100/000000/FFFFFF?text=Banner+2',
    '<!-- HTML template will be inserted here -->',
    'system',
    'All Departments'
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get active signature template
CREATE OR REPLACE FUNCTION get_active_signature_template(dept TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    name TEXT,
    template_html TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    linkedin_url TEXT,
    youtube_url TEXT,
    banner_image_1_url TEXT,
    banner_image_2_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.template_html,
        s.facebook_url,
        s.instagram_url,
        s.linkedin_url,
        s.youtube_url,
        s.banner_image_1_url,
        s.banner_image_2_url
    FROM email_signatures s
    WHERE s.is_active = true
    AND (dept IS NULL OR s.department = dept OR s.department = 'All Departments')
    ORDER BY 
        CASE WHEN s.department = dept THEN 1 ELSE 2 END,
        s.is_default DESC,
        s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES (Run these separately to verify setup)
-- =====================================================

-- Verify table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'email_signatures' 
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'email_signature_media' 
-- ORDER BY ordinal_position;

-- Check storage bucket
-- SELECT * FROM storage.buckets WHERE id = 'email-signatures';

-- Test sample data
-- SELECT name, is_active, is_default FROM email_signatures;

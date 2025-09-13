-- =====================================================
-- MARKETING MODULE COMPLETE SCHEMA SETUP
-- =====================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS task_media_files CASCADE;
DROP TABLE IF EXISTS design_tasks CASCADE;

-- Drop existing storage bucket
DELETE FROM storage.buckets WHERE id = 'media-files';

-- =====================================================
-- ENUMS
-- =====================================================

-- Create task status enum
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM (
        'intake',
        'in_progress', 
        'in_review',
        'approved',
        'instagram_feed_preview'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create content type enum
DO $$ BEGIN
    CREATE TYPE content_type AS ENUM (
        'post',
        'story', 
        'reel',
        'carousel',
        'ad'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create priority enum
DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM (
        'low',
        'medium',
        'high'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLES
-- =====================================================

-- Main design tasks table
CREATE TABLE design_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'intake',
    priority task_priority DEFAULT 'medium',
    assignee TEXT,
    due_date DATE,
    content_type content_type DEFAULT 'post',
    tags TEXT[] DEFAULT '{}',
    
    -- Marketing-specific fields
    headline TEXT, -- For backward compatibility with existing data
    caption TEXT, -- Only visible when status is not 'intake'
    
    -- JSON fields for flexibility
    annotations JSONB DEFAULT '[]',
    comments JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0)
);

-- Media files table
CREATE TABLE task_media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES design_tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Storage path
    file_url TEXT NOT NULL,  -- Public URL
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    upload_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT file_name_not_empty CHECK (length(trim(file_name)) > 0),
    CONSTRAINT file_path_not_empty CHECK (length(trim(file_path)) > 0),
    CONSTRAINT file_url_not_empty CHECK (length(trim(file_url)) > 0),
    CONSTRAINT file_size_positive CHECK (file_size > 0)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Performance indexes
CREATE INDEX idx_design_tasks_status ON design_tasks(status);
CREATE INDEX idx_design_tasks_created_at ON design_tasks(created_at DESC);
CREATE INDEX idx_design_tasks_due_date ON design_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_design_tasks_assignee ON design_tasks(assignee) WHERE assignee IS NOT NULL;

CREATE INDEX idx_task_media_files_task_id ON task_media_files(task_id);
CREATE INDEX idx_task_media_files_upload_order ON task_media_files(task_id, upload_order);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_design_tasks_updated_at 
    BEFORE UPDATE ON design_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET
-- =====================================================

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media-files',
    'media-files',
    true,
    52428800, -- 50MB limit
    ARRAY[
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'application/pdf',
        'image/svg+xml'
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tables
ALTER TABLE design_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_media_files ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - DESIGN TASKS
-- =====================================================

-- Allow all operations for authenticated users
CREATE POLICY "authenticated_users_full_access_design_tasks" 
ON design_tasks FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow read access for anon users (if needed for public viewing)
CREATE POLICY "anon_users_read_design_tasks" 
ON design_tasks FOR SELECT 
TO anon 
USING (true);

-- =====================================================
-- RLS POLICIES - TASK MEDIA FILES
-- =====================================================

-- Allow all operations for authenticated users
CREATE POLICY "authenticated_users_full_access_media_files" 
ON task_media_files FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow read access for anon users
CREATE POLICY "anon_users_read_media_files" 
ON task_media_files FOR SELECT 
TO anon 
USING (true);

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Allow all storage operations for authenticated users
CREATE POLICY "authenticated_users_upload_media" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'media-files');

CREATE POLICY "authenticated_users_update_media" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'media-files') 
WITH CHECK (bucket_id = 'media-files');

CREATE POLICY "authenticated_users_delete_media" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'media-files');

-- Allow public read access to media files
CREATE POLICY "public_read_media" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'media-files');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get tasks with media files
CREATE OR REPLACE FUNCTION get_design_tasks_with_media()
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    status task_status,
    priority task_priority,
    assignee TEXT,
    due_date DATE,
    content_type content_type,
    tags TEXT[],
    headline TEXT,
    caption TEXT,
    annotations JSONB,
    comments JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    media_files JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dt.id,
        dt.title,
        dt.description,
        dt.status,
        dt.priority,
        dt.assignee,
        dt.due_date,
        dt.content_type,
        dt.tags,
        dt.headline,
        dt.caption,
        dt.annotations,
        dt.comments,
        dt.created_at,
        dt.updated_at,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', tmf.id,
                    'file_name', tmf.file_name,
                    'file_path', tmf.file_path,
                    'file_url', tmf.file_url,
                    'file_type', tmf.file_type,
                    'file_size', tmf.file_size,
                    'upload_order', tmf.upload_order,
                    'created_at', tmf.created_at
                ) ORDER BY tmf.upload_order, tmf.created_at
            ) FILTER (WHERE tmf.id IS NOT NULL),
            '[]'::json
        )::jsonb AS media_files
    FROM design_tasks dt
    LEFT JOIN task_media_files tmf ON dt.id = tmf.task_id
    GROUP BY dt.id, dt.title, dt.description, dt.status, dt.priority, dt.assignee, 
             dt.due_date, dt.content_type, dt.tags, dt.headline, dt.caption, 
             dt.annotations, dt.comments, dt.created_at, dt.updated_at
    ORDER BY dt.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA (Optional)
-- =====================================================

-- Insert sample tasks for testing
INSERT INTO design_tasks (title, description, status, priority, content_type, headline, tags) VALUES
('Instagram Post - New Car Launch', 'Create engaging post for the new BMW X5 launch', 'intake', 'high', 'post', 'NEW BMW X5 AVAILABLE NOW', ARRAY['bmw', 'launch', 'luxury']),
('Story Series - Customer Testimonials', 'Weekly customer story highlights', 'in_progress', 'medium', 'story', 'CUSTOMER SPOTLIGHT', ARRAY['testimonials', 'customers']),
('Carousel Ad - Financing Options', 'Multi-slide carousel showcasing financing deals', 'in_review', 'high', 'carousel', 'FINANCING MADE EASY', ARRAY['financing', 'deals', 'promotion']);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify table creation
SELECT 'Tables created successfully' AS status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('design_tasks', 'task_media_files');

-- Verify storage bucket
SELECT 'Storage bucket created successfully' AS status;
SELECT id, name, public FROM storage.buckets WHERE id = 'media-files';

-- Verify RLS policies
SELECT 'RLS policies created successfully' AS status;
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('design_tasks', 'task_media_files');

-- Verify storage policies  
SELECT 'Storage policies created successfully' AS status;
SELECT * FROM storage.policies WHERE bucket_id = 'media-files';

-- Test the helper function
SELECT 'Helper function test' AS status;
SELECT COUNT(*) as task_count FROM get_design_tasks_with_media();

COMMIT; 
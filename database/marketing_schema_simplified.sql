-- =====================================================
-- MARKETING MODULE SIMPLIFIED SCHEMA (SINGLE TABLE)
-- =====================================================

-- Clean up existing objects first
DELETE FROM storage.objects WHERE bucket_id = 'media-files';

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS task_media_files CASCADE;
DROP TABLE IF EXISTS design_tasks CASCADE;

-- Drop existing storage bucket (now safe after deleting objects)
DELETE FROM storage.buckets WHERE id = 'media-files';

-- =====================================================
-- ENUMS
-- =====================================================

-- Drop existing types if they exist
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS content_type CASCADE;

-- Create task status enum (matching frontend exactly)
CREATE TYPE task_status AS ENUM (
    'intake',
    'in_progress', 
    'in_review',
    'approved',
    'instagram_feed_preview'
);

-- Create priority enum
CREATE TYPE task_priority AS ENUM (
    'low',
    'medium',
    'high'
);

-- Create content type enum (matching frontend exactly)
CREATE TYPE content_type AS ENUM (
    'post',
    'story',
    'reel',
    'carousel',
    'ad'
);

-- =====================================================
-- MAIN TABLE
-- =====================================================

-- Create the single design_tasks table with all fields
CREATE TABLE design_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'intake',
    priority task_priority DEFAULT 'medium',
    assignee TEXT, -- This is the "requested_by" field
    due_date DATE, -- Changed to DATE type to avoid empty string issues
    content_type content_type DEFAULT 'post',
    tags TEXT[] DEFAULT '{}',
    media_files JSONB DEFAULT '[]', -- Store file URLs as JSON array
    headline TEXT, -- Additional field for headline
    caption TEXT, -- Additional field for caption
    annotations JSONB DEFAULT '{}', -- For future annotation support
    comments JSONB DEFAULT '[]', -- For comments/notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STORAGE BUCKET
-- =====================================================

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media-files', 'media-files', true);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on the table
ALTER TABLE design_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow full access to design_tasks for authenticated users" 
    ON design_tasks FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Policy: Allow public read access (for testing)
CREATE POLICY "Allow public read access to design_tasks" 
    ON design_tasks FOR SELECT 
    TO anon 
    USING (true);

-- Policy: Allow public insert/update/delete (for testing)
CREATE POLICY "Allow public write access to design_tasks" 
    ON design_tasks FOR ALL 
    TO anon 
    USING (true) 
    WITH CHECK (true);

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Policy: Allow public access to storage bucket
CREATE POLICY "Allow public access to media-files bucket" 
    ON storage.objects FOR ALL 
    TO public 
    USING (bucket_id = 'media-files') 
    WITH CHECK (bucket_id = 'media-files');

-- =====================================================
-- INDEXES
-- =====================================================

-- Create useful indexes
CREATE INDEX idx_design_tasks_status ON design_tasks(status);
CREATE INDEX idx_design_tasks_created_at ON design_tasks(created_at);
CREATE INDEX idx_design_tasks_due_date ON design_tasks(due_date);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at automatically
CREATE TRIGGER update_design_tasks_updated_at 
    BEFORE UPDATE ON design_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert some sample tasks
INSERT INTO design_tasks (title, description, status, priority, assignee, content_type) VALUES
('Instagram Post - Product Launch', 'Create engaging post for new product launch', 'intake', 'high', 'John Doe', 'post'),
('Story Series - Behind the Scenes', 'Weekly behind the scenes content', 'in_progress', 'medium', 'Jane Smith', 'story'),
('Reel - Product Demo', 'Quick product demonstration video', 'in_review', 'high', 'Mike Johnson', 'reel'),
('Carousel - Feature Highlights', 'Multi-slide feature breakdown', 'approved', 'medium', 'Sarah Wilson', 'carousel');

-- =====================================================
-- PERMISSIONS SUMMARY
-- =====================================================

-- This schema provides:
-- 1. Single table design with all fields as JSONB arrays
-- 2. Proper ENUMs matching frontend exactly
-- 3. Public storage bucket for easy file access
-- 4. Liberal RLS policies for development
-- 5. Automatic timestamp updates
-- 6. Sample data for testing

COMMENT ON TABLE design_tasks IS 'Main table for marketing design tasks with integrated media storage';
COMMENT ON COLUMN design_tasks.media_files IS 'JSONB array of file objects with URL, name, type, etc.';
COMMENT ON COLUMN design_tasks.annotations IS 'JSONB for storing annotation data';
COMMENT ON COLUMN design_tasks.comments IS 'JSONB array for storing comments and notes'; 
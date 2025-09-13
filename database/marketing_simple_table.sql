-- =====================================================
-- SIMPLE MARKETING TABLE - EXACTLY WHAT FRONTEND NEEDS
-- =====================================================

-- Clean up existing objects first
DELETE FROM storage.objects WHERE bucket_id = 'media-files';

-- Drop existing tables if they exist
DROP TABLE IF EXISTS design_tasks CASCADE;

-- Drop existing storage bucket (now safe after deleting objects)
DELETE FROM storage.buckets WHERE id = 'media-files';

-- =====================================================
-- ENUMS
-- =====================================================

-- Drop existing types if they exist
DROP TYPE IF EXISTS task_status CASCADE;

-- Create task status enum to match frontend exactly
CREATE TYPE task_status AS ENUM (
    'intake',
    'in_progress', 
    'in_review',
    'approved',
    'instagram_feed_preview'
);

-- =====================================================
-- MAIN TABLE - SIMPLE AND CLEAN
-- =====================================================

CREATE TABLE design_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Your 6 required fields:
    status task_status DEFAULT 'intake',
    title TEXT NOT NULL,
    description TEXT,
    requested_by TEXT,  -- This maps to "assignee" in the interface
    due_date DATE,      -- Using proper DATE type (no empty strings)
    media_files JSONB DEFAULT '[]',  -- File upload as JSON array
    
    -- Basic timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =====================================================
-- STORAGE BUCKET FOR FILES
-- =====================================================

-- Create media files bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media-files', 'media-files', true);

-- =====================================================
-- ROW LEVEL SECURITY (DISABLED FOR DEVELOPMENT)
-- =====================================================

-- Disable RLS for easy development
ALTER TABLE design_tasks DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STORAGE POLICIES (LIBERAL FOR DEVELOPMENT)
-- =====================================================

-- Allow all operations on storage bucket for development
CREATE POLICY "Allow all storage operations" ON storage.objects
FOR ALL USING (bucket_id = 'media-files');

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_design_tasks_status ON design_tasks(status);
CREATE INDEX idx_design_tasks_created_at ON design_tasks(created_at);

-- =====================================================
-- UPDATE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_design_tasks_updated_at 
    BEFORE UPDATE ON design_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

INSERT INTO design_tasks (title, description, status, requested_by, due_date) VALUES
('Sample Task 1', 'This is a sample marketing task', 'intake', 'John Doe', '2025-02-01'),
('Sample Task 2', 'Another sample task', 'in_progress', 'Jane Smith', '2025-02-15');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show sample data
SELECT id, title, status, requested_by, due_date, created_at FROM design_tasks;

-- Show table columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'design_tasks' 
ORDER BY ordinal_position; 
-- Fix design_tasks table schema to match API expectations
-- This addresses the 500 error when moving marketing kanban cards

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'design_tasks' 
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add requested_by column if it doesn't exist (maps to assignee in frontend)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'design_tasks' AND column_name = 'requested_by'
    ) THEN
        ALTER TABLE design_tasks ADD COLUMN requested_by TEXT;
        RAISE NOTICE '✅ Added requested_by column to design_tasks';
    ELSE
        RAISE NOTICE '✅ requested_by column already exists';
    END IF;

    -- Add task_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'design_tasks' AND column_name = 'task_type'
    ) THEN
        ALTER TABLE design_tasks ADD COLUMN task_type TEXT DEFAULT 'design';
        RAISE NOTICE '✅ Added task_type column to design_tasks';
    ELSE
        RAISE NOTICE '✅ task_type column already exists';
    END IF;

    -- Add media_files column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'design_tasks' AND column_name = 'media_files'
    ) THEN
        ALTER TABLE design_tasks ADD COLUMN media_files JSONB DEFAULT '[]';
        RAISE NOTICE '✅ Added media_files column to design_tasks';
    ELSE
        RAISE NOTICE '✅ media_files column already exists';
    END IF;

    -- Add annotations column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'design_tasks' AND column_name = 'annotations'
    ) THEN
        ALTER TABLE design_tasks ADD COLUMN annotations JSONB DEFAULT '[]';
        RAISE NOTICE '✅ Added annotations column to design_tasks';
    ELSE
        RAISE NOTICE '✅ annotations column already exists';
    END IF;

    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'design_tasks' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE design_tasks ADD COLUMN created_by UUID;
        RAISE NOTICE '✅ Added created_by column to design_tasks';
    ELSE
        RAISE NOTICE '✅ created_by column already exists';
    END IF;

    -- Add acknowledged_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'design_tasks' AND column_name = 'acknowledged_at'
    ) THEN
        ALTER TABLE design_tasks ADD COLUMN acknowledged_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added acknowledged_at column to design_tasks';
    ELSE
        RAISE NOTICE '✅ acknowledged_at column already exists';
    END IF;

    -- Add pinned column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'design_tasks' AND column_name = 'pinned'
    ) THEN
        ALTER TABLE design_tasks ADD COLUMN pinned BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added pinned column to design_tasks';
    ELSE
        RAISE NOTICE '✅ pinned column already exists';
    END IF;
END $$;

-- Step 3: Ensure proper status enum exists
DO $$
BEGIN
    -- Check if task_status enum exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM (
            'intake', 'planned', 'in_progress', 'in_review', 'approved', 'archived'
        );
        RAISE NOTICE '✅ Created task_status enum';
    ELSE
        RAISE NOTICE '✅ task_status enum already exists';
    END IF;

    -- Update status column to use enum if it's not already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'design_tasks' 
        AND column_name = 'status' 
        AND data_type = 'text'
    ) THEN
        -- First, update any invalid status values
        UPDATE design_tasks 
        SET status = 'planned' 
        WHERE status NOT IN ('intake', 'planned', 'in_progress', 'in_review', 'approved', 'archived');
        
        -- Then alter the column type
        ALTER TABLE design_tasks 
        ALTER COLUMN status TYPE task_status USING status::task_status;
        
        RAISE NOTICE '✅ Updated status column to use task_status enum';
    END IF;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_design_tasks_status ON design_tasks(status);
CREATE INDEX IF NOT EXISTS idx_design_tasks_created_at ON design_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_tasks_requested_by ON design_tasks(requested_by) WHERE requested_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_design_tasks_created_by ON design_tasks(created_by) WHERE created_by IS NOT NULL;

-- Step 5: Ensure RLS is properly configured
ALTER TABLE design_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Allow full access to design_tasks for authenticated users" ON design_tasks;
DROP POLICY IF EXISTS "Allow public read access to design_tasks" ON design_tasks;
DROP POLICY IF EXISTS "Allow public write access to design_tasks" ON design_tasks;

-- Create simple RLS policies that allow authenticated users full access
CREATE POLICY "authenticated_users_full_access_design_tasks" 
ON design_tasks FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow anon users to read (for public marketing content)
CREATE POLICY "anon_users_read_design_tasks" 
ON design_tasks FOR SELECT 
TO anon 
USING (true);

-- Step 6: Verify the fix
SELECT 'Schema fix completed successfully' as status;

-- Show final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'design_tasks' 
ORDER BY ordinal_position;

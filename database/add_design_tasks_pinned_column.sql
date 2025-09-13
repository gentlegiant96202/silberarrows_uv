-- Design Tasks Pinning System Migration
-- Adds pinned column to enable Instagram-style pinning functionality
-- Date: 2025-01-30

BEGIN;

-- Add pinned column to design_tasks table
-- Default to FALSE so existing tasks are not pinned by default
ALTER TABLE design_tasks 
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of pinned tasks
CREATE INDEX IF NOT EXISTS idx_design_tasks_pinned 
ON design_tasks(pinned, created_at DESC);

-- Add index for Instagram feed preview column with pinned sorting
CREATE INDEX IF NOT EXISTS idx_design_tasks_instagram_pinned 
ON design_tasks(status, pinned DESC, created_at DESC) 
WHERE status = 'instagram_feed_preview';

-- Update any existing test data (optional - can be removed if no test data)
-- UPDATE design_tasks SET pinned = FALSE WHERE pinned IS NULL;

-- Verify the column was added successfully
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'design_tasks' 
        AND column_name = 'pinned'
    ) THEN
        RAISE NOTICE '✅ Successfully added pinned column to design_tasks table';
    ELSE
        RAISE EXCEPTION '❌ Failed to add pinned column to design_tasks table';
    END IF;
END $$;

-- Show current table structure for verification
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'design_tasks' 
ORDER BY ordinal_position;

COMMIT;

-- Usage Examples:
-- Pin a task: UPDATE design_tasks SET pinned = TRUE WHERE id = 'task-id';
-- Unpin a task: UPDATE design_tasks SET pinned = FALSE WHERE id = 'task-id';
-- Get pinned tasks first: SELECT * FROM design_tasks ORDER BY pinned DESC, created_at DESC; 
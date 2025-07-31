-- =====================================================
-- ADD TASK TYPE FIELD TO DESIGN TASKS
-- =====================================================

-- Create task type enum
DO $$ BEGIN
    CREATE TYPE task_type AS ENUM (
        'design',
        'photo', 
        'video'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add task_type column to design_tasks table
ALTER TABLE design_tasks 
ADD COLUMN IF NOT EXISTS task_type task_type DEFAULT 'design';

-- Create index for better performance on task_type queries
CREATE INDEX IF NOT EXISTS idx_design_tasks_task_type 
ON design_tasks(task_type);

-- Create composite index for status + task_type (useful for filtering)
CREATE INDEX IF NOT EXISTS idx_design_tasks_status_task_type 
ON design_tasks(status, task_type);

-- Update existing records to have 'design' as default task_type
UPDATE design_tasks SET task_type = 'design' WHERE task_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN design_tasks.task_type IS 'Type of task: design, photo, or video';

-- Verification query (uncomment to run manually)
-- SELECT task_type, COUNT(*) FROM design_tasks GROUP BY task_type; 
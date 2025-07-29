-- Migration: Update Marketing Module to Dual-Column Structure
-- Changes 'to_do' status to 'graphic_design' and 'photography' columns
-- Date: 2025-01-26

-- Step 1: Update the constraint to allow new status values
ALTER TABLE social_media_tasks 
DROP CONSTRAINT IF EXISTS social_media_tasks_status_check;

ALTER TABLE social_media_tasks 
ADD CONSTRAINT social_media_tasks_status_check 
CHECK (status IN ('graphic_design', 'photography', 'in_progress', 'review', 'approved', 'posted'));

-- Step 2: Update existing 'to_do' tasks to 'graphic_design'
-- You can manually move some to 'photography' if needed
UPDATE social_media_tasks 
SET status = 'graphic_design' 
WHERE status = 'to_do';

-- Step 3: Update default value for new records
ALTER TABLE social_media_tasks 
ALTER COLUMN status SET DEFAULT 'graphic_design';

-- Note: Run this migration on your Supabase database to update the schema
-- After running this, existing tasks will be in the 'graphic_design' column
-- You can manually move photography-related tasks to the 'photography' column 
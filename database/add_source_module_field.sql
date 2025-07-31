-- Add created_by field to track who raised the marketing ticket
-- This helps identify external vs internal requests
-- The requested_by field already captures the name from AddTaskModal

ALTER TABLE design_tasks 
ADD COLUMN created_by TEXT;

-- Add comment for clarity
COMMENT ON COLUMN design_tasks.created_by IS 'User ID of the person who created this task - helps distinguish external ticket requests from internal marketing tasks';

-- Update existing tasks to be marked as created by system (internal marketing tasks)
UPDATE design_tasks 
SET created_by = 'system' 
WHERE created_by IS NULL; 
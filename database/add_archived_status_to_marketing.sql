-- Add missing statuses to marketing tasks
-- This migration adds 'planned' and 'archived' statuses to the task_status enum
-- Note: Run each ALTER TYPE statement separately if needed

-- Add 'planned' status if it doesn't exist (after 'intake')
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'planned' AFTER 'intake';

-- Add 'archived' status if it doesn't exist (at the end)
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'archived';

-- Verify the enum now contains both new statuses
SELECT unnest(enum_range(NULL::task_status)) AS available_statuses; 
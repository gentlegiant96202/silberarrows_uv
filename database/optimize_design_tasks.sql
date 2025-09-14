-- Optimize design_tasks table for faster queries
-- This adds indexes to improve query performance

-- Add index for created_at DESC (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_design_tasks_created_at_desc ON design_tasks (created_at DESC);

-- Add composite index for user_tickets queries (created_by + acknowledged_at + created_at)
CREATE INDEX IF NOT EXISTS idx_design_tasks_user_tickets ON design_tasks (created_by, acknowledged_at, created_at DESC);

-- Add index for status queries (common filter)
CREATE INDEX IF NOT EXISTS idx_design_tasks_status ON design_tasks (status);

-- Add composite index for status + created_at (kanban board queries)
CREATE INDEX IF NOT EXISTS idx_design_tasks_status_created_at ON design_tasks (status, created_at DESC);

-- Analyze table to update statistics
ANALYZE design_tasks;

-- Check existing indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'design_tasks'
ORDER BY indexname;

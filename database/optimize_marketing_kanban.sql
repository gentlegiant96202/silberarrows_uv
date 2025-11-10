-- =====================================================
-- MARKETING KANBAN PERFORMANCE OPTIMIZATION
-- =====================================================
-- This script creates optimized indexes specifically for the marketing kanban board
-- to significantly improve load times
-- Run this once to apply the optimizations

BEGIN;

-- 1. Composite index for the main kanban query (status filter + created_at sort)
-- This is THE most important index for marketing kanban performance
CREATE INDEX IF NOT EXISTS idx_design_tasks_status_created_at_desc 
ON design_tasks(status, created_at DESC);

-- 2. Partial index for non-archived tasks (the most common query)
-- This makes "exclude_archived=true" queries much faster
CREATE INDEX IF NOT EXISTS idx_design_tasks_not_archived_created_at 
ON design_tasks(created_at DESC) 
WHERE status != 'archived';

-- 3. Composite index for pinned sorting within status columns
-- Speeds up the frontend sorting logic for pinned tasks
CREATE INDEX IF NOT EXISTS idx_design_tasks_status_pinned_updated 
ON design_tasks(status, pinned DESC, updated_at DESC);

-- 4. Index for Instagram feed preview column specifically
-- Optimizes queries for the Instagram feed preview status
CREATE INDEX IF NOT EXISTS idx_design_tasks_instagram_feed 
ON design_tasks(pinned DESC, updated_at DESC) 
WHERE status = 'instagram_feed_preview';

-- 5. Index for real-time subscription queries
-- Helps with the real-time updates processing
CREATE INDEX IF NOT EXISTS idx_design_tasks_updated_at_desc 
ON design_tasks(updated_at DESC);

-- 6. Drop any redundant indexes to keep the index size manageable
DROP INDEX IF EXISTS idx_design_tasks_created_at; -- Replaced by composite indexes above

-- Analyze the table to update query planner statistics
ANALYZE design_tasks;

-- Show the current indexes for verification
SELECT 
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes 
WHERE tablename = 'design_tasks'
ORDER BY indexname;

COMMIT;

-- Expected Results:
-- ✅ Initial load time should drop from 2-5 seconds to under 500ms
-- ✅ Column-by-column loading should be much faster
-- ✅ Drag and drop updates should be instantaneous
-- ✅ Real-time updates should have minimal overhead


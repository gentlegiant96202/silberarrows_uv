-- Enable Realtime for Design Tasks Table
-- This fixes the marketing kanban realtime functionality
-- Date: 2025-01-11

BEGIN;

-- Enable replica identity for realtime subscriptions
-- This is required for Supabase realtime to capture all column changes
ALTER TABLE design_tasks REPLICA IDENTITY FULL;

-- Add the table to the realtime publication (if not already added)
-- This enables Supabase to stream changes to connected clients
DO $$
BEGIN
    -- Check if table is already in publication
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'design_tasks'
        AND schemaname = 'public'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE design_tasks;
        RAISE NOTICE '✅ design_tasks added to supabase_realtime publication';
    ELSE
        RAISE NOTICE '✅ design_tasks already in supabase_realtime publication';
    END IF;
END $$;

-- Verify replica identity is set correctly
DO $$
BEGIN
    -- Check if replica identity is set to FULL
    IF EXISTS (
        SELECT 1 
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'design_tasks' 
        AND n.nspname = 'public'
        AND c.relreplident = 'f'  -- 'f' means FULL
    ) THEN
        RAISE NOTICE '✅ REPLICA IDENTITY FULL enabled for design_tasks';
    ELSE
        RAISE EXCEPTION '❌ Failed to set REPLICA IDENTITY FULL for design_tasks';
    END IF;
END $$;

-- Verify the table is in the realtime publication
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'design_tasks'
        AND schemaname = 'public'
    ) THEN
        RAISE NOTICE '✅ design_tasks confirmed in supabase_realtime publication';
    ELSE
        RAISE EXCEPTION '❌ design_tasks not found in supabase_realtime publication';
    END IF;
END $$;

COMMIT;

-- Show current realtime configuration for verification
SELECT 
    schemaname,
    tablename,
    'Added to realtime publication' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('design_tasks', 'leads', 'cars')
ORDER BY tablename;

-- Show replica identity status
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    CASE c.relreplident
        WHEN 'd' THEN 'DEFAULT'
        WHEN 'n' THEN 'NOTHING'
        WHEN 'f' THEN 'FULL'
        WHEN 'i' THEN 'INDEX'
    END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('design_tasks', 'leads', 'cars')
AND n.nspname = 'public'
ORDER BY c.relname;

/*
USAGE INSTRUCTIONS:
===================

1. Run this script in Supabase SQL Editor
2. Verify both verification queries show success messages
3. Test the marketing kanban in the browser:
   - Open marketing dashboard
   - Create a new task
   - Move tasks between columns
   - Changes should now appear in realtime across browser tabs

WHAT THIS FIXES:
================

- Marketing kanban tasks will now update in realtime across all browser tabs
- Task status changes (drag & drop) will be immediately visible to all users
- New tasks will appear instantly without page refresh
- File uploads and task updates will sync in realtime

The issue was that design_tasks table was missing:
1. REPLICA IDENTITY FULL (required for Supabase realtime)
2. Addition to supabase_realtime publication (required for streaming)

This brings design_tasks table in line with leads and cars tables which already work.
*/

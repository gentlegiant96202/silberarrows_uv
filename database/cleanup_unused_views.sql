-- Cleanup unused database views and tables
-- Run this script to remove views that are no longer needed

-- Drop service contract views if they exist (they might not be used)
DROP VIEW IF EXISTS active_service_contracts CASCADE;
DROP VIEW IF EXISTS active_warranty_contracts CASCADE;

-- Drop kanban views if they exist and are unused
DROP VIEW IF EXISTS kanban_board_view CASCADE;
DROP VIEW IF EXISTS consignments_kanban_view CASCADE;

-- Check if any views remain
SELECT 'Remaining Views' as info, 
       schemaname, 
       viewname 
FROM pg_views 
WHERE schemaname = 'public';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database cleanup completed successfully!';
    RAISE NOTICE 'Unused views have been dropped';
    RAISE NOTICE 'Check the query result above to see remaining views';
END
$$; 